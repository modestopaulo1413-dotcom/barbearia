import { eq, and } from 'drizzle-orm'
import { servicos, barbeiros } from '../models/schema'
import { success, error, ErrorCodes } from '../utils/response'
import type { AppContext } from '../types'
import type { CreateServicoInput, UpdateServicoInput } from '../validators/servico.validator'

/**
 * GET /api/v1/servicos
 * Lista todos os serviços ativos (público).
 * Query param opcional: ?barbeiroId=xxx para filtrar por barbeiro.
 */
export async function listar(c: AppContext) {
  const barbeiroId = c.req.query('barbeiroId')
  const db = c.get('db')

  const baseQuery = db
    .select({
      id: servicos.id,
      nome: servicos.nome,
      descricao: servicos.descricao,
      duracaoMinutos: servicos.duracaoMinutos,
      preco: servicos.preco,
      barbeiroId: servicos.barbeiroId,
    })
    .from(servicos)

  let result
  if (barbeiroId) {
    result = await baseQuery.where(
      and(eq(servicos.barbeiroId, barbeiroId), eq(servicos.ativo, true))
    )
  } else {
    result = await baseQuery.where(eq(servicos.ativo, true))
  }

  const mapped = result.map((s: any) => ({
    ...s,
    barbeiro_id: s.barbeiroId,
    duracao_minutos: s.duracaoMinutos,
  }))

  return success(c, mapped)
}

/**
 * GET /api/v1/servicos/:id
 * Detalhes de um serviço (público).
 */
export async function buscarPorId(c: AppContext) {
  const id = c.req.param('id') as string
  const db = c.get('db')

  const result = await db
    .select()
    .from(servicos)
    .where(eq(servicos.id, id))
    .limit(1)

  const servico = result[0]
  if (!servico) {
    return error(c, ErrorCodes.NOT_FOUND, 'Serviço não encontrado', 404)
  }

  return success(c, {
    ...servico,
    barbeiro_id: servico.barbeiroId,
    duracao_minutos: servico.duracaoMinutos,
  })
}

/**
 * POST /api/v1/servicos
 * Cria um serviço (requer role admin ou barbeiro).
 */
export async function criar(c: AppContext) {
  const body = await c.req.json<CreateServicoInput>()
  const user = c.get('user')
  const db = c.get('db')

  // Se for barbeiro, verifica se o barbeiroId corresponde ao seu próprio perfil
  if (user.role === 'barbeiro') {
    const barbeiroResult = await db
      .select({ id: barbeiros.id })
      .from(barbeiros)
      .where(eq(barbeiros.usuarioId, user.sub))
      .limit(1)

    const barbeiroRow = barbeiroResult[0]
    if (!barbeiroRow || barbeiroRow.id !== body.barbeiroId) {
      return error(
        c,
        ErrorCodes.FORBIDDEN,
        'Você só pode criar serviços para o seu próprio perfil',
        403
      )
    }
  }

  // Verifica se o barbeiro existe e está ativo
  const barbeiroCheck = await db
    .select({ id: barbeiros.id, ativo: barbeiros.ativo })
    .from(barbeiros)
    .where(eq(barbeiros.id, body.barbeiroId))
    .limit(1)

  const barbeiroRow = barbeiroCheck[0]
  if (!barbeiroRow || !barbeiroRow.ativo) {
    return error(c, ErrorCodes.NOT_FOUND, 'Barbeiro não encontrado ou inativo', 404)
  }

  const servicoId = crypto.randomUUID()

  await db.insert(servicos).values({
    id: servicoId,
    nome: body.nome,
    descricao: body.descricao ?? null,
    duracaoMinutos: body.duracaoMinutos,
    preco: body.preco,
    barbeiroId: body.barbeiroId,
  })

  return success(
    c,
    {
      id: servicoId,
      nome: body.nome,
      descricao: body.descricao ?? null,
      duracaoMinutos: body.duracaoMinutos,
      preco: body.preco,
      barbeiroId: body.barbeiroId,
    },
    201
  )
}

/**
 * PUT /api/v1/servicos/:id
 * Atualiza um serviço (admin ou barbeiro dono).
 */
export async function atualizar(c: AppContext) {
  const id = c.req.param('id') as string
  const body = await c.req.json<UpdateServicoInput>()
  const user = c.get('user')
  const db = c.get('db')

  // Busca o serviço
  const result = await db
    .select()
    .from(servicos)
    .where(eq(servicos.id, id))
    .limit(1)

  const servico = result[0]
  if (!servico) {
    return error(c, ErrorCodes.NOT_FOUND, 'Serviço não encontrado', 404)
  }

  // Se for barbeiro, verifica se é o dono do serviço
  if (user.role === 'barbeiro') {
    const barbeiroResult = await db
      .select({ id: barbeiros.id })
      .from(barbeiros)
      .where(eq(barbeiros.usuarioId, user.sub))
      .limit(1)

    const barbeiroRow = barbeiroResult[0]
    if (!barbeiroRow || barbeiroRow.id !== servico.barbeiroId) {
      return error(c, ErrorCodes.FORBIDDEN, 'Sem permissão para editar este serviço', 403)
    }
  }

  // Atualiza campos fornecidos
  const updateData: Record<string, unknown> = {}
  if (body.nome !== undefined) updateData['nome'] = body.nome
  if (body.descricao !== undefined) updateData['descricao'] = body.descricao
  if (body.duracaoMinutos !== undefined) updateData['duracaoMinutos'] = body.duracaoMinutos
  if (body.preco !== undefined) updateData['preco'] = body.preco
  if (body.ativo !== undefined) updateData['ativo'] = body.ativo

  if (Object.keys(updateData).length > 0) {
    await db.update(servicos).set(updateData).where(eq(servicos.id, id))
  }

  return success(c, { message: 'Serviço atualizado com sucesso' })
}

/**
 * DELETE /api/v1/servicos/:id
 * Desativa um serviço (soft delete, admin ou barbeiro dono).
 */
export async function desativar(c: AppContext) {
  const id = c.req.param('id') as string
  const user = c.get('user')
  const db = c.get('db')

  const result = await db
    .select({ id: servicos.id, barbeiroId: servicos.barbeiroId })
    .from(servicos)
    .where(eq(servicos.id, id))
    .limit(1)

  const servico = result[0]
  if (!servico) {
    return error(c, ErrorCodes.NOT_FOUND, 'Serviço não encontrado', 404)
  }

  // Se for barbeiro, verifica se é o dono
  if (user.role === 'barbeiro') {
    const barbeiroResult = await db
      .select({ id: barbeiros.id })
      .from(barbeiros)
      .where(eq(barbeiros.usuarioId, user.sub))
      .limit(1)

    const barbeiroRow = barbeiroResult[0]
    if (!barbeiroRow || barbeiroRow.id !== servico.barbeiroId) {
      return error(c, ErrorCodes.FORBIDDEN, 'Sem permissão para desativar este serviço', 403)
    }
  }

  await db.update(servicos).set({ ativo: false }).where(eq(servicos.id, id))

  return success(c, { message: 'Serviço desativado com sucesso' })
}
