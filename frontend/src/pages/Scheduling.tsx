import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Scissors, User, ChevronRight, AlertCircle, Sparkles } from 'lucide-react';
import { apiFetch } from '../services/api';
import type { Barbeiro, Servico } from '../types';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ptBR } from 'date-fns/locale';

function generateAllSlots(faixas: string[]): string[] {
  const allSlots: string[] = [];
  for (const faixa of faixas) {
    const partes = faixa.split('-');
    const inicioStr = partes[0];
    const fimStr = partes[1];
    if (!inicioStr || !fimStr) continue;

    const [iH, iM] = inicioStr.split(':').map(Number);
    const [fH, fM] = fimStr.split(':').map(Number);
    if (iH === undefined || iM === undefined || fH === undefined || fM === undefined) continue;

    let minutos = iH * 60 + iM;
    const fimMinutos = fH * 60 + fM;

    while (minutos < fimMinutos) {
      const hora = String(Math.floor(minutos / 60)).padStart(2, '0');
      const min = String(minutos % 60).padStart(2, '0');
      allSlots.push(`${hora}:${min}`);
      minutos += 30;
    }
  }
  return allSlots;
}

export const Scheduling: React.FC = () => {
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  
  // Selections
  const [selectedBarberId, setSelectedBarberId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedTime, setSelectedTime] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // UI state
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingBarbers, setLoadingBarbers] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Barber & Service, 2: Date & Time, 3: Confirm

  const navigate = useNavigate();

  // Load barbers and services
  useEffect(() => {
    const init = async () => {
      try {
        setLoadingBarbers(true);
        const [resBarbers, resServices] = await Promise.all([
          apiFetch<any>('/barbeiros'),
          apiFetch<any>('/servicos')
        ]);
        if (resBarbers && resBarbers.data) setBarbeiros(resBarbers.data);
        if (resServices && resServices.data) setServicos(resServices.data);
      } catch (err: any) {
        setError(err.message || 'Falha ao carregar dados da barbearia.');
      } finally {
        setLoadingBarbers(false);
      }
    };
    init();
  }, []);

  // Fetch slots when barber or date changes
  useEffect(() => {
    if (!selectedBarberId || !selectedDate) {
      setSlots([]);
      return;
    }

    const fetchSlots = async () => {
      setLoadingSlots(true);
      setError('');
      try {
        const response = await apiFetch<any>(`/barbeiros/${selectedBarberId}/horarios-disponiveis?data=${selectedDate}`);
        if (response && response.data) {
          setSlots(response.data.horarios || []);
        }
      } catch (err: any) {
        setError(err.message || 'Falha ao buscar horários disponíveis.');
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedBarberId, selectedDate]);

  const handleNextStep = () => {
    if (step === 1 && (!selectedBarberId || !selectedServiceId)) {
      setError('Por favor, selecione o profissional e o serviço.');
      return;
    }
    if (step === 2 && !selectedTime) {
      setError('Por favor, escolha um horário disponível.');
      return;
    }
    setError('');
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setError('');
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    // Combine date and time (using local timezone structure)
    // E.g., '2026-06-21T09:00:00' -> parsed locally by backend Date class
    const localDateTimeStr = `${selectedDate}T${selectedTime}:00`;

    try {
      await apiFetch('/agendamentos', {
        method: 'POST',
        body: JSON.stringify({
          barbeiroId: selectedBarberId,
          servicoId: selectedServiceId,
          dataHora: localDateTimeStr,
          observacoes: observacoes || undefined
        })
      });

      alert('Agendamento solicitado com sucesso!');
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Falha ao criar o agendamento. Tente outro horário.');
      setStep(2); // Go back to time selection
    } finally {
      setSubmitting(false);
    }
  };

  const barber = barbeiros.find(b => b.id === selectedBarberId);
  const service = servicos.find(s => s.id === selectedServiceId);

  const diasSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const;
  const dataObj = new Date(selectedDate + 'T12:00:00');
  const diaSemana = diasSemana[dataObj.getDay()];

  const allDaySlots = barber?.horario_funcionamento?.[diaSemana]
    ? generateAllSlots(barber.horario_funcionamento[diaSemana])
    : [];

  // Filter services by barber (only show services configured for the selected barber)
  const filteredServices = servicos.filter(s => s.barbeiro_id === selectedBarberId);

  if (loadingBarbers) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Clock className="animate-spin" size={32} style={{ color: 'hsl(var(--primary))' }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Sparkles size={24} style={{ color: 'hsl(var(--primary))' }} /> Novo Agendamento
      </h1>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Step Indicators */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <div style={{ flex: 1, padding: '0.75rem', borderBottom: `2px solid ${step >= 1 ? 'hsl(var(--primary))' : 'hsl(var(--card-border))'}`, fontWeight: step >= 1 ? 'bold' : 'normal', color: step >= 1 ? '#fff' : 'hsl(var(--muted))', minWidth: '150px' }}>
          1. Profissional & Serviço
        </div>
        <div style={{ flex: 1, padding: '0.75rem', borderBottom: `2px solid ${step >= 2 ? 'hsl(var(--primary))' : 'hsl(var(--card-border))'}`, fontWeight: step >= 2 ? 'bold' : 'normal', color: step >= 2 ? '#fff' : 'hsl(var(--muted))', minWidth: '150px' }}>
          2. Data & Horário
        </div>
        <div style={{ flex: 1, padding: '0.75rem', borderBottom: `2px solid ${step >= 3 ? 'hsl(var(--primary))' : 'hsl(var(--card-border))'}`, fontWeight: step >= 3 ? 'bold' : 'normal', color: step >= 3 ? '#fff' : 'hsl(var(--muted))', minWidth: '150px' }}>
          3. Confirmação
        </div>
      </div>

      {/* STEP 1: Barber & Service */}
      {step === 1 && (
        <div className="card">
          <h2 className="card-title">
            <User size={20} style={{ color: 'hsl(var(--primary))' }} /> Escolha o Profissional
          </h2>
          <div className="barber-grid">
            {barbeiros.map(b => (
              <div 
                key={b.id} 
                className={`selection-card ${selectedBarberId === b.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedBarberId(b.id);
                  setSelectedServiceId(''); // Reset service when changing barber
                }}
              >
                <div className="barber-avatar">
                  {b.nome ? b.nome.substring(0, 2).toUpperCase() : 'B'}
                </div>
                <h3 style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>{b.nome || 'Barbeiro'}</h3>
                <p style={{ color: 'hsl(var(--muted))', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  {b.especialidades.join(' • ')}
                </p>
              </div>
            ))}
          </div>

          {selectedBarberId && (
            <div className="animate-fade-in" style={{ marginTop: '2rem' }}>
              <h2 className="card-title">
                <Scissors size={20} style={{ color: 'hsl(var(--primary))' }} /> Escolha o Serviço
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                {filteredServices.length === 0 ? (
                  <p style={{ color: 'hsl(var(--muted))', fontSize: '0.9rem' }}>Nenhum serviço disponível para este barbeiro.</p>
                ) : (
                  filteredServices.map(s => (
                    <div 
                      key={s.id} 
                      className={`selection-card service-selection-card ${selectedServiceId === s.id ? 'selected' : ''}`}
                      onClick={() => setSelectedServiceId(s.id)}
                    >
                      <div>
                        <h4 style={{ fontWeight: 700, color: '#fff' }}>{s.nome}</h4>
                        {s.descricao && <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginTop: '0.25rem' }}>{s.descricao}</p>}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'hsl(var(--muted))', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                          <Clock size={12} /> {s.duracao_minutos} min
                        </span>
                      </div>
                      <div className="service-price">
                        R$ {s.preco.toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button 
              className="btn btn-primary" 
              onClick={handleNextStep}
              disabled={!selectedBarberId || !selectedServiceId}
              style={{ gap: '0.5rem' }}
            >
              Próximo <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Date & Time */}
      {step === 2 && (
        <div className="card">
          <h2 className="card-title">
            <Calendar size={20} style={{ color: 'hsl(var(--primary))' }} /> Selecione a Data
          </h2>
          <div className="form-group custom-datepicker-wrapper">
            <DatePicker
              selected={new Date(selectedDate + 'T12:00:00')}
              onChange={(date: Date | null) => {
                if (date) {
                  const yyyy = date.getFullYear();
                  const mm = String(date.getMonth() + 1).padStart(2, '0');
                  const dd = String(date.getDate()).padStart(2, '0');
                  setSelectedDate(`${yyyy}-${mm}-${dd}`);
                  setSelectedTime('');
                }
              }}
              minDate={new Date()}
              locale={ptBR}
              dateFormat="dd/MM/yyyy"
              className="form-input"
              placeholderText="Escolha o dia"
              wrapperClassName="w-full"
              calendarClassName="dark-calendar"
            />
          </div>

          <div style={{ marginTop: '2rem' }}>
            <h2 className="card-title">
              <Clock size={20} style={{ color: 'hsl(var(--primary))' }} /> Horários Disponíveis
            </h2>

            {loadingSlots ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <Clock className="animate-spin" size={24} style={{ color: 'hsl(var(--primary))' }} />
              </div>
            ) : allDaySlots.length === 0 ? (
              <p style={{ color: 'hsl(var(--muted))', textAlign: 'center', padding: '1.5rem 0' }}>
                Nenhum horário de funcionamento cadastrado para este dia.
              </p>
            ) : (
              <div className="slots-grid">
                {allDaySlots.map(t => {
                  const isAvailable = slots.includes(t);
                  const isSelected = selectedTime === t;
                  return (
                    <button 
                      key={t}
                      disabled={!isAvailable}
                      className={`slot-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => isAvailable && setSelectedTime(t)}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
            <button className="btn btn-secondary" onClick={handlePrevStep}>Voltar</button>
            <button 
              className="btn btn-primary" 
              onClick={handleNextStep}
              disabled={!selectedTime}
              style={{ gap: '0.5rem' }}
            >
              Revisar Agendamento <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Confirm */}
      {step === 3 && (
        <div className="card">
          <h2 className="card-title" style={{ border: 'none', marginBottom: '0.5rem' }}>
            Confirme as informações do seu agendamento
          </h2>
          <p style={{ color: 'hsl(var(--muted))', marginBottom: '2rem' }}>
            Por favor, confira os detalhes antes de concluir a reserva.
          </p>

          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid hsl(var(--card-border))', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'hsl(var(--muted))', fontWeight: 600 }}>Profissional:</span>
                <span style={{ color: '#fff', fontWeight: 700 }}>{barber?.nome}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'hsl(var(--muted))', fontWeight: 600 }}>Serviço:</span>
                <span style={{ color: '#fff', fontWeight: 700 }}>{service?.nome}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'hsl(var(--muted))', fontWeight: 600 }}>Duração:</span>
                <span style={{ color: '#fff', fontWeight: 700 }}>{service?.duracao_minutos} minutos</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'hsl(var(--muted))', fontWeight: 600 }}>Valor:</span>
                <span style={{ color: 'hsl(var(--primary))', fontWeight: 800 }}>R$ {service?.preco.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'hsl(var(--muted))', fontWeight: 600 }}>Data e Hora:</span>
                <span style={{ color: '#fff', fontWeight: 700 }}>
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')} às {selectedTime}
                </span>
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label" htmlFor="obs">Observações (opcional)</label>
            <textarea
              id="obs"
              rows={3}
              className="form-input"
              style={{ resize: 'vertical' }}
              placeholder="Ex: Tenho preferência por tesoura, alguma alergia, etc."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={handlePrevStep} disabled={submitting}>Voltar</button>
            <button 
              className="btn btn-primary" 
              onClick={handleSubmit}
              disabled={submitting}
              style={{ gap: '0.5rem' }}
            >
              {submitting ? 'Finalizando...' : 'Confirmar Agendamento'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
