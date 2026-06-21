import { cors } from 'hono/cors'
import type { Env } from '../config/env'

/**
 * Middleware CORS configurado com whitelist explícita de origens.
 * NUNCA usa origin: '*' — a lista vem da variável ALLOWED_ORIGINS.
 */
export const corsMiddleware = (env: Env) =>
  cors({
    origin: (origin: string) => {
      const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
      return allowed.includes(origin) ? origin : ''
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // 24h de cache para preflight
  })
