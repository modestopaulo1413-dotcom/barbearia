import type { Context } from 'hono'
import type { Env } from '../config/env'

/**
 * Tipagem do payload JWT decodificado.
 */
export interface JwtPayload {
  sub: string
  email: string
  role: UserRole
  exp: number
  iat: number
}

/**
 * Roles do sistema.
 */
export type UserRole = 'admin' | 'barbeiro' | 'cliente'

/**
 * Status possíveis de um agendamento.
 */
export type AgendamentoStatus = 'pendente' | 'confirmado' | 'cancelado' | 'concluido'

/**
 * Tipagem do contexto Hono com variáveis customizadas.
 */
export interface AppVariables {
  user: JwtPayload
  db: any
}

/**
 * Tipo do contexto Hono usado em toda a aplicação.
 */
export type AppContext = Context<{ Bindings: Env; Variables: AppVariables }>

/**
 * Tipo do Hono app com os bindings corretos.
 */
export interface HonoEnv {
  Bindings: Env
  Variables: AppVariables
}

/**
 * Formato padrão de resposta de sucesso.
 */
export interface ApiSuccessResponse<T> {
  success: true
  data: T
}

/**
 * Formato padrão de resposta de erro.
 */
export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

/**
 * Tipo de horário de funcionamento do barbeiro.
 * Mapa de dia da semana → array de faixas horárias.
 */
export interface HorarioFuncionamento {
  [dia: string]: string[] // ex: { "seg": ["09:00-12:00", "14:00-18:00"] }
}
