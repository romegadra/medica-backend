import { prisma } from '../prisma.js'

const timeZone = process.env.APP_TIME_ZONE || 'America/Monterrey'

function localParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const year = Number(values.year)
  const month = Number(values.month)
  const day = Number(values.day)
  const hour = Number(values.hour)
  const minute = Number(values.minute)
  return {
    dayOfWeek: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
    minuteOfDay: hour * 60 + minute,
  }
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

export async function getScheduleViolation(doctorId: string, start: Date, end: Date) {
  const blocked = await prisma.doctorBlockedTime.findFirst({
    where: {
      doctorId,
      start: { lt: end },
      end: { gt: start },
    },
  })
  if (blocked) {
    return 'La cita se cruza con un bloqueo del doctor.'
  }

  const schedules = await prisma.doctorSchedule.findMany({
    where: { doctorId },
  })
  if (schedules.length === 0) {
    return null
  }

  const localStart = localParts(start)
  const localEnd = localParts(end)
  if (localStart.dayOfWeek !== localEnd.dayOfWeek) {
    return 'La cita debe terminar el mismo dia.'
  }

  const matching = schedules.some((schedule) => {
    if (schedule.dayOfWeek !== localStart.dayOfWeek) return false
    return (
      localStart.minuteOfDay >= timeToMinutes(schedule.startTime) &&
      localEnd.minuteOfDay <= timeToMinutes(schedule.endTime)
    )
  })

  return matching ? null : 'La cita esta fuera del horario disponible del doctor.'
}
