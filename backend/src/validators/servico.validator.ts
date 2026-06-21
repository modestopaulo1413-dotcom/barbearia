import { z } from 'zod'

export const createServicoSchema = z
  .object({
    nome: z
      .string()
      .min(2, 'Nome deve ter no mínimo 2 caracteres')
      .max(100, 'Nome deve ter no máximo 100 caracteres'),
    descricao: z
      .string()
      .max(500, 'Descrição deve ter no máximo 500 caracteres')
      .optional(),
    duracaoMinutos: z
      .number()
      .int('Duração deve ser um número inteiro')
      .positive('Duração deve ser maior que zero')
      .max(480, 'Duração máxima é 8 horas (480 minutos)'),
    preco: z
      .number()
      .nonnegative('Preço deve ser maior ou igual a zero')
      .max(10000, 'Preço máximo é R$ 10.000'),
    barbeiroId: z.string().uuid('ID do barbeiro inválido'),
  })
  .strict()

export const updateServicoSchema = z
  .object({
    nome: z
      .string()
      .min(2, 'Nome deve ter no mínimo 2 caracteres')
      .max(100, 'Nome deve ter no máximo 100 caracteres')
      .optional(),
    descricao: z
      .string()
      .max(500, 'Descrição deve ter no máximo 500 caracteres')
      .nullable()
      .optional(),
    duracaoMinutos: z
      .number()
      .int('Duração deve ser um número inteiro')
      .positive('Duração deve ser maior que zero')
      .max(480, 'Duração máxima é 8 horas (480 minutos)')
      .optional(),
    preco: z
      .number()
      .nonnegative('Preço deve ser maior ou igual a zero')
      .max(10000, 'Preço máximo é R$ 10.000')
      .optional(),
    ativo: z.boolean().optional(),
  })
  .strict()

export type CreateServicoInput = z.infer<typeof createServicoSchema>
export type UpdateServicoInput = z.infer<typeof updateServicoSchema>
