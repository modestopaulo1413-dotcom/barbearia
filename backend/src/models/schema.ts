import { pgTable, text, boolean, integer, real } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ─── USUARIOS ────────────────────────────────────────────────────────────────

export const usuarios = pgTable('usuarios', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  email: text('email').notNull().unique(),
  senhaHash: text('senha_hash').notNull(),
  role: text('role').notNull(), // 'admin' | 'barbeiro' | 'cliente'
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: text('criado_em')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  atualizadoEm: text('atualizado_em')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})

// ─── BARBEIROS ───────────────────────────────────────────────────────────────

export const barbeiros = pgTable('barbeiros', {
  id: text('id').primaryKey(),
  usuarioId: text('usuario_id')
    .notNull()
    .unique()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  especialidades: text('especialidades'), // JSON array: ["corte", "barba"]
  horarioFuncionamento: text('horario_funcionamento'), // JSON: { "seg": ["09:00-12:00", "14:00-18:00"], ... }
  ativo: boolean('ativo').notNull().default(true),
})

// ─── CLIENTES ────────────────────────────────────────────────────────────────

export const clientes = pgTable('clientes', {
  id: text('id').primaryKey(),
  usuarioId: text('usuario_id')
    .notNull()
    .unique()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  telefone: text('telefone').notNull(),
  criadoEm: text('criado_em')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})

// ─── SERVICOS ────────────────────────────────────────────────────────────────

export const servicos = pgTable('servicos', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  descricao: text('descricao'),
  duracaoMinutos: integer('duracao_minutos').notNull(),
  preco: real('preco').notNull(),
  barbeiroId: text('barbeiro_id')
    .notNull()
    .references(() => barbeiros.id, { onDelete: 'cascade' }),
  ativo: boolean('ativo').notNull().default(true),
})

// ─── AGENDAMENTOS ────────────────────────────────────────────────────────────

export const agendamentos = pgTable('agendamentos', {
  id: text('id').primaryKey(),
  clienteId: text('cliente_id')
    .notNull()
    .references(() => clientes.id, { onDelete: 'cascade' }),
  barbeiroId: text('barbeiro_id')
    .notNull()
    .references(() => barbeiros.id, { onDelete: 'cascade' }),
  servicoId: text('servico_id')
    .notNull()
    .references(() => servicos.id, { onDelete: 'cascade' }),
  dataHora: text('data_hora').notNull(),
  dataHoraFim: text('data_hora_fim').notNull(),
  status: text('status').notNull().default('pendente'), // 'pendente' | 'confirmado' | 'cancelado' | 'concluido'
  observacoes: text('observacoes'),
  criadoEm: text('criado_em')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  atualizadoEm: text('atualizado_em')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})

// ─── REFRESH TOKENS ──────────────────────────────────────────────────────────

export const refreshTokens = pgTable('refresh_tokens', {
  id: text('id').primaryKey(),
  usuarioId: text('usuario_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiraEm: text('expira_em').notNull(),
  criadoEm: text('criado_em')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})
