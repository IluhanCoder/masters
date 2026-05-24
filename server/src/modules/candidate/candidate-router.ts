import { Router } from 'express'

import { authenticate, authorizeRoles } from '../../middlewares/auth-middleware.js'
import * as candidateController from './candidate-controller.js'

export const candidateRouter = Router()

candidateRouter.get('/', authenticate, authorizeRoles('manager', 'client'), candidateController.list)
candidateRouter.get('/:candidateId', authenticate, authorizeRoles('manager', 'client'), candidateController.getById)
candidateRouter.post('/', authenticate, authorizeRoles('manager'), candidateController.create)
candidateRouter.patch('/:candidateId', authenticate, authorizeRoles('manager'), candidateController.update)
candidateRouter.patch('/:candidateId/rating', authenticate, authorizeRoles('manager'), candidateController.updateRating)
