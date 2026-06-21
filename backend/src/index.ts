import { Hono } from 'hono'
import type { HonoEnv } from './types'
import { validateEnv } from './config/env'
import { Client } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
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
  
  const client = new Client({
    connectionString: c.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  try {
    // Conecta ao banco Postgres do Supabase
    await client.connect()
    const db = drizzle(client)
    c.set('db', db)
    await next()
  } finally {
    // Garante que a conexão TCP é fechada após a requisição para evitar travamentos
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
