import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import type { HonoEnv } from '../types'
import { authMiddleware, requireRole } from '../middlewares/auth'
import { agendamentoRateLimiter } from '../middlewares/rateLimiter'
import {
  createAgendamentoSchema,
  updateAgendamentoSchema,
  updateStatusSchema,
} from '../validators/agendamento.validator'
import * as agendamentoController from '../controllers/agendamento.controller'

const agendamento = new Hono<HonoEnv>()

// GET /meus — agendamentos do cliente autenticado
// IMPORTANTE: deve vir antes de /:id para não ser capturada por ele
agendamento.get(
  '/meus',
  authMiddleware,
  requireRole('cliente'),
  (c) => agendamentoController.meusAgendamentos(c)
)

// GET /barbeiro/:id — agendamentos de um barbeiro (admin ou próprio barbeiro)
agendamento.get(
  '/barbeiro/:id',
  authMiddleware,
  requireRole('admin', 'barbeiro'),
  (c) => agendamentoController.agendamentosDoBarbeiro(c)
)

// GET / — listar agendamentos (admin ou barbeiro)
agendamento.get(
  '/',
  authMiddleware,
  requireRole('admin', 'barbeiro'),
  (c) => agendamentoController.listar(c)
)

// GET /:id — detalhes de um agendamento (envolvidos)
agendamento.get(
  '/:id',
  authMiddleware,
  (c) => agendamentoController.buscarPorId(c)
)

// POST / — criar agendamento (cliente, rate limited)
agendamento.post(
  '/',
  authMiddleware,
  requireRole('cliente'),
  agendamentoRateLimiter,
  zValidator('json', createAgendamentoSchema),
  (c) => agendamentoController.criar(c)
)

// PUT /:id/status — alterar status (admin ou barbeiro)
agendamento.put(
  '/:id/status',
  authMiddleware,
  requireRole('admin', 'barbeiro'),
  zValidator('json', updateStatusSchema),
  (c) => agendamentoController.atualizarStatus(c)
)

// PUT /:id — reagendar (cliente ou admin)
agendamento.put(
  '/:id',
  authMiddleware,
  requireRole('admin', 'cliente'),
  zValidator('json', updateAgendamentoSchema),
  (c) => agendamentoController.reagendar(c)
)

export { agendamento as agendamentoRoutes }
