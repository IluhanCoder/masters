import { Router } from 'express'

import { authenticate, authorizeRoles } from '../../middlewares/auth-middleware.js'
import * as bookingController from './booking-controller.js'

export const bookingRouter = Router()

bookingRouter.get('/', authenticate, authorizeRoles('manager'), bookingController.list)
bookingRouter.get('/mine', authenticate, authorizeRoles('client'), bookingController.listMine)
bookingRouter.get('/by-candidate/:candidateId', authenticate, authorizeRoles('manager', 'client'), bookingController.listByCandidate)
bookingRouter.get('/by-master/:candidateId', authenticate, authorizeRoles('manager', 'client'), bookingController.listByCandidate)
bookingRouter.post('/', authenticate, authorizeRoles('client'), bookingController.create)
bookingRouter.patch('/:bookingId', authenticate, authorizeRoles('manager'), bookingController.update)
bookingRouter.patch('/:bookingId/respond', authenticate, authorizeRoles('client'), bookingController.respond)
bookingRouter.patch('/:bookingId/rate', authenticate, authorizeRoles('client'), bookingController.rate)
