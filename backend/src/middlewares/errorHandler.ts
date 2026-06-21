import type { ErrorHandler } from 'hono'
import type { HonoEnv } from '../types'

/**
 * Tratamento centralizado de erros.
 * Nunca expõe stack trace ou detalhes internos ao cliente.
 * Detalhes completos só aparecem nos logs do Worker (Cloudflare Tail).
 */
export const errorHandler: ErrorHandler<HonoEnv> = (err, c) => {
  // Log completo interno (visível via wrangler tail / Cloudflare dashboard)
  console.error('[ERRO INTERNO]', {
    message: err.message,
    stack: err.stack,
    url: c.req.url,
    method: c.req.method,
  })

  // Resposta genérica ao cliente — sem stack trace
  return c.json(
    {
      success: false as const,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ocorreu um erro interno. Tente novamente mais tarde.',
      },
    },
    500
  )
}
