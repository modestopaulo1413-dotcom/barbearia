import { eq } from 'drizzle-orm'
import { clientes, usuarios } from '../models/schema'
import { success, error, ErrorCodes } from '../utils/response'
import type { AppContext } from '../types'
import type { UpdateClienteInput } from '../validators/cliente.validator'

/**
 * GET /api/v1/clientes
 * Lista todos os clientes (requer role admin ou barbeiro).
 */
export async function listar(c: AppContext) {
  const db = c.get('db')

  const result = await db
    .select({
      id: clientes.id,
      nome: usuarios.nome,
      email: usuarios.email,
      telefone: clientes.telefone,
      criadoEm: clientes.criadoEm,
      ativo: usuarios.ativo,
    })
    .from(clientes)
    .innerJoin(usuarios, eq(clientes.usuarioId, usuarios.id))
    .where(eq(usuarios.ativo, true))

  return success(c, result)
}

/**
 * GET /api/v1/clientes/:id
 * Detalhes de um cliente (admin ou o próprio cliente).
 */
export async function buscarPorId(c: AppContext) {
  const id = c.req.param('id') as string
  const user = c.get('user')
  const db = c.get('db')

  const result = await db
    .select({
      id: clientes.id,
      usuarioId: clientes.usuarioId,
      nome: usuarios.nome,
      email: usuarios.email,
      telefone: clientes.telefone,
      criadoEm: clientes.criadoEm,
    })
    .from(clientes)
    .innerJoin(usuarios, eq(clientes.usuarioId, usuarios.id))
    .where(eq(clientes.id, id))
    .limit(1)

  const cliente = result[0]
  if (!cliente) {
    return error(c, ErrorCodes.NOT_FOUND, 'Cliente não encontrado', 404)
  }

  // Verifica permissão: admin ou o próprio cliente
  if (user.role !== 'admin' && user.sub !== cliente.usuarioId) {
    return error(c, ErrorCodes.FORBIDDEN, 'Sem permissão para ver este cliente', 403)
  }

  return success(c, cliente)
}

/**
 * PUT /api/v1/clientes/:id
 * Atualiza dados de um cliente (admin ou o próprio cliente).
 */
export async function atualizar(c: AppContext) {
  const id = c.req.param('id') as string
  const body = await c.req.json<UpdateClienteInput>()
  const user = c.get('user')
  const db = c.get('db')

  // Busca o cliente
  const result = await db
    .select({ id: clientes.id, usuarioId: clientes.usuarioId })
    .from(clientes)
    .where(eq(clientes.id, id))
    .limit(1)

  const cliente = result[0]
  if (!cliente) {
    return error(c, ErrorCodes.NOT_FOUND, 'Cliente não encontrado', 404)
  }

  // Verifica permissão: admin ou o próprio cliente
  if (user.role !== 'admin' && user.sub !== cliente.usuarioId) {
    return error(c, ErrorCodes.FORBIDDEN, 'Sem permissão para editar este cliente', 403)
  }

  // Atualiza telefone na tabela clientes
  if (body.telefone) {
    await db
      .update(clientes)
      .set({ telefone: body.telefone })
      .where(eq(clientes.id, id))
  }

  // Atualiza nome na tabela usuarios
  if (body.nome) {
    await db
      .update(usuarios)
      .set({ nome: body.nome, atualizadoEm: new Date().toISOString() })
      .where(eq(usuarios.id, cliente.usuarioId))
  }

  return success(c, { message: 'Cliente atualizado com sucesso' })
}

/**
 * DELETE /api/v1/clientes/:id
 * Desativa um cliente (soft delete, requer role admin).
 */
export async function desativar(c: AppContext) {
  const id = c.req.param('id') as string
  const db = c.get('db')

  const result = await db
    .select({ id: clientes.id, usuarioId: clientes.usuarioId })
    .from(clientes)
    .where(eq(clientes.id, id))
    .limit(1)

  const cliente = result[0]
  if (!cliente) {
    return error(c, ErrorCodes.NOT_FOUND, 'Cliente não encontrado', 404)
  }

  // Soft delete: desativa o usuário
  await db
    .update(usuarios)
    .set({ ativo: false, atualizadoEm: new Date().toISOString() })
    .where(eq(usuarios.id, cliente.usuarioId))

  return success(c, { message: 'Cliente desativado com sucesso' })
}
