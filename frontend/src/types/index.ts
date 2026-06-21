export type UserRole = 'admin' | 'barbeiro' | 'cliente';

export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Barbeiro {
  id: string;
  usuario_id: string;
  nome?: string; // Joint from user
  email?: string;
  especialidades: string[]; // parsed from JSON
  horario_funcionamento: Record<string, string[]>; // parsed from JSON
  ativo: boolean;
}

export interface Cliente {
  id: string;
  usuario_id: string;
  nome?: string;
  email?: string;
  telefone: string;
}

export interface Servico {
  id: string;
  nome: string;
  descricao?: string;
  duracao_minutos: number;
  preco: number;
  barbeiro_id: string;
  ativo: boolean;
}

export interface Agendamento {
  id: string;
  cliente_id: string;
  barbeiro_id: string;
  servico_id: string;
  data_hora: string;
  data_hora_fim: string;
  status: 'pendente' | 'confirmado' | 'cancelado' | 'concluido';
  observacoes?: string;
  criado_em: string;
  atualizado_em: string;
  // Extra fields when joined
  cliente_nome?: string;
  barbeiro_nome?: string;
  servico_nome?: string;
  servico_preco?: number;
  servico_duracao?: number;
}
