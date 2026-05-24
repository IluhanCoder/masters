import type { NextFunction, Request, Response } from 'express'

import * as candidateService from './candidate-service.js'
import type {
  CreateCandidateRequestBody,
  UpdateCandidateRatingRequestBody,
  UpdateCandidateRequestBody,
} from './candidate-types.js'
import { HttpError } from '../../shared/http-error.js'

export const list = async (_request: Request, response: Response, next: NextFunction) => {
  try {
    const authUser = response.locals.authUser
    if (!authUser) {
      throw new HttpError(401, 'Unauthorized')
    }

    const candidates = await candidateService.listCandidates(authUser)
    response.status(200).json({ candidates })
  } catch (error) {
    next(error)
  }
}

export const getById = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const authUser = response.locals.authUser
    if (!authUser) {
      throw new HttpError(401, 'Unauthorized')
    }

    const candidate = await candidateService.getCandidateById(String(request.params.candidateId), authUser)
    response.status(200).json({ candidate })
  } catch (error) {
    next(error)
  }
}

export const create = async (
  request: Request<unknown, unknown, CreateCandidateRequestBody>,
  response: Response,
  next: NextFunction,
) => {
  try {
    const authUser = response.locals.authUser
    if (!authUser) {
      throw new HttpError(401, 'Unauthorized')
    }

    const candidate = await candidateService.createCandidate(request.body, authUser)
    response.status(201).json({ candidate })
  } catch (error) {
    next(error)
  }
}

export const update = async (
  request: Request<{ candidateId: string }, unknown, UpdateCandidateRequestBody>,
  response: Response,
  next: NextFunction,
) => {
  try {
    const authUser = response.locals.authUser
    if (!authUser) {
      throw new HttpError(401, 'Unauthorized')
    }

    const candidate = await candidateService.updateCandidate(String(request.params.candidateId), request.body)
    response.status(200).json({ candidate })
  } catch (error) {
    next(error)
  }
}

export const updateRating = async (
  request: Request<{ candidateId: string }, unknown, UpdateCandidateRatingRequestBody>,
  response: Response,
  next: NextFunction,
) => {
  try {
    const authUser = response.locals.authUser
    if (!authUser) {
      throw new HttpError(401, 'Unauthorized')
    }

    const candidate = await candidateService.updateCandidateRating(String(request.params.candidateId), request.body)
    response.status(200).json({ candidate })
  } catch (error) {
    next(error)
  }
}
