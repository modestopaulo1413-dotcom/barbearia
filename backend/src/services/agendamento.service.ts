import { eq, and, or, lt, gt, ne } from 'drizzle-orm'
import { agendamentos, barbeiros, servicos } from '../models/schema'
import type { HorarioFuncionamento, AgendamentoStatus } from '../types'

/**
 * Verifica se há conflito de horário para um barbeiro em um intervalo.
 * Retorna true se houver conflito.
 */
export async function verificarConflito(
  db: any,
  barbeiroId: string,
  dataHora: string,
  dataHoraFim: string,
  excluirAgendamentoId?: string
): Promise<boolean> {
  // Busca agendamentos ativos que se sobrepõem ao intervalo
  const conflitos = await db
    .select({ id: agendamentos.id })
    .from(agendamentos)
    .where(
      and(
        eq(agendamentos.barbeiroId, barbeiroId),
        // Status ativo (pendente ou confirmado)
        or(
          eq(agendamentos.status, 'pendente'),
          eq(agendamentos.status, 'confirmado')
        ),
        // Sobreposição: novo.inicio < existente.fim AND novo.fim > existente.inicio
        lt(agendamentos.dataHora, dataHoraFim),
        gt(agendamentos.dataHoraFim, dataHora),
        // Exclui o próprio agendamento em caso de reagendamento
        excluirAgendamentoId
          ? ne(agendamentos.id, excluirAgendamentoId)
          : undefined
      )
    )
    .limit(1)

  return conflitos.length > 0
}

/**
 * Calcula o horário de fim com base na data/hora de início e duração do serviço.
 */
export function calcularDataHoraFim(
  dataHora: string,
  duracaoMinutos: number
): string {
  const inicio = new Date(dataHora)
  const fim = new Date(inicio.getTime() + duracaoMinutos * 60 * 1000)
  
  const year = fim.getFullYear()
  const month = String(fim.getMonth() + 1).padStart(2, '0')
  const day = String(fim.getDate()).padStart(2, '0')
  const hours = String(fim.getHours()).padStart(2, '0')
  const minutes = String(fim.getMinutes()).padStart(2, '0')
  const seconds = String(fim.getSeconds()).padStart(2, '0')
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

/**
 * Verifica se o horário solicitado está dentro do horário de funcionamento do barbeiro.
 */
export function verificarHorarioFuncionamento(
  dataHora: string,
  dataHoraFim: string,
  horarioFuncionamentoJson: string | null
): boolean {
  if (!horarioFuncionamentoJson) {
    // Se não há horário definido, permite qualquer horário
    return true
  }

  const horarios: HorarioFuncionamento = JSON.parse(horarioFuncionamentoJson)
  const data = new Date(dataHora)
  const dataFim = new Date(dataHoraFim)

  // Mapeia o dia da semana JS (0=dom) para as chaves do horário
  const diasSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const
  const diaSemana = diasSemana[data.getDay()]

  if (!diaSemana) {
    return false
  }

  const faixas = horarios[diaSemana]
  if (!faixas || faixas.length === 0) {
    // Barbeiro não trabalha neste dia
    return false
  }

  // Extrai hora e minuto do agendamento
  const horaInicio = data.getHours() * 60 + data.getMinutes()
  const horaFim = dataFim.getHours() * 60 + dataFim.getMinutes()

  // Verifica se o intervalo cai em alguma faixa de funcionamento
  return faixas.some((faixa) => {
    const [inicioStr, fimStr] = faixa.split('-')
    if (!inicioStr || !fimStr) return false

    const [inicioH, inicioM] = inicioStr.split(':').map(Number)
    const [fimH, fimM] = fimStr.split(':').map(Number)

    if (inicioH === undefined || inicioM === undefined || fimH === undefined || fimM === undefined) {
      return false
    }

    const faixaInicio = inicioH * 60 + inicioM
    const faixaFim = fimH * 60 + fimM

    return horaInicio >= faixaInicio && horaFim <= faixaFim
  })
}

/**
 * Verifica se o barbeiro está ativo.
 */
export async function verificarBarbeiroAtivo(
  db: any,
  barbeiroId: string
): Promise<boolean> {
  const result = await db
    .select({ ativo: barbeiros.ativo })
    .from(barbeiros)
    .where(eq(barbeiros.id, barbeiroId))
    .limit(1)

  return result.length > 0 && result[0]!.ativo === true
}

/**
 * Verifica se o serviço pertence ao barbeiro e está ativo.
 */
export async function verificarServicoDoBarbeiro(
  db: any,
  servicoId: string,
  barbeiroId: string
): Promise<{ valido: boolean; duracaoMinutos: number }> {
  const result = await db
    .select({
      id: servicos.id,
      duracaoMinutos: servicos.duracaoMinutos,
      barbeiroId: servicos.barbeiroId,
      ativo: servicos.ativo,
    })
    .from(servicos)
    .where(
      and(
        eq(servicos.id, servicoId),
        eq(servicos.barbeiroId, barbeiroId),
        eq(servicos.ativo, true)
      )
    )
    .limit(1)

  if (result.length === 0) {
    return { valido: false, duracaoMinutos: 0 }
  }

  return { valido: true, duracaoMinutos: result[0]!.duracaoMinutos }
}

/**
 * Busca o horário de funcionamento de um barbeiro.
 */
export async function buscarHorarioBarbeiro(
  db: any,
  barbeiroId: string
): Promise<string | null> {
  const result = await db
    .select({ horarioFuncionamento: barbeiros.horarioFuncionamento })
    .from(barbeiros)
    .where(eq(barbeiros.id, barbeiroId))
    .limit(1)

  return result[0]?.horarioFuncionamento ?? null
}

/**
 * Valida todas as regras de negócio para criar/reagendar um agendamento.
 * Retorna null se válido, ou uma mensagem de erro.
 */
export async function validarAgendamento(
  db: any,
  barbeiroId: string,
  servicoId: string,
  dataHora: string,
  excluirAgendamentoId?: string
): Promise<{ erro: string; codigo: string } | null> {
  // 1. Verificar se a data é no futuro
  if (new Date(dataHora) <= new Date()) {
    return { erro: 'Data/hora deve ser no futuro', codigo: 'PAST_DATE' }
  }

  // 2. Verificar se o barbeiro está ativo
  const barbeiroAtivo = await verificarBarbeiroAtivo(db, barbeiroId)
  if (!barbeiroAtivo) {
    return { erro: 'Barbeiro não encontrado ou inativo', codigo: 'NOT_FOUND' }
  }

  // 3. Verificar se o serviço pertence ao barbeiro
  const servico = await verificarServicoDoBarbeiro(db, servicoId, barbeiroId)
  if (!servico.valido) {
    return {
      erro: 'Serviço não encontrado, inativo ou não pertence ao barbeiro selecionado',
      codigo: 'VALIDATION_ERROR',
    }
  }

  // 4. Calcular fim do agendamento
  const dataHoraFim = calcularDataHoraFim(dataHora, servico.duracaoMinutos)

  // 5. Verificar horário de funcionamento
  const horario = await buscarHorarioBarbeiro(db, barbeiroId)
  if (!verificarHorarioFuncionamento(dataHora, dataHoraFim, horario)) {
    return {
      erro: 'Horário fora do período de funcionamento do barbeiro',
      codigo: 'OUTSIDE_BUSINESS_HOURS',
    }
  }

  // 6. Verificar conflito de horário
  const conflito = await verificarConflito(
    db,
    barbeiroId,
    dataHora,
    dataHoraFim,
    excluirAgendamentoId
  )
  if (conflito) {
    return {
      erro: 'Já existe um agendamento neste horário para este barbeiro',
      codigo: 'SCHEDULE_CONFLICT',
    }
  }

  return null
}
