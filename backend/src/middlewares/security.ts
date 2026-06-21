import type { MiddlewareHandler } from 'hono'
import type { HonoEnv } from '../types'

/**
 * Middleware de headers de segurança (equivalente ao Helmet.js).
 * Adiciona proteções básicas em todas as respostas.
 */
export const securityHeaders: MiddlewareHandler<HonoEnv> = async (c, next) => {
  await next()

  // Previne MIME type sniffing
  c.header('X-Content-Type-Options', 'nosniff')

  // Previne clickjacking — API não deve ser embutida em iframes
  c.header('X-Frame-Options', 'DENY')

  // XSS protection (navegadores legados)
  c.header('X-XSS-Protection', '1; mode=block')

  // Referrer policy restritiva
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')

  // CSP básico para API (sem conteúdo HTML)
  c.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")

  // Força HTTPS
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

  // Remove header que expõe informações do servidor
  c.header('X-Powered-By', '')
}
