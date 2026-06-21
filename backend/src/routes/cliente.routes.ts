import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import type { HonoEnv } from '../types'
import { authMiddleware, requireRole } from '../middlewares/auth'
import { updateClienteSchema } from '../validators/cliente.validator'
import * as clienteController from '../controllers/cliente.controller'

const cliente = new Hono<HonoEnv>()

// GET / — listar clientes (admin ou barbeiro)
cliente.get(
  '/',
  authMiddleware,
  requireRole('admin', 'barbeiro'),
  (c) => clienteController.listar(c)
)

// GET /:id — detalhes de um cliente (admin ou próprio)
cliente.get(
  '/:id',
  authMiddleware,
  (c) => clienteController.buscarPorId(c)
)

// PUT /:id — atualizar cliente (admin ou próprio)
cliente.put(
  '/:id',
  authMiddleware,
  zValidator('json', updateClienteSchema),
  (c) => clienteController.atualizar(c)
)

// DELETE /:id — desativar cliente (admin)
cliente.delete(
  '/:id',
  authMiddleware,
  requireRole('admin'),
  (c) => clienteController.desativar(c)
)

export { cliente as clienteRoutes }
