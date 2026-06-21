import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import type { HonoEnv } from '../types'
import { authMiddleware, requireRole } from '../middlewares/auth'
import { createBarbeiroSchema, updateBarbeiroSchema } from '../validators/barbeiro.validator'
import * as barbeiroController from '../controllers/barbeiro.controller'

const barbeiro = new Hono<HonoEnv>()

// GET / — listar barbeiros (público)
barbeiro.get('/', (c) => barbeiroController.listar(c))

// GET /:id — detalhes de um barbeiro (público)
barbeiro.get('/:id', (c) => barbeiroController.buscarPorId(c))

// GET /:id/horarios-disponiveis — horários livres (público)
barbeiro.get('/:id/horarios-disponiveis', (c) =>
  barbeiroController.horariosDisponiveis(c)
)

// POST / — criar barbeiro (admin)
barbeiro.post(
  '/',
  authMiddleware,
  requireRole('admin'),
  zValidator('json', createBarbeiroSchema),
  (c) => barbeiroController.criar(c)
)

// PUT /:id — atualizar barbeiro (admin ou próprio)
barbeiro.put(
  '/:id',
  authMiddleware,
  requireRole('admin', 'barbeiro'),
  zValidator('json', updateBarbeiroSchema),
  (c) => barbeiroController.atualizar(c)
)

// DELETE /:id — desativar barbeiro (admin)
barbeiro.delete(
  '/:id',
  authMiddleware,
  requireRole('admin'),
  (c) => barbeiroController.desativar(c)
)

export { barbeiro as barbeiroRoutes }
