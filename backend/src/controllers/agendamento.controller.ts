import { eq, and, or, aliasedTable } from 'drizzle-orm'
import { agendamentos, clientes, barbeiros, servicos, usuarios } from '../models/schema'
import {
  validarAgendamento,
  calcularDataHoraFim,
  verificarServicoDoBarbeiro,
} from '../services/agendamento.service'
import { enviarNotificacao } from '../services/notificacao.service'
import { success, error, ErrorCodes } from '../utils/response'
import type { AppContext } from '../types'
import type {
  CreateAgendamentoInput,
  UpdateAgendamentoInput,
  UpdateStatusInput,
} from '../validators/agendamento.validator'

/**
 * GET /api/v1/agendamentos
 * Lista agendamentos (admin/barbeiro). Suporta filtros por data e status.
 */
export async function listar(c: AppContext) {
  const user = c.get('user')
  const status = c.req.query('status')
  const data = c.req.query('data')
  const db = c.get('db')

  const usuarioBarbeiro = aliasedTable(usuarios, 'usuario_barbeiro')
  const usuarioCliente = aliasedTable(usuarios, 'usuario_cliente')

  let result = await db
    .select({
      id: agendamentos.id,
      clienteId: agendamentos.clienteId,
      barbeiroId: agendamentos.barbeiroId,
      servicoId: agendamentos.servicoId,
      dataHora: agendamentos.dataHora,
      dataHoraFim: agendamentos.dataHoraFim,
      status: agendamentos.status,
      observacoes: agendamentos.observacoes,
      criadoEm: agendamentos.criadoEm,
      barbeiro_nome: usuarioBarbeiro.nome,
      cliente_nome: usuarioCliente.nome,
      servico_nome: servicos.nome,
      servico_preco: servicos.preco,
    })
    .from(agendamentos)
    .innerJoin(barbeiros, eq(agendamentos.barbeiroId, barbeiros.id))
    .innerJoin(usuarioBarbeiro, eq(barbeiros.usuarioId, usuarioBarbeiro.id))
    .innerJoin(clientes, eq(agendamentos.clienteId, clientes.id))
    .innerJoin(usuarioCliente, eq(clientes.usuarioId, usuarioCliente.id))
    .innerJoin(servicos, eq(agendamentos.servicoId, servicos.id))

  // Filtra por barbeiro se o user é barbeiro
  if (user.role === 'barbeiro') {
    const barbeiroResult = await db
      .select({ id: barbeiros.id })
      .from(barbeiros)
      .where(eq(barbeiros.usuarioId, user.sub))
      .limit(1)

    const barbeiroRow = barbeiroResult[0]
    if (barbeiroRow) {
      result = result.filter((a: any) => a.barbeiroId === barbeiroRow.id)
    }
  }

  // Filtra por status
  if (status) {
    result = result.filter((a: any) => a.status === status)
  }

  // Filtra por data
  if (data) {
    result = result.filter((a: any) => a.dataHora.startsWith(data))
  }

  const mapped = result.map((a: any) => ({
    ...a,
    cliente_id: a.clienteId,
    barbeiro_id: a.barbeiroId,
    servico_id: a.servicoId,
    data_hora: a.dataHora,
    data_hora_fim: a.dataHoraFim,
    criado_em: a.criadoEm,
  }))

  return success(c, mapped)
}

/**
 * GET /api/v1/agendamentos/:id
 * Detalhes de um agendamento (apenas envolvidos: cliente, barbeiro ou admin).
 */
export async function buscarPorId(c: AppContext) {
  const id = c.req.param('id') as string
  const user = c.get('user')
  const db = c.get('db')

  const result = await db
    .select({
      id: agendamentos.id,
      clienteId: agendamentos.clienteId,
      barbeiroId: agendamentos.barbeiroId,
      servicoId: agendamentos.servicoId,
      dataHora: agendamentos.dataHora,
      dataHoraFim: agendamentos.dataHoraFim,
      status: agendamentos.status,
      observacoes: agendamentos.observacoes,
      criadoEm: agendamentos.criadoEm,
      atualizadoEm: agendamentos.atualizadoEm,
    })
    .from(agendamentos)
    .where(eq(agendamentos.id, id))
    .limit(1)

  const agendamento = result[0]
  if (!agendamento) {
    return error(c, ErrorCodes.NOT_FOUND, 'Agendamento não encontrado', 404)
  }

  // Verifica se o usuário está envolvido
  if (user.role !== 'admin') {
    let autorizado = false

    // Verifica se é o cliente
    const clienteResult = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(eq(clientes.usuarioId, user.sub))
      .limit(1)
    const clienteRow = clienteResult[0]
    if (clienteRow && clienteRow.id === agendamento.clienteId) {
      autorizado = true
    }

    // Verifica se é o barbeiro
    const barbeiroResult = await db
      .select({ id: barbeiros.id })
      .from(barbeiros)
      .where(eq(barbeiros.usuarioId, user.sub))
      .limit(1)
    const barbeiroRow = barbeiroResult[0]
    if (barbeiroRow && barbeiroRow.id === agendamento.barbeiroId) {
      autorizado = true
    }

    if (!autorizado) {
      return error(c, ErrorCodes.FORBIDDEN, 'Sem permissão para ver este agendamento', 403)
    }
  }

  return success(c, {
    ...agendamento,
    cliente_id: agendamento.clienteId,
    barbeiro_id: agendamento.barbeiroId,
    servico_id: agendamento.servicoId,
    data_hora: agendamento.dataHora,
    data_hora_fim: agendamento.dataHoraFim,
    criado_em: agendamento.criadoEm,
  })
}

/**
 * POST /api/v1/agendamentos
 * Cria um novo agendamento (requer role cliente).
 */
export async function criar(c: AppContext) {
  const body = await c.req.json<CreateAgendamentoInput>()
  const user = c.get('user')
  const db = c.get('db')

  // Busca o cliente associado ao usuário
  const clienteResult = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(eq(clientes.usuarioId, user.sub))
    .limit(1)

  const cliente = clienteResult[0]
  if (!cliente) {
    return error(c, ErrorCodes.NOT_FOUND, 'Perfil de cliente não encontrado', 404)
  }

  // Valida todas as regras de negócio
  const validacao = await validarAgendamento(
    db,
    body.barbeiroId,
    body.servicoId,
    body.dataHora
  )

  if (validacao) {
    return error(c, validacao.codigo, validacao.erro, 400)
  }

  // Busca duração do serviço para calcular data_hora_fim
  const servico = await verificarServicoDoBarbeiro(
    db,
    body.servicoId,
    body.barbeiroId
  )
  const dataHoraFim = calcularDataHoraFim(body.dataHora, servico.duracaoMinutos)

  const agendamentoId = crypto.randomUUID()

  await db.insert(agendamentos).values({
    id: agendamentoId,
    clienteId: cliente.id,
    barbeiroId: body.barbeiroId,
    servicoId: body.servicoId,
    dataHora: body.dataHora,
    dataHoraFim,
    observacoes: body.observacoes ?? null,
  })

  // Notificação (async, não bloqueia a resposta)
  void enviarNotificacao({
    tipo: 'agendamento_criado',
    destinatarioId: user.sub,
    destinatarioNome: user.email,
    agendamentoId,
    dataHora: body.dataHora,
  })

  return success(
    c,
    {
      id: agendamentoId,
      clienteId: cliente.id,
      cliente_id: cliente.id,
      barbeiroId: body.barbeiroId,
      barbeiro_id: body.barbeiroId,
      servicoId: body.servicoId,
      servico_id: body.servicoId,
      dataHora: body.dataHora,
      data_hora: body.dataHora,
      dataHoraFim,
      data_hora_fim: dataHoraFim,
      status: 'pendente' as const,
      observacoes: body.observacoes ?? null,
    },
    201
  )
}

/**
 * PUT /api/v1/agendamentos/:id/status
 * Altera status do agendamento (confirmar/cancelar/concluir — admin ou barbeiro).
 */
export async function atualizarStatus(c: AppContext) {
  const id = c.req.param('id') as string
  const body = await c.req.json<UpdateStatusInput>()
  const user = c.get('user')
  const db = c.get('db')

  const result = await db
    .select()
    .from(agendamentos)
    .where(eq(agendamentos.id, id))
    .limit(1)

  const agendamento = result[0]
  if (!agendamento) {
    return error(c, ErrorCodes.NOT_FOUND, 'Agendamento não encontrado', 404)
  }

  // Verifica permissão: admin ou barbeiro do agendamento
  if (user.role === 'barbeiro') {
    const barbeiroResult = await db
      .select({ id: barbeiros.id })
      .from(barbeiros)
      .where(eq(barbeiros.usuarioId, user.sub))
      .limit(1)

    const barbeiroRow = barbeiroResult[0]
    if (!barbeiroRow || barbeiroRow.id !== agendamento.barbeiroId) {
      return error(
        c,
        ErrorCodes.FORBIDDEN,
        'Sem permissão para alterar o status deste agendamento',
        403
      )
    }
  }

  // Valida transição de status
  if (agendamento.status === 'cancelado' || agendamento.status === 'concluido') {
    return error(
      c,
      ErrorCodes.VALIDATION_ERROR,
      `Não é possível alterar o status de um agendamento ${agendamento.status}`,
      400
    )
  }

  await db
    .update(agendamentos)
    .set({ status: body.status, atualizadoEm: new Date().toISOString() })
    .where(eq(agendamentos.id, id))

  // Notificação
  const tipoMap = {
    confirmado: 'agendamento_confirmado',
    cancelado: 'agendamento_cancelado',
    concluido: 'agendamento_concluido',
  } as const
  void enviarNotificacao({
    tipo: tipoMap[body.status],
    destinatarioId: agendamento.clienteId,
    destinatarioNome: '',
    agendamentoId: id,
    dataHora: agendamento.dataHora,
  })

  return success(c, { message: `Agendamento ${body.status} com sucesso` })
}

/**
 * PUT /api/v1/agendamentos/:id
 * Reagenda (altera data/hora) um agendamento (cliente ou admin).
 */
export async function reagendar(c: AppContext) {
  const id = c.req.param('id') as string
  const body = await c.req.json<UpdateAgendamentoInput>()
  const user = c.get('user')
  const db = c.get('db')

  const result = await db
    .select()
    .from(agendamentos)
    .where(eq(agendamentos.id, id))
    .limit(1)

  const agendamento = result[0]
  if (!agendamento) {
    return error(c, ErrorCodes.NOT_FOUND, 'Agendamento não encontrado', 404)
  }

  // Verifica permissão: admin ou cliente dono
  if (user.role === 'cliente') {
    const clienteResult = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(eq(clientes.usuarioId, user.sub))
      .limit(1)

    const clienteRow = clienteResult[0]
    if (!clienteRow || clienteRow.id !== agendamento.clienteId) {
      return error(c, ErrorCodes.FORBIDDEN, 'Sem permissão para reagendar este agendamento', 403)
    }
  }

  // Verifica se o agendamento pode ser reagendado
  if (agendamento.status === 'cancelado' || agendamento.status === 'concluido') {
    return error(
      c,
      ErrorCodes.VALIDATION_ERROR,
      `Não é possível reagendar um agendamento ${agendamento.status}`,
      400
    )
  }

  const updateData: Record<string, unknown> = {
    atualizadoEm: new Date().toISOString(),
  }

  if (body.dataHora) {
    // Valida nova data/hora
    const validacao = await validarAgendamento(
      db,
      agendamento.barbeiroId,
      agendamento.servicoId,
      body.dataHora,
      id // exclui o próprio agendamento da checagem de conflito
    )

    if (validacao) {
      return error(c, validacao.codigo, validacao.erro, 400)
    }

    const servico = await verificarServicoDoBarbeiro(
      db,
      agendamento.servicoId,
      agendamento.barbeiroId
    )
    const dataHoraFim = calcularDataHoraFim(body.dataHora, servico.duracaoMinutos)

    updateData['dataHora'] = body.dataHora
    updateData['dataHoraFim'] = dataHoraFim
    // Volta para pendente ao reagendar
    updateData['status'] = 'pendente'
  }

  if (body.observacoes !== undefined) {
    updateData['observacoes'] = body.observacoes
  }

  await db.update(agendamentos).set(updateData).where(eq(agendamentos.id, id))

  // Notificação
  void enviarNotificacao({
    tipo: 'agendamento_reagendado',
    destinatarioId: agendamento.barbeiroId,
    destinatarioNome: '',
    agendamentoId: id,
    dataHora: body.dataHora ?? agendamento.dataHora,
  })

  return success(c, { message: 'Agendamento reagendado com sucesso' })
}

/**
 * GET /api/v1/agendamentos/meus
 * Lista agendamentos do cliente autenticado.
 */
export async function meusAgendamentos(c: AppContext) {
  const user = c.get('user')
  const db = c.get('db')

  // Busca o cliente
  const clienteResult = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(eq(clientes.usuarioId, user.sub))
    .limit(1)

  const cliente = clienteResult[0]
  if (!cliente) {
    return error(c, ErrorCodes.NOT_FOUND, 'Perfil de cliente não encontrado', 404)
  }

  const usuarioBarbeiro = aliasedTable(usuarios, 'usuario_barbeiro')
  const usuarioCliente = aliasedTable(usuarios, 'usuario_cliente')

  const result = await db
    .select({
      id: agendamentos.id,
      clienteId: agendamentos.clienteId,
      barbeiroId: agendamentos.barbeiroId,
      servicoId: agendamentos.servicoId,
      dataHora: agendamentos.dataHora,
      dataHoraFim: agendamentos.dataHoraFim,
      status: agendamentos.status,
      observacoes: agendamentos.observacoes,
      criadoEm: agendamentos.criadoEm,
      barbeiro_nome: usuarioBarbeiro.nome,
      cliente_nome: usuarioCliente.nome,
      servico_nome: servicos.nome,
      servico_preco: servicos.preco,
    })
    .from(agendamentos)
    .innerJoin(barbeiros, eq(agendamentos.barbeiroId, barbeiros.id))
    .innerJoin(usuarioBarbeiro, eq(barbeiros.usuarioId, usuarioBarbeiro.id))
    .innerJoin(clientes, eq(agendamentos.clienteId, clientes.id))
    .innerJoin(usuarioCliente, eq(clientes.usuarioId, usuarioCliente.id))
    .innerJoin(servicos, eq(agendamentos.servicoId, servicos.id))
    .where(eq(agendamentos.clienteId, cliente.id))

  const mapped = result.map((a: any) => ({
    ...a,
    cliente_id: a.clienteId,
    barbeiro_id: a.barbeiroId,
    servico_id: a.servicoId,
    data_hora: a.dataHora,
    data_hora_fim: a.dataHoraFim,
    criado_em: a.criadoEm,
  }))

  return success(c, mapped)
}

/**
 * GET /api/v1/agendamentos/barbeiro/:id
 * Lista agendamentos de um barbeiro específico (admin ou o próprio barbeiro).
 */
export async function agendamentosDoBarbeiro(c: AppContext) {
  const barbeiroId = c.req.param('id') as string
  const user = c.get('user')
  const db = c.get('db')

  // Verifica permissão
  if (user.role === 'barbeiro') {
    const barbeiroResult = await db
      .select({ id: barbeiros.id })
      .from(barbeiros)
      .where(eq(barbeiros.usuarioId, user.sub))
      .limit(1)

    const barbeiroRow = barbeiroResult[0]
    if (!barbeiroRow || barbeiroRow.id !== barbeiroId) {
      return error(
        c,
        ErrorCodes.FORBIDDEN,
        'Sem permissão para ver agendamentos de outro barbeiro',
        403
      )
    }
  }

  const result = await db
    .select({
      id: agendamentos.id,
      clienteId: agendamentos.clienteId,
      servicoId: agendamentos.servicoId,
      dataHora: agendamentos.dataHora,
      dataHoraFim: agendamentos.dataHoraFim,
      status: agendamentos.status,
      observacoes: agendamentos.observacoes,
      criadoEm: agendamentos.criadoEm,
    })
    .from(agendamentos)
    .where(eq(agendamentos.barbeiroId, barbeiroId))

  return success(c, result)
}
