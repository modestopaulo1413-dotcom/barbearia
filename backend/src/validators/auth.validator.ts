import { z } from 'zod'

export const registerSchema = z
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
    telefone: z
      .string()
      .min(10, 'Telefone deve ter no mínimo 10 dígitos')
      .max(15, 'Telefone deve ter no máximo 15 dígitos'),
  })
  .strict()

export const loginSchema = z
  .object({
    email: z.string().email('Email inválido'),
    senha: z.string().min(1, 'Senha é obrigatória'),
  })
  .strict()

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
  })
  .strict()

export const googleLoginSchema = z
  .object({
    token: z.string().min(1, 'Token do Google é obrigatório'),
  })
  .strict()

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RefreshInput = z.infer<typeof refreshSchema>
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>
