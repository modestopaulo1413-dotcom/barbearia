import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import type { HonoEnv } from '../types'
import { loginRateLimiter } from '../middlewares/rateLimiter'
import { authMiddleware } from '../middlewares/auth'
import { registerSchema, loginSchema, refreshSchema, googleLoginSchema } from '../validators/auth.validator'
import * as authController from '../controllers/auth.controller'

const auth = new Hono<HonoEnv>()

// POST /register — cadastro (rate limited)
auth.post(
  '/register',
  loginRateLimiter,
  zValidator('json', registerSchema),
  (c) => authController.register(c)
)

// POST /login — autenticação (rate limited)
auth.post(
  '/login',
  loginRateLimiter,
  zValidator('json', loginSchema),
  (c) => authController.login(c)
)

// POST /google — autenticação pelo Google
auth.post(
  '/google',
  loginRateLimiter,
  zValidator('json', googleLoginSchema),
  (c) => authController.googleLogin(c)
)

// POST /refresh — renovar token
auth.post(
  '/refresh',
  zValidator('json', refreshSchema),
  (c) => authController.refresh(c)
)

// POST /logout — revogar refresh token (autenticado)
auth.post('/logout', authMiddleware, (c) => authController.logout(c))

// GET /me — dados do usuário autenticado
auth.get('/me', authMiddleware, (c) => authController.me(c))

export { auth as authRoutes }
