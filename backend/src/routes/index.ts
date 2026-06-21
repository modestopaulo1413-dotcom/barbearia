import { Hono } from 'hono'
import type { HonoEnv } from '../types'
import { authRoutes } from './auth.routes'
import { barbeiroRoutes } from './barbeiro.routes'
import { clienteRoutes } from './cliente.routes'
import { servicoRoutes } from './servico.routes'
import { agendamentoRoutes } from './agendamento.routes'

/**
 * Agrega todas as rotas sob o prefixo /api/v1.
 */
export function registerRoutes(app: Hono<HonoEnv>) {
  const api = new Hono<HonoEnv>()

  api.route('/auth', authRoutes)
  api.route('/barbeiros', barbeiroRoutes)
  api.route('/clientes', clienteRoutes)
  api.route('/servicos', servicoRoutes)
  api.route('/agendamentos', agendamentoRoutes)

  app.route('/api/v1', api)
}
