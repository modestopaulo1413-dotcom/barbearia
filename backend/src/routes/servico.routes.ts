import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import type { HonoEnv } from '../types'
import { authMiddleware, requireRole } from '../middlewares/auth'
import { createServicoSchema, updateServicoSchema } from '../validators/servico.validator'
import * as servicoController from '../controllers/servico.controller'

const servico = new Hono<HonoEnv>()

// GET / — listar serviços (público)
servico.get('/', (c) => servicoController.listar(c))

// GET /:id — detalhes de um serviço (público)
servico.get('/:id', (c) => servicoController.buscarPorId(c))

// POST / — criar serviço (admin ou barbeiro)
servico.post(
  '/',
  authMiddleware,
  requireRole('admin', 'barbeiro'),
  zValidator('json', createServicoSchema),
  (c) => servicoController.criar(c)
)

// PUT /:id — atualizar serviço (admin ou barbeiro dono)
servico.put(
  '/:id',
  authMiddleware,
  requireRole('admin', 'barbeiro'),
  zValidator('json', updateServicoSchema),
  (c) => servicoController.atualizar(c)
)

// DELETE /:id — desativar serviço (admin ou barbeiro dono)
servico.delete(
  '/:id',
  authMiddleware,
  requireRole('admin', 'barbeiro'),
  (c) => servicoController.desativar(c)
)

export { servico as servicoRoutes }
