import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

/**
 * Gera o hash de uma senha usando bcryptjs.
 * Compatível com Cloudflare Workers.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verifica se uma senha corresponde ao hash armazenado.
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
