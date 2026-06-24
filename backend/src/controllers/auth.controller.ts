import { eq } from 'drizzle-orm'
import { OAuth2Client } from 'google-auth-library'
import { usuarios, clientes, refreshTokens } from '../models/schema'
import { hashPassword, verifyPassword } from '../utils/password'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  getRefreshTokenExpiry,
} from '../utils/jwt'
import { success, error, ErrorCodes } from '../utils/response'
import type { AppContext } from '../types'
import type { RegisterInput, LoginInput, RefreshInput, GoogleLoginInput } from '../validators/auth.validator'

/**
 * POST /api/v1/auth/register
 * Cadastra um novo usuário (role: cliente).
 */
export async function register(c: AppContext) {
  console.log('==== DEBUG REGISTER START ====')
  const body = await c.req.json<RegisterInput>()
  console.log('Body:', body)
  const db = c.get('db')
  console.log('DB client:', !!db)

  console.log('Executing database select...')
  const existing = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, body.email))
    .limit(1)
  console.log('Database select finished. Existing:', existing)

  if (existing.length > 0) {
    return error(c, ErrorCodes.CONFLICT, 'Este email já está cadastrado', 409)
  }

  const userId = crypto.randomUUID()
  const clienteId = crypto.randomUUID()
  const senhaHash = await hashPassword(body.senha)

  // Cria o usuário
  await db.insert(usuarios).values({
    id: userId,
    nome: body.nome,
    email: body.email,
    senhaHash,
    role: 'cliente',
  })

  // Cria o registro de cliente
  await db.insert(clientes).values({
    id: clienteId,
    usuarioId: userId,
    telefone: body.telefone,
  })

  // Gera tokens
  const accessToken = await generateAccessToken(
    { sub: userId, email: body.email, role: 'cliente' },
    c.env.JWT_SECRET
  )
  const refreshTokenValue = await generateRefreshToken(
    { sub: userId },
    c.env.JWT_REFRESH_SECRET
  )

  // Armazena hash do refresh token
  const refreshTokenHash = await hashPassword(refreshTokenValue)
  await db.insert(refreshTokens).values({
    id: crypto.randomUUID(),
    usuarioId: userId,
    tokenHash: refreshTokenHash,
    expiraEm: getRefreshTokenExpiry(),
  })

  return success(
    c,
    {
      usuario: {
        id: userId,
        nome: body.nome,
        email: body.email,
        role: 'cliente' as const,
      },
      accessToken,
      refreshToken: refreshTokenValue,
    },
    201
  )
}

/**
 * POST /api/v1/auth/login
 * Autentica o usuário e retorna tokens.
 */
export async function login(c: AppContext) {
  const body = await c.req.json<LoginInput>()
  const db = c.get('db')

  // Busca o usuário pelo email
  const result = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, body.email))
    .limit(1)

  const usuario = result[0]

  if (!usuario) {
    return error(c, ErrorCodes.INVALID_CREDENTIALS, 'Email ou senha inválidos', 401)
  }

  if (!usuario.ativo) {
    return error(c, ErrorCodes.FORBIDDEN, 'Conta desativada', 403)
  }

  // Verifica a senha
  const senhaValida = await verifyPassword(body.senha, usuario.senhaHash)
  if (!senhaValida) {
    return error(c, ErrorCodes.INVALID_CREDENTIALS, 'Email ou senha inválidos', 401)
  }

  // Gera tokens
  const accessToken = await generateAccessToken(
    { sub: usuario.id, email: usuario.email, role: usuario.role },
    c.env.JWT_SECRET
  )
  const refreshTokenValue = await generateRefreshToken(
    { sub: usuario.id },
    c.env.JWT_REFRESH_SECRET
  )

  // Armazena hash do refresh token
  const refreshTokenHash = await hashPassword(refreshTokenValue)
  await db.insert(refreshTokens).values({
    id: crypto.randomUUID(),
    usuarioId: usuario.id,
    tokenHash: refreshTokenHash,
    expiraEm: getRefreshTokenExpiry(),
  })

  return success(c, {
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
    },
    accessToken,
    refreshToken: refreshTokenValue,
  })
}

/**
 * POST /api/v1/auth/google
 * Autentica o usuário pelo Google e retorna tokens.
 */
export async function googleLogin(c: AppContext) {
  const body = await c.req.json<GoogleLoginInput>()
  const db = c.get('db')
  const clientId = c.env.GOOGLE_CLIENT_ID

  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${body.token}`)
    
    if (!res.ok) {
       console.error('Google token verification failed:', await res.text())
       return error(c, ErrorCodes.INVALID_CREDENTIALS, 'Token do Google inválido', 401)
    }

    const payload = await res.json() as any
    
    if (payload.aud !== clientId) {
       console.error('Audience mismatch:', payload.aud, clientId)
       return error(c, ErrorCodes.INVALID_CREDENTIALS, 'Token do Google inválido (Client ID)', 401)
    }

    if (!payload || !payload.email) {
      return error(c, ErrorCodes.INVALID_CREDENTIALS, 'Token do Google inválido', 401)
    }

    const { email, name } = payload

    let result = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, email))
      .limit(1)

    let usuario = result[0]

    if (!usuario) {
      const userId = crypto.randomUUID()
      const clienteId = crypto.randomUUID()
      const senhaHash = await hashPassword(crypto.randomUUID()) // Senha aleatória inacessível

      await db.insert(usuarios).values({
        id: userId,
        nome: name || 'Usuário Google',
        email: email,
        senhaHash,
        role: 'cliente',
      })

      await db.insert(clientes).values({
        id: clienteId,
        usuarioId: userId,
        telefone: 'Não informado',
      })

      result = await db
        .select()
        .from(usuarios)
        .where(eq(usuarios.id, userId))
        .limit(1)
        
      usuario = result[0]
    }

    if (!usuario.ativo) {
      return error(c, ErrorCodes.FORBIDDEN, 'Conta desativada', 403)
    }

    // Gera tokens
    const accessToken = await generateAccessToken(
      { sub: usuario.id, email: usuario.email, role: usuario.role },
      c.env.JWT_SECRET
    )
    const refreshTokenValue = await generateRefreshToken(
      { sub: usuario.id },
      c.env.JWT_REFRESH_SECRET
    )

    // Armazena hash do refresh token
    const refreshTokenHash = await hashPassword(refreshTokenValue)
    await db.insert(refreshTokens).values({
      id: crypto.randomUUID(),
      usuarioId: usuario.id,
      tokenHash: refreshTokenHash,
      expiraEm: getRefreshTokenExpiry(),
    })

    return success(c, {
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
      },
      accessToken,
      refreshToken: refreshTokenValue,
    })
  } catch (err) {
    console.error('Erro na verificação do token do Google:', err)
    return error(c, ErrorCodes.INVALID_CREDENTIALS, 'Falha ao autenticar com Google', 401)
  }
}

/**
 * POST /api/v1/auth/refresh
 * Renova o access token usando um refresh token válido.
 */
export async function refresh(c: AppContext) {
  const body = await c.req.json<RefreshInput>()
  const db = c.get('db')

  // Verifica o refresh token
  let payload: { sub: string }
  try {
    payload = await verifyToken(body.refreshToken, c.env.JWT_REFRESH_SECRET) as unknown as { sub: string }
  } catch {
    return error(c, ErrorCodes.TOKEN_EXPIRED, 'Refresh token inválido ou expirado', 401)
  }

  // Busca todos os refresh tokens do usuário para comparar hashes
  const tokens = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.usuarioId, payload.sub))

  // Verifica se algum dos tokens armazenados corresponde
  let tokenEncontrado = false
  let tokenId = ''
  for (const token of tokens) {
    const match = await verifyPassword(body.refreshToken, token.tokenHash)
    if (match) {
      tokenEncontrado = true
      tokenId = token.id
      break
    }
  }

  if (!tokenEncontrado) {
    return error(c, ErrorCodes.TOKEN_EXPIRED, 'Refresh token não encontrado ou revogado', 401)
  }

  // Busca dados do usuário
  const result = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.id, payload.sub))
    .limit(1)

  const usuario = result[0]
  if (!usuario || !usuario.ativo) {
    return error(c, ErrorCodes.FORBIDDEN, 'Usuário não encontrado ou desativado', 403)
  }

  // Revoga o token antigo
  await db.delete(refreshTokens).where(eq(refreshTokens.id, tokenId))

  // Gera novos tokens
  const newAccessToken = await generateAccessToken(
    { sub: usuario.id, email: usuario.email, role: usuario.role },
    c.env.JWT_SECRET
  )
  const newRefreshToken = await generateRefreshToken(
    { sub: usuario.id },
    c.env.JWT_REFRESH_SECRET
  )

  // Armazena novo refresh token
  const newRefreshHash = await hashPassword(newRefreshToken)
  await db.insert(refreshTokens).values({
    id: crypto.randomUUID(),
    usuarioId: usuario.id,
    tokenHash: newRefreshHash,
    expiraEm: getRefreshTokenExpiry(),
  })

  return success(c, {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  })
}

/**
 * POST /api/v1/auth/logout
 * Revoga o refresh token do usuário (requer autenticação).
 */
export async function logout(c: AppContext) {
  const user = c.get('user')
  const db = c.get('db')

  // Remove todos os refresh tokens do usuário
  await db.delete(refreshTokens).where(eq(refreshTokens.usuarioId, user.sub))

  return success(c, { message: 'Logout realizado com sucesso' })
}

/**
 * GET /api/v1/auth/me
 * Retorna os dados do usuário autenticado.
 */
export async function me(c: AppContext) {
  const user = c.get('user')
  const db = c.get('db')

  const result = await db
    .select({
      id: usuarios.id,
      nome: usuarios.nome,
      email: usuarios.email,
      role: usuarios.role,
      criadoEm: usuarios.criadoEm,
    })
    .from(usuarios)
    .where(eq(usuarios.id, user.sub))
    .limit(1)

  const usuario = result[0]
  if (!usuario) {
    return error(c, ErrorCodes.NOT_FOUND, 'Usuário não encontrado', 404)
  }

  return success(c, usuario)
}
