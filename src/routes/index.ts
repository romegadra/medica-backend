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
  updateDoctor,
} from '../controllers/doctors.controller.js'
import {
  createReceptionist,
  deleteReceptionist,
  getReceptionist,
  listReceptionists,
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
  createAppointment,
  deleteAppointment,
  getAppointment,
  listAppointments,
  updateAppointment,
} from '../controllers/appointments.controller.js'
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
import { login } from '../controllers/auth.controller.js'
import {
  createSpecialty,
  deleteSpecialty,
  getSpecialty,
  listSpecialties,
  updateSpecialty,
} from '../controllers/specialties.controller.js'

export const router = Router()

router.post('/auth/login', login)

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
router.put('/doctors/:id', updateDoctor)
router.delete('/doctors/:id', deleteDoctor)

router.get('/receptionists', listReceptionists)
router.get('/receptionists/:id', getReceptionist)
router.post('/receptionists', createReceptionist)
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
router.delete('/appointments/:id', deleteAppointment)

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
