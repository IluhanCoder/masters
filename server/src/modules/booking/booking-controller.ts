import type { NextFunction, Request, Response } from 'express'

import { HttpError } from '../../shared/http-error.js'
import * as bookingService from './booking-service.js'
import type {
  CreateCandidateBookingRequestBody,
  RateBookingRequestBody,
  RespondToBookingRequestBody,
  UpdateCandidateBookingRequestBody,
} from './booking-types.js'

export const list = async (_request: Request, response: Response, next: NextFunction) => {
  try {
    const bookings = await bookingService.listBookings()
    response.json({ bookings })
  } catch (error) {
    next(error)
  }
}

export const listMine = async (_request: Request, response: Response, next: NextFunction) => {
  try {
    const authUser = response.locals.authUser
    if (!authUser) {
      throw new HttpError(401, 'Unauthorized')
    }

    const bookings = await bookingService.listMyBookings(authUser)
    response.json({ bookings })
  } catch (error) {
    next(error)
  }
}

export const listByCandidate = async (
  request: Request<{ candidateId: string }>,
  response: Response,
  next: NextFunction,
) => {
  try {
    const authUser = response.locals.authUser
    if (!authUser) {
      throw new HttpError(401, 'Unauthorized')
    }

    const bookings = await bookingService.listByCandidateId(request.params.candidateId)
    response.json({ bookings })
  } catch (error) {
    next(error)
  }
}

export const create = async (
  request: Request<unknown, unknown, CreateCandidateBookingRequestBody>,
  response: Response,
  next: NextFunction,
) => {
  try {
    const authUser = response.locals.authUser
    if (!authUser) {
      throw new HttpError(401, 'Unauthorized')
    }

    const booking = await bookingService.createBooking(request.body, authUser)
    response.status(201).json({ booking })
  } catch (error) {
    next(error)
  }
}

export const update = async (
  request: Request<{ bookingId: string }, unknown, UpdateCandidateBookingRequestBody>,
  response: Response,
  next: NextFunction,
) => {
  try {
    const authUser = response.locals.authUser
    if (!authUser) {
      throw new HttpError(401, 'Unauthorized')
    }

    const booking = await bookingService.updateBooking(
      request.params.bookingId,
      request.body,
      authUser,
    )
    response.json({ booking })
  } catch (error) {
    next(error)
  }
}

export const respond = async (
  request: Request<{ bookingId: string }, unknown, RespondToBookingRequestBody>,
  response: Response,
  next: NextFunction,
) => {
  try {
    const authUser = response.locals.authUser
    if (!authUser) {
      throw new HttpError(401, 'Unauthorized')
    }

    const booking = await bookingService.respondToBooking(
      request.params.bookingId,
      request.body,
      authUser,
    )
    response.json({ booking })
  } catch (error) {
    next(error)
  }
}

export const rate = async (
  request: Request<{ bookingId: string }, unknown, RateBookingRequestBody>,
  response: Response,
  next: NextFunction,
) => {
  try {
    const authUser = response.locals.authUser
    if (!authUser) {
      throw new HttpError(401, 'Unauthorized')
    }

    const booking = await bookingService.rateBooking(request.params.bookingId, request.body, authUser)
    response.json({ booking })
  } catch (error) {
    next(error)
  }
}
