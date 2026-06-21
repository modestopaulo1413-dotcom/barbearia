import type { Context } from 'hono'

/**
 * Resposta padronizada de sucesso.
 */
export function success<T>(c: Context, data: T, status: 200 | 201 = 200) {
  return c.json({ success: true as const, data }, status)
}

/**
 * Resposta padronizada de erro.
 * Nunca expõe stack trace ou detalhes internos ao cliente.
 */
export function error(
  c: Context,
  code: string,
  message: string,
  status: 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 = 400,
  details?: unknown
) {
  return c.json(
    {
      success: false as const,
      error: { code, message, ...(details !== undefined ? { details } : {}) },
    },
    status
  )
}

/**
 * Códigos de erro reutilizáveis.
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT: 'RATE_LIMIT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  SCHEDULE_CONFLICT: 'SCHEDULE_CONFLICT',
  INVALID_SCHEDULE: 'INVALID_SCHEDULE',
  OUTSIDE_BUSINESS_HOURS: 'OUTSIDE_BUSINESS_HOURS',
  PAST_DATE: 'PAST_DATE',
} as const
