import fs from 'fs'
import path from 'path'
import { serve } from '@hono/node-server'
import app from './index'

process.env.NODE_ENV = 'development'

// Carrega as variáveis do arquivo .dev.vars para o process.env
try {
  const envPath = path.resolve('.dev.vars')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...values] = trimmed.split('=')
        if (key && values.length > 0) {
          process.env[key.trim()] = values.join('=').trim()
        }
      }
    })
    console.log('Variables loaded from .dev.vars successfully.')
  } else {
    console.warn('.dev.vars not found. Make sure environment variables are set.')
  }
} catch (err) {
  console.error('Failed to load .dev.vars:', err)
}

const port = 8787
console.log(`Node.js Hono Server is running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
})
