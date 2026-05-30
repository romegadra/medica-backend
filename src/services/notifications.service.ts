import { prisma } from '../prisma.js'
import { normalizePhone } from '../utils/phone.js'

type AppointmentEvent = 'created' | 'updated' | 'cancelled'
type AppointmentAudience = 'patient' | 'doctor'
type NotificationMessage = {
  audience: AppointmentAudience
  to: string
  body: string
  contentVariables: Record<string, string>
}

const notificationEnabled = process.env.NOTIFICATIONS_ENABLED === 'true'
const dryRun = process.env.NOTIFICATIONS_DRY_RUN !== 'false'
const provider = process.env.WHATSAPP_PROVIDER ?? 'twilio'
const timeZone = process.env.APP_TIME_ZONE || 'America/Monterrey'
let reminderJobRunning = false
const settingsId = 'default'

function formatAppointmentDate(date: Date) {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone,
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date)
}

function getDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = new Map(parts.map((part) => [part.type, part.value]))
  return `${values.get('year')}-${values.get('month')}-${values.get('day')}`
}

function getTemplateSid(event: AppointmentEvent, audience: AppointmentAudience) {
  const eventKey =
    event === 'created' ? 'CREATED' : event === 'updated' ? 'UPDATED' : 'CANCELLED'
  const audienceKey = audience === 'patient' ? 'PATIENT' : 'DOCTOR'
  const envKey = `TWILIO_TEMPLATE_APPOINTMENT_${eventKey}_${audienceKey}`
  return {
    envKey,
    contentSid: process.env[envKey],
  }
}

function getReminderTemplateSid() {
  const envKey = 'TWILIO_TEMPLATE_APPOINTMENT_REMINDER_PATIENT'
  return {
    envKey,
    contentSid: process.env[envKey],
  }
}

async function getAppSettings() {
  return prisma.appSettings.upsert({
    where: { id: settingsId },
    update: {},
    create: { id: settingsId },
  })
}

function normalizeWhatsAppPhone(phone?: string | null) {
  const normalized = normalizePhone(phone)
  return normalized ? `whatsapp:${normalized}` : null
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

async function sendTwilioWhatsApp(params: {
  to: string
  body: string
  contentSid?: string
  contentVariables?: Record<string, string>
}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM

  if (!accountSid || !authToken || !from) {
    throw new Error('Twilio WhatsApp env vars are incomplete')
  }

  const payload = new URLSearchParams({
    From: from,
    To: params.to,
  })

  if (params.contentSid) {
    payload.set('ContentSid', params.contentSid)
    payload.set('ContentVariables', JSON.stringify(params.contentVariables ?? {}))
  } else {
    throw new Error('Missing Twilio WhatsApp template ContentSid')
  }

  // eslint-disable-next-line no-console
  console.info('[notifications:twilio-template]', {
    to: params.to,
    from,
    contentSid: params.contentSid,
    contentVariables: params.contentVariables,
  })

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload,
    },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Twilio WhatsApp failed: ${error}`)
  }
}

async function sendWhatsApp(params: {
  to: string
  body: string
  contentSid?: string
  contentVariables?: Record<string, string>
}) {
  if (!notificationEnabled || dryRun) {
    // eslint-disable-next-line no-console
    console.info('[notifications:dry-run]', {
      provider,
      to: params.to,
      body: params.body,
      contentSid: params.contentSid,
      contentVariables: params.contentVariables,
    })
    return
  }

  if (provider !== 'twilio') {
    throw new Error(`Unsupported WhatsApp provider: ${provider}`)
  }

  await sendTwilioWhatsApp(params)
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
    const doctorTo = appointment.doctor.notificationsEnabled
      ? normalizeWhatsAppPhone(appointment.doctor.phone)
      : null
    const formattedDate = formatAppointmentDate(appointment.start)
    const cancellationReason = appointment.cancellationReason ?? ''
    const rawMessages: Array<NotificationMessage | null> = [
      patientTo
        ? {
            audience: 'patient' as const,
            to: patientTo,
            body: buildPatientMessage({
              event,
              patientName: appointment.patient.name,
              doctorName: appointment.doctor.name,
              start: appointment.start,
              cancellationReason: appointment.cancellationReason,
            }),
            contentVariables: {
              '1': appointment.patient.name,
              '2': appointment.doctor.name,
              '3': formattedDate,
              '4': cancellationReason,
            },
          }
        : null,
      doctorTo
        ? {
            audience: 'doctor' as const,
            to: doctorTo,
            body: buildDoctorMessage({
              event,
              patientName: appointment.patient.name,
              doctorName: appointment.doctor.name,
              start: appointment.start,
              cancellationReason: appointment.cancellationReason,
            }),
            contentVariables: {
              '1': appointment.doctor.name,
              '2': appointment.patient.name,
              '3': formattedDate,
              '4': cancellationReason,
            },
          }
        : null,
    ]
    const messages = rawMessages.filter((message): message is NotificationMessage => Boolean(message))

    await Promise.all(
      messages.map((message) => {
        const template = getTemplateSid(event, message.audience)
        if (!template.contentSid) {
          throw new Error(`Missing required Railway variable: ${template.envKey}`)
        }
        // eslint-disable-next-line no-console
        console.info('[notifications:template-selected]', {
          event,
          audience: message.audience,
          envKey: template.envKey,
          contentSid: template.contentSid,
        })
        return (
        sendWhatsApp({
          to: message.to,
          body: message.body,
          contentSid: template.contentSid,
          contentVariables: message.contentVariables,
        })
        )
      }),
    )
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[notifications:error]', error)
  }
}

export async function sendAppointmentReminders(options: { force?: boolean } = {}) {
  const settings = await getAppSettings()
  if (!options.force && !settings.appointmentRemindersEnabled) {
    return 0
  }

  const now = new Date()
  const tomorrowKey = getDateKey(new Date(now.getTime() + 24 * 60 * 60 * 1000))
  const searchUntil = new Date(now.getTime() + 48 * 60 * 60 * 1000)
  const template = getReminderTemplateSid()

  if (!template.contentSid) {
    throw new Error(`Missing required Railway variable: ${template.envKey}`)
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      reminderSentAt: null,
      attended: false,
      status: { notIn: ['cancelled', 'no_show'] },
      start: {
        gte: now,
        lte: searchUntil,
      },
    },
    include: {
      doctor: true,
      patient: true,
    },
    orderBy: { start: 'asc' },
  })

  const appointmentsForTomorrow = appointments.filter(
    (appointment) => getDateKey(appointment.start) === tomorrowKey,
  )

  for (const appointment of appointmentsForTomorrow) {
    const patientTo = normalizeWhatsAppPhone(appointment.patient.phone)
    if (!patientTo) continue

    const formattedDate = formatAppointmentDate(appointment.start)
    const body = `Hola ${appointment.patient.name}. MedFlow te recuerda que tienes una cita médica con Dr(a). ${appointment.doctor.name} mañana ${formattedDate}. Si necesitas hacer cambios, comunícate directamente con la clínica.`

    try {
      // eslint-disable-next-line no-console
      console.info('[notifications:reminder-template-selected]', {
        appointmentId: appointment.id,
        envKey: template.envKey,
        contentSid: template.contentSid,
      })
      await sendWhatsApp({
        to: patientTo,
        body,
        contentSid: template.contentSid,
        contentVariables: {
          '1': appointment.patient.name,
          '2': appointment.doctor.name,
          '3': formattedDate,
        },
      })
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { reminderSentAt: new Date() },
      })
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[notifications:reminder-error]', {
        appointmentId: appointment.id,
        error,
      })
    }
  }

  return appointmentsForTomorrow.length
}

export function startAppointmentReminderJob() {
  const run = async () => {
    if (reminderJobRunning) return
    reminderJobRunning = true
    try {
      const count = await sendAppointmentReminders()
      // eslint-disable-next-line no-console
      console.info('[notifications:reminders] completed', { count })
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[notifications:reminders] failed', error)
    } finally {
      reminderJobRunning = false
    }
  }

  const scheduleNext = async (delayMs: number) => {
    setTimeout(() => {
      void (async () => {
        await run()
        const settings = await getAppSettings()
        const intervalMinutes = Math.max(5, settings.appointmentReminderIntervalMinutes)
        void scheduleNext(intervalMinutes * 60 * 1000)
      })()
    }, delayMs)
  }

  // eslint-disable-next-line no-console
  console.info('[notifications:reminders] scheduler started')
  void scheduleNext(30 * 1000)
}
