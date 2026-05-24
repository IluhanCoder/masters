import type {
  CandidateBookingDetails,
  CandidateBookingSummary,
  CreateCandidateBookingPayload,
  RateBookingPayload,
  RespondToBookingPayload,
  UpdateBookingPayload,
} from './booking-types'
import { API_BASE } from '../../shared/api-base'

const API_BASE_PATH = `${API_BASE}/api/orders`

const parseError = async (response: Response): Promise<string> => {
  try {
    const data = (await response.json()) as { message?: string }
    return data.message ?? 'Unexpected server response'
  } catch {
    return 'Unexpected server response'
  }
}

const request = async <T>(
  path: string,
  accessToken: string,
  init: Omit<RequestInit, 'headers'>,
): Promise<T> => {
  const response = await fetch(`${API_BASE_PATH}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const message = await parseError(response)
    throw new Error(message)
  }

  return (await response.json()) as T
}

export const bookingService = {
  list(accessToken: string) {
    return request<{ bookings: CandidateBookingDetails[] }>('/', accessToken, {
      method: 'GET',
    })
  },

  listMine(accessToken: string) {
    return request<{ bookings: CandidateBookingDetails[] }>('/mine', accessToken, {
      method: 'GET',
    })
  },

  listByCandidate(candidateId: string, accessToken: string) {
    return request<{ bookings: CandidateBookingDetails[] }>(`/by-master/${candidateId}`, accessToken, {
      method: 'GET',
    })
  },

  create(payload: CreateCandidateBookingPayload, accessToken: string) {
    return request<{ booking: CandidateBookingSummary }>('/', accessToken, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  update(bookingId: string, payload: UpdateBookingPayload, accessToken: string) {
    return request<{ booking: CandidateBookingSummary }>(`/${bookingId}`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  respond(bookingId: string, payload: RespondToBookingPayload, accessToken: string) {
    return request<{ booking: CandidateBookingSummary }>(`/${bookingId}/respond`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  rate(bookingId: string, payload: RateBookingPayload, accessToken: string) {
    return request<{ booking: CandidateBookingSummary }>(`/${bookingId}/rate`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
}
