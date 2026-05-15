import { Router } from 'express'
import {
  createUnit,
  deleteUnit,
  getUnit,
  listUnits,
  updateUnit,
} from '../controllers/units.controller.js'
import {
  createDoctor,
  deleteDoctor,
  getDoctor,
  listDoctors,
  resetDoctorPassword,
  updateDoctor,
} from '../controllers/doctors.controller.js'
import {
  createReceptionist,
  deleteReceptionist,
  getReceptionist,
  listReceptionists,
  resetReceptionistPassword,
  updateReceptionist,
} from '../controllers/receptionists.controller.js'
import {
  createPatient,
  deletePatient,
  getPatient,
  listPatients,
  updatePatient,
} from '../controllers/patients.controller.js'
import {
  cancelAppointment,
  createAppointment,
  deleteAppointment,
  getAppointment,
  listAppointments,
  updateAppointment,
} from '../controllers/appointments.controller.js'
import {
  createDoctorSchedule,
  deleteDoctorSchedule,
  listDoctorSchedules,
  updateDoctorSchedule,
} from '../controllers/doctorSchedules.controller.js'
import {
  createDoctorBlockedTime,
  deleteDoctorBlockedTime,
  listDoctorBlockedTimes,
} from '../controllers/doctorBlockedTimes.controller.js'
import {
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
} from '../controllers/users.controller.js'
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  updateTemplate,
} from '../controllers/templates.controller.js'
import {
  createVisit,
  deleteVisit,
  getVisit,
  listVisits,
  updateVisit,
} from '../controllers/visits.controller.js'
import { changePassword, login } from '../controllers/auth.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import {
  createSpecialty,
  deleteSpecialty,
  getSpecialty,
  listSpecialties,
  updateSpecialty,
} from '../controllers/specialties.controller.js'
import { getSettings, updateSettings } from '../controllers/settings.controller.js'

export const router = Router()

router.post('/auth/login', login)
router.use(requireAuth)
router.post('/auth/change-password', changePassword)

router.get('/users/admins', requireRole(['admin', 'superadmin']), listAdminUsers)
router.post('/users/admins', requireRole(['admin', 'superadmin']), createAdminUser)
router.put('/users/admins/:id', requireRole(['admin', 'superadmin']), updateAdminUser)
router.post(
  '/users/admins/:id/reset-password',
  requireRole(['admin', 'superadmin']),
  resetAdminUserPassword,
)
router.delete('/users/admins/:id', requireRole(['admin', 'superadmin']), deleteAdminUser)

router.get('/settings', getSettings)
router.put('/settings', requireRole(['admin', 'superadmin']), updateSettings)

router.get('/specialties', listSpecialties)
router.get('/specialties/:id', getSpecialty)
router.post('/specialties', createSpecialty)
router.put('/specialties/:id', updateSpecialty)
router.delete('/specialties/:id', deleteSpecialty)

router.get('/units', listUnits)
router.get('/units/:id', getUnit)
router.post('/units', createUnit)
router.put('/units/:id', updateUnit)
router.delete('/units/:id', deleteUnit)

router.get('/doctors', listDoctors)
router.get('/doctors/:id', getDoctor)
router.post('/doctors', createDoctor)
router.post('/doctors/:id/reset-password', requireRole(['admin', 'superadmin']), resetDoctorPassword)
router.put('/doctors/:id', updateDoctor)
router.delete('/doctors/:id', deleteDoctor)

router.get('/receptionists', listReceptionists)
router.get('/receptionists/:id', getReceptionist)
router.post('/receptionists', createReceptionist)
router.post(
  '/receptionists/:id/reset-password',
  requireRole(['admin', 'superadmin']),
  resetReceptionistPassword,
)
router.put('/receptionists/:id', updateReceptionist)
router.delete('/receptionists/:id', deleteReceptionist)

router.get('/patients', listPatients)
router.get('/patients/:id', getPatient)
router.post('/patients', createPatient)
router.put('/patients/:id', updatePatient)
router.delete('/patients/:id', deletePatient)

router.get('/appointments', listAppointments)
router.get('/appointments/:id', getAppointment)
router.post('/appointments', createAppointment)
router.put('/appointments/:id', updateAppointment)
router.post('/appointments/:id/cancel', cancelAppointment)
router.delete('/appointments/:id', deleteAppointment)

router.get('/doctor-schedules', listDoctorSchedules)
router.post('/doctor-schedules', createDoctorSchedule)
router.put('/doctor-schedules/:id', updateDoctorSchedule)
router.delete('/doctor-schedules/:id', deleteDoctorSchedule)

router.get('/doctor-blocks', listDoctorBlockedTimes)
router.post('/doctor-blocks', createDoctorBlockedTime)
router.delete('/doctor-blocks/:id', deleteDoctorBlockedTime)

router.get('/templates', listTemplates)
router.get('/templates/:id', getTemplate)
router.post('/templates', createTemplate)
router.put('/templates/:id', updateTemplate)
router.delete('/templates/:id', deleteTemplate)

router.get('/visits', listVisits)
router.get('/visits/:id', getVisit)
router.post('/visits', createVisit)
router.put('/visits/:id', updateVisit)
router.delete('/visits/:id', deleteVisit)
