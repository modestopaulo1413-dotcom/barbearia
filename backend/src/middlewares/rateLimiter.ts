import type { MiddlewareHandler } from 'hono'
import type { HonoEnv } from '../types'
import { error, ErrorCodes } from '../utils/response'

/**
 * Rate limiter simples baseado em Map (in-memory).
 * Em Workers, cada isolate tem sua própria memória, então o rate limit
 * é por instância do Worker. Para produção com alta escala, considere
 * usar Cloudflare Rate Limiting ou Durable Objects.
 *
 * @param maxRequests Número máximo de requisições no intervalo
 * @param windowMs Janela de tempo em milissegundos
 */
export function rateLimiter(
  maxRequests: number,
  windowMs: number
): MiddlewareHandler<HonoEnv> {
  const requests = new Map<string, { count: number; resetAt: number }>()

  return async (c, next) => {
    // Ignora o rate limit em ambiente de desenvolvimento local
    if (process.env.NODE_ENV === 'development') {
      await next()
      return
    }

    // Usa o IP do cliente como chave (CF-Connecting-IP ou fallback)
    const clientIp =
      c.req.header('CF-Connecting-IP') ??
      c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ??
      'unknown'

    const now = Date.now()
    const record = requests.get(clientIp)

    if (!record || now > record.resetAt) {
      // Nova janela
      requests.set(clientIp, { count: 1, resetAt: now + windowMs })
      await next()
      return
    }

    if (record.count >= maxRequests) {
      const retryAfterSecs = Math.ceil((record.resetAt - now) / 1000)
      c.header('Retry-After', retryAfterSecs.toString())
      return error(
        c,
        ErrorCodes.RATE_LIMIT,
        `Muitas requisições. Tente novamente em ${retryAfterSecs} segundos.`,
        429
      )
    }

    record.count++
    await next()
  }
}

/**
 * Rate limiter para rotas de login (mais restritivo).
 * 5 tentativas por minuto por IP.
 */
export const loginRateLimiter = rateLimiter(5, 60 * 1000)

/**
 * Rate limiter para criação de agendamentos.
 * 10 agendamentos por minuto por IP.
 */
export const agendamentoRateLimiter = rateLimiter(10, 60 * 1000)
