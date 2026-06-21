import { z } from 'zod'

/**
 * Valida que a string é uma data ISO 8601 válida e no futuro.
 */
const dataHoraFuturaSchema = z
  .string()
  .refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'Data/hora inválida' }
  )
  .refine(
    (val) => new Date(val) > new Date(),
    { message: 'Data/hora deve ser no futuro' }
  )

export const createAgendamentoSchema = z
  .object({
    barbeiroId: z.string().min(1, 'ID do barbeiro é obrigatório'),
    servicoId: z.string().min(1, 'ID do serviço é obrigatório'),
    dataHora: dataHoraFuturaSchema,
    observacoes: z
      .string()
      .max(500, 'Observações devem ter no máximo 500 caracteres')
      .optional(),
  })
  .strict()

export const updateAgendamentoSchema = z
  .object({
    dataHora: dataHoraFuturaSchema.optional(),
    observacoes: z
      .string()
      .max(500, 'Observações devem ter no máximo 500 caracteres')
      .nullable()
      .optional(),
  })
  .strict()

export const updateStatusSchema = z
  .object({
    status: z.enum(['confirmado', 'cancelado', 'concluido'], {
      error: 'Status deve ser: confirmado, cancelado ou concluido',
    }),
  })
  .strict()

export type CreateAgendamentoInput = z.infer<typeof createAgendamentoSchema>
export type UpdateAgendamentoInput = z.infer<typeof updateAgendamentoSchema>
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>
