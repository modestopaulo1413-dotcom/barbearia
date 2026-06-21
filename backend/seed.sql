-- Inserir usuário barbeiro (senha_hash para '123456')
INSERT INTO usuarios (id, nome, email, senha_hash, role, ativo)
VALUES (
  'u-barber-1', 
  'Carlos Alcantara', 
  'carlos@barber.com', 
  '$2a$10$tZ2zW4oWb8qGq6P2mQJkI.s3y3c5/rFpUexjNszuI2l1k/w7/Z6.q', 
  'barbeiro', 
  true
);

-- Inserir perfil do barbeiro com especialidades e horário de funcionamento em formato JSON
INSERT INTO barbeiros (id, usuario_id, especialidades, horario_funcionamento, ativo)
VALUES (
  'b-barber-1',
  'u-barber-1',
  '["Corte", "Barba", "Acabamento", "Degradê"]',
  '{"seg":["09:00-18:00"],"ter":["09:00-18:00"],"qua":["09:00-18:00"],"qui":["09:00-18:00"],"sex":["09:00-18:00"],"sab":["09:00-16:00"]}',
  true
);

-- Inserir serviços pertencentes a este barbeiro
INSERT INTO servicos (id, nome, descricao, duracao_minutos, preco, barbeiro_id, ativo)
VALUES (
  's-service-1',
  'Corte Clássico & Degradê',
  'Corte degradê moderno ou corte clássico na tesoura com lavagem inclusa.',
  30,
  45.0,
  'b-barber-1',
  true
);

INSERT INTO servicos (id, nome, descricao, duracao_minutos, preco, barbeiro_id, ativo)
VALUES (
  's-service-2',
  'Barboterapia',
  'Barba desenhada com navalha, toalha quente, hidratação e óleos especiais.',
  30,
  35.0,
  'b-barber-1',
  true
);

INSERT INTO servicos (id, nome, descricao, duracao_minutos, preco, barbeiro_id, ativo)
VALUES (
  's-service-3',
  'Combo Cabelo e Barba',
  'O serviço completo: Corte moderno + Barboterapia completa com desconto.',
  60,
  70.0,
  'b-barber-1',
  true
);
