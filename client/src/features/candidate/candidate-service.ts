import type {
  CandidateSummary,
  CreateCandidatePayload,
  UpdateCandidatePayload,
  UpdateCandidateRatingPayload,
} from './candidate-types'
import { API_BASE } from '../../shared/api-base'

const API_BASE_PATH = `${API_BASE}/api/masters`

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

export const candidateService = {
  list(accessToken: string) {
    return request<{ candidates: CandidateSummary[] }>('/', accessToken, {
      method: 'GET',
    })
  },

  getById(candidateId: string, accessToken: string) {
    return request<{ candidate: CandidateSummary }>(`/${candidateId}`, accessToken, {
      method: 'GET',
    })
  },

  create(payload: CreateCandidatePayload, accessToken: string) {
    return request<{ candidate: CandidateSummary }>('/', accessToken, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  update(candidateId: string, payload: UpdateCandidatePayload, accessToken: string) {
    return request<{ candidate: CandidateSummary }>(`/${candidateId}`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  rate(candidateId: string, payload: UpdateCandidateRatingPayload, accessToken: string) {
    return request<{ candidate: CandidateSummary }>(`/${candidateId}/rating`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
}
