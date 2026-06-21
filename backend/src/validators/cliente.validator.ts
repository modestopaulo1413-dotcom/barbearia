import { z } from 'zod'

export const createClienteSchema = z
  .object({
    telefone: z
      .string()
      .min(10, 'Telefone deve ter no mínimo 10 dígitos')
      .max(15, 'Telefone deve ter no máximo 15 dígitos'),
  })
  .strict()

export const updateClienteSchema = z
  .object({
    nome: z
      .string()
      .min(2, 'Nome deve ter no mínimo 2 caracteres')
      .max(100, 'Nome deve ter no máximo 100 caracteres')
      .optional(),
    telefone: z
      .string()
      .min(10, 'Telefone deve ter no mínimo 10 dígitos')
      .max(15, 'Telefone deve ter no máximo 15 dígitos')
      .optional(),
  })
  .strict()

export type CreateClienteInput = z.infer<typeof createClienteSchema>
export type UpdateClienteInput = z.infer<typeof updateClienteSchema>
