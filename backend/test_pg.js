import pkg from 'pg'
const { Client } = pkg

const url = 'postgresql://postgres:W64eV21thzN3HWRW@db.sihoxmhzourqhvulgvdg.supabase.co:5432/postgres'

console.log('Tentando conectar via pg...')

const client = new Client({
  connectionString: url,
  ssl: {
    rejectUnauthorized: false
  }
})

try {
  await client.connect()
  console.log('Conectado!')
  const res = await client.query('SELECT id, nome, email, role FROM usuarios')
  console.log('Sucesso! Usuários:', res.rows)
} catch (err) {
  console.error('Erro de conexão/consulta:', err)
} finally {
  await client.end()
}
