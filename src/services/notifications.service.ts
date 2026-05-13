import { prisma } from '../prisma.js'

type AppointmentEvent = 'created' | 'updated' | 'cancelled'

const notificationEnabled = process.env.NOTIFICATIONS_ENABLED === 'true'
const dryRun = process.env.NOTIFICATIONS_DRY_RUN !== 'false'
const provider = process.env.WHATSAPP_PROVIDER ?? 'twilio'
const timeZone = process.env.APP_TIME_ZONE || 'America/Monterrey'

function formatAppointmentDate(date: Date) {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone,
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date)
}

function normalizeWhatsAppPhone(phone?: string | null) {
  if (!phone) return null
  const trimmed = phone.trim()
  if (!trimmed) return null
  const withCountry = trimmed.startsWith('+') ? trimmed : `+${trimmed.replace(/\D/g, '')}`
  return `whatsapp:${withCountry}`
}

function getEventLabel(event: AppointmentEvent) {
  if (event === 'created') return 'agendada'
  if (event === 'updated') return 'actualizada'
  return 'cancelada'
}

function buildPatientMessage(params: {
  event: AppointmentEvent
  patientName: string
  doctorName: string
  start: Date
  cancellationReason?: string | null
}) {
  const base = `Hola ${params.patientName}, tu cita con ${params.doctorName} fue ${getEventLabel(
    params.event,
  )} para ${formatAppointmentDate(params.start)}.`
  if (params.event === 'cancelled' && params.cancellationReason) {
    return `${base} Motivo: ${params.cancellationReason}.`
  }
  return base
}

function buildDoctorMessage(params: {
  event: AppointmentEvent
  patientName: string
  doctorName: string
  start: Date
  cancellationReason?: string | null
}) {
  const base = `Dr(a). ${params.doctorName}, la cita de ${params.patientName} fue ${getEventLabel(
    params.event,
  )} para ${formatAppointmentDate(params.start)}.`
  if (params.event === 'cancelled' && params.cancellationReason) {
    return `${base} Motivo: ${params.cancellationReason}.`
  }
  return base
}

async function sendTwilioWhatsApp(to: string, body: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM

  if (!accountSid || !authToken || !from) {
    throw new Error('Twilio WhatsApp env vars are incomplete')
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: from,
        To: to,
        Body: body,
      }),
    },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Twilio WhatsApp failed: ${error}`)
  }
}

async function sendWhatsApp(to: string, body: string) {
  if (!notificationEnabled || dryRun) {
    // eslint-disable-next-line no-console
    console.info('[notifications:dry-run]', { provider, to, body })
    return
  }

  if (provider !== 'twilio') {
    throw new Error(`Unsupported WhatsApp provider: ${provider}`)
  }

  await sendTwilioWhatsApp(to, body)
}

export async function notifyAppointment(event: AppointmentEvent, appointmentId: string) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: true,
        patient: true,
      },
    })
    if (!appointment) return

    const patientTo = normalizeWhatsAppPhone(appointment.patient.phone)
    const doctorTo = normalizeWhatsAppPhone(appointment.doctor.phone)
    const messages = [
      patientTo
        ? {
            to: patientTo,
            body: buildPatientMessage({
              event,
              patientName: appointment.patient.name,
              doctorName: appointment.doctor.name,
              start: appointment.start,
              cancellationReason: appointment.cancellationReason,
            }),
          }
        : null,
      doctorTo
        ? {
            to: doctorTo,
            body: buildDoctorMessage({
              event,
              patientName: appointment.patient.name,
              doctorName: appointment.doctor.name,
              start: appointment.start,
              cancellationReason: appointment.cancellationReason,
            }),
          }
        : null,
    ].filter((message): message is { to: string; body: string } => Boolean(message))

    await Promise.all(messages.map((message) => sendWhatsApp(message.to, message.body)))
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[notifications:error]', error)
  }
}
