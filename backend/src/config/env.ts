import { z } from 'zod'

/**
 * Schema Zod para validar as variáveis de ambiente (bindings) do Worker.
 * Falha explicitamente no boot se alguma variável obrigatória estiver ausente.
 */
const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL não pode estar vazio'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET deve ter no mínimo 32 caracteres'),
  ALLOWED_ORIGINS: z
    .string()
    .min(1, 'ALLOWED_ORIGINS não pode estar vazio'),
  GOOGLE_CLIENT_ID: z
    .string()
    .min(1, 'GOOGLE_CLIENT_ID não pode estar vazio'),
})

export type EnvVars = z.infer<typeof envSchema>

/**
 * Tipagem completa do Env do Worker (bindings + variáveis).
 */
export interface Env {
  DATABASE_URL: string
  JWT_SECRET: string
  JWT_REFRESH_SECRET: string
  ALLOWED_ORIGINS: string
  GOOGLE_CLIENT_ID: string
}

/**
 * Valida as variáveis de ambiente no boot do Worker.
 * Lança erro com detalhes se alguma estiver ausente ou inválida.
 */
export function validateEnv(env: unknown): Env {
  const result = envSchema.safeParse(env)

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Variáveis de ambiente inválidas:\n${errors}`)
  }

  return env as Env
}
