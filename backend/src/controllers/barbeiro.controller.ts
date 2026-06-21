import { eq } from 'drizzle-orm'
import { barbeiros, usuarios, agendamentos } from '../models/schema'
import { hashPassword } from '../utils/password'
import { success, error, ErrorCodes } from '../utils/response'
import type { AppContext } from '../types'
import type { CreateBarbeiroInput, UpdateBarbeiroInput } from '../validators/barbeiro.validator'

/**
 * GET /api/v1/barbeiros
 * Lista todos os barbeiros ativos (público).
 */
export async function listar(c: AppContext) {
  const db = c.get('db')

  const result = await db
    .select({
      id: barbeiros.id,
      nome: usuarios.nome,
      email: usuarios.email,
      especialidades: barbeiros.especialidades,
      horarioFuncionamento: barbeiros.horarioFuncionamento,
    })
    .from(barbeiros)
    .innerJoin(usuarios, eq(barbeiros.usuarioId, usuarios.id))
    .where(eq(barbeiros.ativo, true))

  // Parse JSON strings
  const parsed = result.map((b: any) => {
    const horario = b.horarioFuncionamento
      ? JSON.parse(b.horarioFuncionamento) as Record<string, string[]>
      : null
    return {
      ...b,
      especialidades: b.especialidades ? JSON.parse(b.especialidades) as string[] : [],
      horarioFuncionamento: horario,
      horario_funcionamento: horario,
    }
  })

  return success(c, parsed)
}

/**
 * GET /api/v1/barbeiros/:id
 * Detalhes de um barbeiro (público).
 */
export async function buscarPorId(c: AppContext) {
  const id = c.req.param('id') as string
  const db = c.get('db')

  const result = await db
    .select({
      id: barbeiros.id,
      nome: usuarios.nome,
      email: usuarios.email,
      especialidades: barbeiros.especialidades,
      horarioFuncionamento: barbeiros.horarioFuncionamento,
      ativo: barbeiros.ativo,
    })
    .from(barbeiros)
    .innerJoin(usuarios, eq(barbeiros.usuarioId, usuarios.id))
    .where(eq(barbeiros.id, id))
    .limit(1)

  const barbeiro = result[0]
  if (!barbeiro) {
    return error(c, ErrorCodes.NOT_FOUND, 'Barbeiro não encontrado', 404)
  }

  const horario = barbeiro.horarioFuncionamento
    ? JSON.parse(barbeiro.horarioFuncionamento) as Record<string, string[]>
    : null

  return success(c, {
    ...barbeiro,
    especialidades: barbeiro.especialidades
      ? JSON.parse(barbeiro.especialidades) as string[]
      : [],
    horarioFuncionamento: horario,
    horario_funcionamento: horario,
  })
}

/**
 * POST /api/v1/barbeiros
 * Cria um barbeiro (requer role admin). Cria usuário + registro de barbeiro.
 */
export async function criar(c: AppContext) {
  const body = await c.req.json<CreateBarbeiroInput>()
  const db = c.get('db')

  // Verifica se email já existe
  const existing = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, body.email))
    .limit(1)

  if (existing.length > 0) {
    return error(c, ErrorCodes.CONFLICT, 'Este email já está cadastrado', 409)
  }

  const userId = crypto.randomUUID()
  const barbeiroId = crypto.randomUUID()
  const senhaHash = await hashPassword(body.senha)

  // Cria o usuário com role barbeiro
  await db.insert(usuarios).values({
    id: userId,
    nome: body.nome,
    email: body.email,
    senhaHash,
    role: 'barbeiro',
  })

  // Cria o registro de barbeiro
  await db.insert(barbeiros).values({
    id: barbeiroId,
    usuarioId: userId,
    especialidades: body.especialidades
      ? JSON.stringify(body.especialidades)
      : null,
    horarioFuncionamento: body.horarioFuncionamento
      ? JSON.stringify(body.horarioFuncionamento)
      : null,
  })

  return success(
    c,
    {
      id: barbeiroId,
      nome: body.nome,
      email: body.email,
      especialidades: body.especialidades ?? [],
      horarioFuncionamento: body.horarioFuncionamento ?? null,
    },
    201
  )
}

/**
 * PUT /api/v1/barbeiros/:id
 * Atualiza dados de um barbeiro (admin ou o próprio barbeiro).
 */
export async function atualizar(c: AppContext) {
  const id = c.req.param('id') as string
  const body = await c.req.json<UpdateBarbeiroInput>()
  const user = c.get('user')
  const db = c.get('db')

  // Busca o barbeiro
  const result = await db
    .select({
      id: barbeiros.id,
      usuarioId: barbeiros.usuarioId,
    })
    .from(barbeiros)
    .where(eq(barbeiros.id, id))
    .limit(1)

  const barbeiro = result[0]
  if (!barbeiro) {
    return error(c, ErrorCodes.NOT_FOUND, 'Barbeiro não encontrado', 404)
  }

  // Verifica permissão: admin ou o próprio barbeiro
  if (user.role !== 'admin' && user.sub !== barbeiro.usuarioId) {
    return error(c, ErrorCodes.FORBIDDEN, 'Sem permissão para editar este barbeiro', 403)
  }

  // Atualiza campos do barbeiro
  const updateData: Record<string, unknown> = {}
  if (body.especialidades !== undefined) {
    updateData['especialidades'] = JSON.stringify(body.especialidades)
  }
  if (body.horarioFuncionamento !== undefined) {
    updateData['horarioFuncionamento'] = JSON.stringify(body.horarioFuncionamento)
  }
  if (body.ativo !== undefined) {
    updateData['ativo'] = body.ativo
  }

  if (Object.keys(updateData).length > 0) {
    await db.update(barbeiros).set(updateData).where(eq(barbeiros.id, id))
  }

  // Atualiza nome no usuário se fornecido
  if (body.nome) {
    await db
      .update(usuarios)
      .set({ nome: body.nome, atualizadoEm: new Date().toISOString() })
      .where(eq(usuarios.id, barbeiro.usuarioId))
  }

  return success(c, { message: 'Barbeiro atualizado com sucesso' })
}

/**
 * DELETE /api/v1/barbeiros/:id
 * Desativa um barbeiro (soft delete, requer role admin).
 */
export async function desativar(c: AppContext) {
  const id = c.req.param('id') as string
  const db = c.get('db')

  const result = await db
    .select({ id: barbeiros.id, usuarioId: barbeiros.usuarioId })
    .from(barbeiros)
    .where(eq(barbeiros.id, id))
    .limit(1)

  const barbeiro = result[0]
  if (!barbeiro) {
    return error(c, ErrorCodes.NOT_FOUND, 'Barbeiro não encontrado', 404)
  }

  // Soft delete: desativa o barbeiro e o usuário
  await db.update(barbeiros).set({ ativo: false }).where(eq(barbeiros.id, id))
  await db
    .update(usuarios)
    .set({ ativo: false, atualizadoEm: new Date().toISOString() })
    .where(eq(usuarios.id, barbeiro.usuarioId))

  return success(c, { message: 'Barbeiro desativado com sucesso' })
}

/**
 * GET /api/v1/barbeiros/:id/horarios-disponiveis
 * Retorna horários disponíveis de um barbeiro em uma data específica (público).
 * Query param: ?data=2024-01-15
 */
export async function horariosDisponiveis(c: AppContext) {
  const id = c.req.param('id') as string
  const data = c.req.query('data')

  if (!data) {
    return error(c, ErrorCodes.VALIDATION_ERROR, 'Parâmetro "data" é obrigatório (formato: YYYY-MM-DD)', 400)
  }

  // Valida formato da data
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(data)) {
    return error(c, ErrorCodes.VALIDATION_ERROR, 'Formato de data inválido. Use YYYY-MM-DD', 400)
  }

  const db = c.get('db')

  // Busca barbeiro e seu horário de funcionamento
  const barbeiroResult = await db
    .select({
      id: barbeiros.id,
      horarioFuncionamento: barbeiros.horarioFuncionamento,
      ativo: barbeiros.ativo,
    })
    .from(barbeiros)
    .where(eq(barbeiros.id, id))
    .limit(1)

  const barbeiro = barbeiroResult[0]
  if (!barbeiro || !barbeiro.ativo) {
    return error(c, ErrorCodes.NOT_FOUND, 'Barbeiro não encontrado ou inativo', 404)
  }

  if (!barbeiro.horarioFuncionamento) {
    return success(c, { data, horarios: [] })
  }

  const horarios = JSON.parse(barbeiro.horarioFuncionamento) as Record<string, string[]>
  const diasSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const
  const dataObj = new Date(data + 'T12:00:00Z') // Meio-dia para evitar problemas de timezone
  const dia = diasSemana[dataObj.getUTCDay()]

  if (!dia) {
    return success(c, { data, horarios: [] })
  }

  const faixas = horarios[dia]
  if (!faixas || faixas.length === 0) {
    return success(c, { data, horarios: [], mensagem: 'Barbeiro não trabalha neste dia' })
  }

  // Busca agendamentos existentes para esta data
  const inicioData = `${data}T00:00:00`
  const fimData = `${data}T23:59:59`

  const agendamentosExistentes = await db
    .select({
      dataHora: agendamentos.dataHora,
      dataHoraFim: agendamentos.dataHoraFim,
      status: agendamentos.status,
    })
    .from(agendamentos)
    .where(eq(agendamentos.barbeiroId, id))

  // Filtra apenas os agendamentos ativos desta data
  const ocupados = agendamentosExistentes.filter(
    (a: any) =>
      a.dataHora >= inicioData &&
      a.dataHora <= fimData &&
      (a.status === 'pendente' || a.status === 'confirmado')
  )

  // Gera slots de 30 minutos dentro das faixas de funcionamento
  const slots: string[] = []
  for (const faixa of faixas) {
    const partes = faixa.split('-')
    const inicioStr = partes[0]
    const fimStr = partes[1]
    if (!inicioStr || !fimStr) continue

    const inicioPartes = inicioStr.split(':').map(Number)
    const fimPartes = fimStr.split(':').map(Number)
    const iH = inicioPartes[0]
    const iM = inicioPartes[1]
    const fH = fimPartes[0]
    const fM = fimPartes[1]

    if (iH === undefined || iM === undefined || fH === undefined || fM === undefined) continue

    let minutos = iH * 60 + iM
    const fimMinutos = fH * 60 + fM

    while (minutos < fimMinutos) {
      const hora = String(Math.floor(minutos / 60)).padStart(2, '0')
      const min = String(minutos % 60).padStart(2, '0')
      const slotHora = `${hora}:${min}`
      const slotISO = `${data}T${slotHora}:00`

      // Verifica se não está ocupado
      const ocupado = ocupados.some((a: any) => {
        return slotISO >= a.dataHora && slotISO < a.dataHoraFim
      })

      if (!ocupado) {
        slots.push(slotHora)
      }

      minutos += 30 // Intervalo de 30 minutos
    }
  }

  return success(c, { data, horarios: slots })
}
