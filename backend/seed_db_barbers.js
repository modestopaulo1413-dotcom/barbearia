import pkg from 'pg'
const { Client } = pkg

const url = 'postgresql://postgres:W64eV21thzN3HWRW@db.sihoxmhzourqhvulgvdg.supabase.co:5432/postgres'

console.log('Iniciando conexão com o banco para semear barbeiros e serviços...')

const client = new Client({
  connectionString: url,
  ssl: {
    rejectUnauthorized: false
  }
})

// Senha padrão '123456' hashada
const senhaHash = '$2a$10$tZ2zW4oWb8qGq6P2mQJkI.s3y3c5/rFpUexjNszuI2l1k/w7/Z6.q'

const schedule = JSON.stringify({
  ter: ['09:00-19:00'],
  qua: ['09:00-19:00'],
  qui: ['09:00-19:00'],
  sex: ['09:00-19:00'],
  sab: ['09:00-16:00']
})

const barbeirosData = [
  {
    userId: 'u-barber-1',
    barberId: 'b-barber-1',
    nome: 'Carlos Alcantara',
    email: 'carlos@barber.com',
    especialidades: JSON.stringify(['Corte', 'Barba', 'Acabamento', 'Degradê']),
    servicos: [
      { id: 's-service-11', nome: 'Corte Clássico & Degradê', descricao: 'Corte degradê moderno ou corte clássico na tesoura com lavagem inclusa.', duracao: 30, preco: 45.0 },
      { id: 's-service-12', nome: 'Barboterapia', descricao: 'Barba desenhada com navalha, toalha quente, hidratação e óleos.', duracao: 30, preco: 35.0 },
      { id: 's-service-13', nome: 'Combo Cabelo e Barba', descricao: 'O serviço completo: Corte moderno + Barboterapia completa com desconto.', duracao: 60, preco: 70.0 }
    ]
  },
  {
    userId: 'u-barber-2',
    barberId: 'b-barber-2',
    nome: 'Rodrigo Silva',
    email: 'rodrigo@barber.com',
    especialidades: JSON.stringify(['Degradê', 'Pigmentação', 'Platinado', 'Risquinho']),
    servicos: [
      { id: 's-service-21', nome: 'Corte Degradê Navalhado', descricao: 'Corte degradê na navalha com acabamento premium.', duracao: 40, preco: 50.0 },
      { id: 's-service-22', nome: 'Pigmentação de Barba', descricao: 'Alinhamento e preenchimento de falhas na barba com pigmento.', duracao: 20, preco: 25.0 },
      { id: 's-service-23', nome: 'Platinado Global', descricao: 'Descoloração e tonalização completa (cabelo nevado).', duracao: 120, preco: 120.0 }
    ]
  },
  {
    userId: 'u-barber-3',
    barberId: 'b-barber-3',
    nome: 'Marcos Souza',
    email: 'marcos@barber.com',
    especialidades: JSON.stringify(['Corte Infantil', 'Sobrancelha', 'Higienização Capilar']),
    servicos: [
      { id: 's-service-31', nome: 'Corte Infantil', descricao: 'Corte de cabelo infantil com atendimento paciente e lúdico.', duracao: 30, preco: 35.0 },
      { id: 's-service-32', nome: 'Design de Sobrancelha', descricao: 'Limpeza e desenho de sobrancelha na navalha ou pinça.', duracao: 15, preco: 20.0 },
      { id: 's-service-33', nome: 'Selagem Capilar', descricao: 'Tratamento redutor de volume e alinhamento capilar.', duracao: 90, preco: 90.0 }
    ]
  }
]

async function seed() {
  try {
    await client.connect()
    console.log('Conectado ao Supabase.')

    // Limpa dados antigos de barbeiros e serviços de teste para evitar chaves duplicadas
    console.log('Limpando barbeiros de teste antigos...')
    const userIds = barbeirosData.map(b => `'${b.userId}'`).join(',')
    
    // Deletar serviços e barbeiros associados
    await client.query(`DELETE FROM servicos WHERE barbeiro_id IN (SELECT id FROM barbeiros WHERE usuario_id IN (${userIds}))`)
    await client.query(`DELETE FROM barbeiros WHERE usuario_id IN (${userIds})`)
    await client.query(`DELETE FROM usuarios WHERE id IN (${userIds})`)

    for (const barber of barbeirosData) {
      console.log(`Inserindo usuário: ${barber.nome}...`)
      await client.query(
        `INSERT INTO usuarios (id, nome, email, senha_hash, role, ativo) VALUES ($1, $2, $3, $4, 'barbeiro', true)`,
        [barber.userId, barber.nome, barber.email, senhaHash]
      )

      console.log(`Inserindo perfil de barbeiro: ${barber.nome}...`)
      await client.query(
        `INSERT INTO barbeiros (id, usuario_id, especialidades, horario_funcionamento, ativo) VALUES ($1, $2, $3, $4, true)`,
        [barber.barberId, barber.userId, barber.especialidades, schedule]
      )

      for (const service of barber.servicos) {
        console.log(`Inserindo serviço: ${service.nome}...`)
        await client.query(
          `INSERT INTO servicos (id, nome, descricao, duracao_minutos, preco, barbeiro_id, ativo) VALUES ($1, $2, $3, $4, $5, $6, true)`,
          [service.id, service.nome, service.descricao, service.duracao, service.preco, barber.barberId]
        )
      }
    }

    console.log('Banco de dados semeado com sucesso!')
  } catch (err) {
    console.error('Erro ao semear o banco:', err)
  } finally {
    await client.end()
  }
}

seed()
