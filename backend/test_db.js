import postgres from 'postgres'

const url = 'postgresql://postgres.sihoxmhzourqhvulgvdg:W64eV21thzN3HWRW@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true'

console.log('Tentando conectar ao banco...')

const sql = postgres(url, {
  ssl: 'require',
  connect_timeout: 5 // 5 seconds timeout
})

try {
  const result = await sql`SELECT 1 as connected`
  console.log('Sucesso! Resultado:', result)
} catch (err) {
  console.error('Erro de conexão:', err)
} finally {
  await sql.end()
}
