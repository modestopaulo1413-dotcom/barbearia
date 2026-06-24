import { Hono } from 'hono'
import type { HonoEnv } from './types'
import { validateEnv } from './config/env'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { corsMiddleware } from './middlewares/cors'
import { securityHeaders } from './middlewares/security'
import { errorHandler } from './middlewares/errorHandler'
import { registerRoutes } from './routes'

const app = new Hono<HonoEnv>()

app.use('*', async (c, next) => {
  // Garante que variáveis do process.env (Node.js) estejam disponíveis no c.env
  c.env = { ...process.env, ...c.env }
  await next()
})

// ─── Middlewares globais ─────────────────────────────────────────
app.use('*', async (c, next) => {
  const cors = corsMiddleware(c.env)
  return cors(c, next)
})

app.use('*', securityHeaders)

// ─── Conexão com o banco de dados ─────────────────────────────────
app.use('*', async (c, next) => {
  // Valida variáveis de ambiente no primeiro request
  validateEnv(c.env)
  
  // Usando driver 'postgres'
  // O Hyperdrive lida com o pool de conexões (Supabase) via proxy interno do Cloudflare!
  const connectionString = c.env.HYPERDRIVE?.connectionString || c.env.DATABASE_URL
  
  const client = postgres(connectionString, {
    max: 1, // Cloudflare Workers = 1 connection per isolate
  })

  try {
    const db = drizzle(client)
    c.set('db', db)
    await next()
  } finally {
    // É importante fechar as conexões TCP
    await client.end()
  }
})

// ─── Error handler ───────────────────────────────────────────────
app.onError(errorHandler)

// ─── Health check ────────────────────────────────────────────────
app.get('/health', (c) =>
  c.json({ status: 'ok', timestamp: new Date().toISOString() })
)

// ─── Rotas da API ────────────────────────────────────────────────
registerRoutes(app)

// ─── 404 handler ─────────────────────────────────────────────────
app.notFound((c) =>
  c.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Rota não encontrada',
      },
    },
    404
  )
)

export default app
