import pkg from 'pg'
const { Client } = pkg

const url = 'postgresql://postgres:W64eV21thzN3HWRW@db.sihoxmhzourqhvulgvdg.supabase.co:5432/postgres'

const client = new Client({
  connectionString: url,
  ssl: {
    rejectUnauthorized: false
  }
})

try {
  await client.connect()
  const res = await client.query('select "id", "nome", "email", "senha_hash", "role", "ativo", "criado_em", "atualizado_em" from "usuarios" where "usuarios"."email" = $1 limit $2', ['test@test.com', 1])
  console.log('Result:', res.rows[0])
} catch (err) {
  console.error('Query error:', err)
} finally {
  await client.end()
}
