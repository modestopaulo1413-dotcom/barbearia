import { sign, verify, decode } from 'hono/jwt'
import type { JwtPayload, UserRole } from '../types'

const ACCESS_TOKEN_EXPIRY = 15 * 60 // 15 minutos em segundos
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 // 7 dias em segundos

/**
 * Gera um access token JWT com expiração curta (15min).
 */
export async function generateAccessToken(
  payload: { sub: string; email: string; role: UserRole },
  secret: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  return sign(
    {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      iat: now,
      exp: now + ACCESS_TOKEN_EXPIRY,
    },
    secret
  )
}

/**
 * Gera um refresh token JWT com expiração longa (7 dias).
 */
export async function generateRefreshToken(
  payload: { sub: string },
  secret: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  return sign(
    {
      sub: payload.sub,
      iat: now,
      exp: now + REFRESH_TOKEN_EXPIRY,
    },
    secret
  )
}

/**
 * Verifica e decodifica um token JWT.
 * Lança erro se o token for inválido ou expirado.
 */
export async function verifyToken(
  token: string,
  secret: string
): Promise<JwtPayload> {
  const payload = await verify(token, secret, 'HS256')
  return payload as unknown as JwtPayload
}

/**
 * Decodifica um token JWT sem verificar a assinatura.
 * Útil para extrair informações de tokens expirados.
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    const { payload } = decode(token)
    return payload as unknown as JwtPayload
  } catch {
    return null
  }
}

/**
 * Retorna a expiração do refresh token em timestamp ISO.
 */
export function getRefreshTokenExpiry(): string {
  const expiry = new Date(Date.now() + REFRESH_TOKEN_EXPIRY * 1000)
  return expiry.toISOString()
}
