import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Scissors, User, Mail, Lock, Phone, Loader2, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { apiFetch } from '../services/api';

export const Register: React.FC = () => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch<any>('/auth/google', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      if (response && response.data) {
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user || response.data.usuario));
        
        window.location.href = '/';
      } else {
        throw new Error('Formato de resposta do servidor inválido.');
      }
    } catch (err: any) {
      setError('Falha ao autenticar com Google. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Falha no cadastro com o Google.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email || !senha || !telefone) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiFetch<any>('/auth/register', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ nome, email, senha, telefone }),
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      let errorMsg = err.message || 'Falha no cadastro. Verifique os dados ou tente outro e-mail.';
      try {
        const parsed = JSON.parse(errorMsg);
        if (Array.isArray(parsed)) {
          errorMsg = parsed.map((e: any) => e.message).filter(Boolean).join(' | ');
        }
      } catch (e) {
        // Not a JSON string
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card-auth animate-fade-in">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            padding: '1rem',
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.1)',
            color: 'hsl(var(--primary))',
            marginBottom: '1rem'
          }}>
            <Scissors size={32} />
          </div>
          <h2 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 800 }}>Crie sua conta</h2>
          <p style={{ color: 'hsl(var(--muted))', fontSize: '0.9rem', marginTop: '0.25rem' }}>Agende cortes em poucos cliques</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <span>Cadastro realizado! Redirecionando para login...</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="filled_black"
            text="continue_with"
            shape="rectangular"
          />
        </div>

        <div style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', textAlign: 'center', color: 'hsl(var(--muted))' }}>
          <div style={{ flex: 1, borderTop: '1px solid rgba(255,255,255,0.1)' }}></div>
          <span style={{ padding: '0 10px', fontSize: '0.85rem' }}>OU</span>
          <div style={{ flex: 1, borderTop: '1px solid rgba(255,255,255,0.1)' }}></div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="nome">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={14} /> Nome Completo
              </span>
            </label>
            <input
              id="nome"
              type="text"
              className="form-input"
              placeholder="Seu nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={loading || success}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={14} /> E-mail
              </span>
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="exemplo@barbearia.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || success}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="telefone">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Phone size={14} /> Telefone / WhatsApp
              </span>
            </label>
            <input
              id="telefone"
              type="tel"
              className="form-input"
              placeholder="(11) 99999-9999"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              disabled={loading || success}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label" htmlFor="senha">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Lock size={14} /> Senha
              </span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="senha"
                type={showPassword ? "text" : "password"}
                className="form-input"
                placeholder="Crie uma senha forte"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                disabled={loading || success}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'hsl(var(--muted))',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', gap: '0.5rem' }}
            disabled={loading || success}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Cadastrando...
              </>
            ) : (
              'Criar Conta'
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'hsl(var(--muted))' }}>
          Já tem uma conta? <Link to="/login" style={{ color: 'hsl(var(--primary))', fontWeight: 600 }}>Faça Login</Link>
        </p>
      </div>
    </div>
  );
};
