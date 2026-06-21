import { z } from 'zod'

/**
 * Schema para faixa de horário (ex: "09:00-12:00").
 */
const faixaHorarioSchema = z
  .string()
  .regex(
    /^\d{2}:\d{2}-\d{2}:\d{2}$/,
    'Formato de horário inválido. Use HH:MM-HH:MM'
  )

/**
 * Schema para horário de funcionamento por dia da semana.
 */
const horarioFuncionamentoSchema = z.record(
  z.enum(['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']),
  z.array(faixaHorarioSchema)
)

export const createBarbeiroSchema = z
  .object({
    nome: z
      .string()
      .min(2, 'Nome deve ter no mínimo 2 caracteres')
      .max(100, 'Nome deve ter no máximo 100 caracteres'),
    email: z
      .string()
      .email('Email inválido')
      .max(255, 'Email deve ter no máximo 255 caracteres'),
    senha: z
      .string()
      .min(8, 'Senha deve ter no mínimo 8 caracteres')
      .max(128, 'Senha deve ter no máximo 128 caracteres'),
    especialidades: z.array(z.string()).optional(),
    horarioFuncionamento: horarioFuncionamentoSchema.optional(),
  })
  .strict()

export const updateBarbeiroSchema = z
  .object({
    nome: z
      .string()
      .min(2, 'Nome deve ter no mínimo 2 caracteres')
      .max(100, 'Nome deve ter no máximo 100 caracteres')
      .optional(),
    especialidades: z.array(z.string()).optional(),
    horarioFuncionamento: horarioFuncionamentoSchema.optional(),
    ativo: z.boolean().optional(),
  })
  .strict()

export type CreateBarbeiroInput = z.infer<typeof createBarbeiroSchema>
export type UpdateBarbeiroInput = z.infer<typeof updateBarbeiroSchema>
