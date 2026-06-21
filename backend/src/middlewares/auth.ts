import type { MiddlewareHandler } from 'hono'
import type { HonoEnv } from '../types'
import type { UserRole } from '../types'
import { verifyToken } from '../utils/jwt'
import { error, ErrorCodes } from '../utils/response'

/**
 * Middleware de autenticação JWT.
 * Verifica o token no header Authorization (Bearer) e popula c.set('user', payload).
 */
export const authMiddleware: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(c, ErrorCodes.UNAUTHORIZED, 'Token de autenticação não fornecido', 401)
  }

  const token = authHeader.substring(7) // Remove "Bearer "

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET)
    c.set('user', payload)
    await next()
  } catch {
    return error(c, ErrorCodes.TOKEN_EXPIRED, 'Token inválido ou expirado', 401)
  }
}

/**
 * Middleware de autorização por role.
 * Verifica se o usuário autenticado possui um dos roles permitidos.
 */
export function requireRole(...roles: UserRole[]): MiddlewareHandler<HonoEnv> {
  return async (c, next) => {
    const user = c.get('user')

    if (!user) {
      return error(c, ErrorCodes.UNAUTHORIZED, 'Não autenticado', 401)
    }

    if (!roles.includes(user.role)) {
      return error(
        c,
        ErrorCodes.FORBIDDEN,
        'Você não tem permissão para acessar este recurso',
        403
      )
    }

    await next()
  }
}
