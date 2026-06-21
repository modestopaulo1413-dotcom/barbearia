import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, User, Clock, Check, X, AlertCircle } from 'lucide-react';
import { apiFetch } from '../services/api';
import type { Agendamento, User as UserType } from '../types';

interface DashboardProps {
  user: UserType | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    setError('');

    try {
      const endpoint = user.role === 'cliente' ? '/agendamentos/meus' : '/agendamentos';
      const response = await apiFetch<any>(endpoint);
      if (response && response.data) {
        setAgendamentos(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar agendamentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleUpdateStatus = async (id: string, newStatus: 'confirmado' | 'cancelado' | 'concluido') => {
    if (!window.confirm(`Tem certeza que deseja marcar como ${newStatus}?`)) return;

    try {
      await apiFetch(`/agendamentos/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      // Reload page data
      loadData();
    } catch (err: any) {
      alert(err.message || 'Falha ao atualizar o status do agendamento.');
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status: Agendamento['status']) => {
    switch (status) {
      case 'pendente': return <span className="badge badge-pending">Pendente</span>;
      case 'confirmado': return <span className="badge badge-confirmed">Confirmado</span>;
      case 'cancelado': return <span className="badge badge-cancelled">Cancelado</span>;
      case 'concluido': return <span className="badge badge-concluded">Concluído</span>;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Clock className="animate-spin" size={32} style={{ color: 'hsl(var(--primary))' }} />
      </div>
    );
  }

  const isCliente = user?.role === 'cliente';

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header">
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 800 }}>
            Olá, {user?.nome}!
          </h1>
          <p style={{ color: 'hsl(var(--muted))' }}>
            {isCliente 
              ? 'Gerencie seus horários marcados ou agende um novo serviço.'
              : 'Visão geral da agenda e solicitações de clientes.'
            }
          </p>
        </div>
        {isCliente && (
          <button onClick={() => navigate('/agendar')} className="btn btn-primary" style={{ gap: '0.5rem' }}>
            <Plus size={18} /> Novo Agendamento
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {!isCliente && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '0.9rem', color: 'hsl(var(--muted))' }}>Total Geral</h3>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '0.5rem' }}>{agendamentos.length}</p>
          </div>
          <div className="card">
            <h3 style={{ fontSize: '0.9rem', color: 'hsl(var(--muted))' }}>Pendentes</h3>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: 'hsl(var(--warning))', marginTop: '0.5rem' }}>
              {agendamentos.filter(a => a.status === 'pendente').length}
            </p>
          </div>
          <div className="card">
            <h3 style={{ fontSize: '0.9rem', color: 'hsl(var(--muted))' }}>Confirmados</h3>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: '#4ade80', marginTop: '0.5rem' }}>
              {agendamentos.filter(a => a.status === 'confirmado').length}
            </p>
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="card-title">
          <Calendar size={20} style={{ color: 'hsl(var(--primary))' }} />
          {isCliente ? 'Meus Agendamentos' : 'Próximos Agendamentos'}
        </h2>

        {agendamentos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'hsl(var(--muted))' }}>
            <Calendar size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
            <p>Nenhum agendamento encontrado.</p>
            {isCliente && (
              <button 
                onClick={() => navigate('/agendar')} 
                className="btn btn-secondary btn-sm" 
                style={{ marginTop: '1rem' }}
              >
                Agendar Agora
              </button>
            )}
          </div>
        ) : (
          <div className="booking-list">
            {agendamentos.map((agendamento) => (
              <div key={agendamento.id} className="booking-item">
                <div className="booking-info">
                  <div className="booking-service">
                    {agendamento.servico_nome || 'Serviço'}
                  </div>
                  <div className="booking-details">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <User size={14} /> 
                      {isCliente 
                        ? `Profissional: ${agendamento.barbeiro_nome || 'Barbeiro'}` 
                        : `Cliente: ${agendamento.cliente_nome || 'Cliente'}`
                      }
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={14} /> {formatDate(agendamento.data_hora)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={14} /> {formatTime(agendamento.data_hora)} - {formatTime(agendamento.data_hora_fim)}
                    </span>
                    {agendamento.servico_preco !== undefined && (
                      <span style={{ fontWeight: 600, color: 'hsl(var(--primary))' }}>
                        R$ {agendamento.servico_preco.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {agendamento.observacoes && (
                    <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', marginTop: '0.5rem', fontStyle: 'italic' }}>
                      Obs: {agendamento.observacoes}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {getStatusBadge(agendamento.status)}
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {/* Cliente can cancel if pending/confirmed */}
                    {isCliente && (agendamento.status === 'pendente' || agendamento.status === 'confirmado') && (
                      <button 
                        onClick={() => handleUpdateStatus(agendamento.id, 'cancelado')}
                        className="btn btn-danger btn-sm"
                        title="Cancelar Agendamento"
                      >
                        Cancelar
                      </button>
                    )}

                    {/* Barber/Admin management */}
                    {!isCliente && agendamento.status === 'pendente' && (
                      <>
                        <button 
                          onClick={() => handleUpdateStatus(agendamento.id, 'confirmado')}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '0.4rem 0.8rem', background: '#22c55e', color: '#fff' }}
                        >
                          <Check size={16} /> Confirmar
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(agendamento.id, 'cancelado')}
                          className="btn btn-danger btn-sm"
                          style={{ padding: '0.4rem 0.8rem' }}
                        >
                          <X size={16} /> Rejeitar
                        </button>
                      </>
                    )}

                    {!isCliente && agendamento.status === 'confirmado' && (
                      <>
                        <button 
                          onClick={() => handleUpdateStatus(agendamento.id, 'concluido')}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '0.4rem 0.8rem', background: '#3b82f6', color: '#fff' }}
                        >
                          <Check size={16} /> Concluir
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(agendamento.id, 'cancelado')}
                          className="btn btn-danger btn-sm"
                          style={{ padding: '0.4rem 0.8rem' }}
                        >
                          <X size={16} /> Cancelar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
