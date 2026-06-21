import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Scissors, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { apiFetch } from '../services/api';

interface LoginProps {
  onAuthSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
        
        onAuthSuccess();
        navigate('/');
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
    setError('Falha no login com o Google.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !senha) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiFetch<any>('/auth/login', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ email, senha }),
      });

      if (response && response.data) {
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user || response.data.usuario));
        
        onAuthSuccess();
        navigate('/');
      } else {
        throw new Error('Formato de resposta do servidor inválido.');
      }
    } catch (err: any) {
      let errorMsg = err.message || 'Falha ao autenticar. Verifique suas credenciais.';
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
          <h2 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 800 }}>Bem-vindo de volta</h2>
          <p style={{ color: 'hsl(var(--muted))', fontSize: '0.9rem', marginTop: '0.25rem' }}>Entre na sua conta para gerenciar agendamentos</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
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
              disabled={loading}
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
                placeholder="Sua senha secreta"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                disabled={loading}
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
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'hsl(var(--muted))' }}>
          Não tem uma conta? <Link to="/cadastro" style={{ color: 'hsl(var(--primary))', fontWeight: 600 }}>Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
};

// Add standard keyframe spin to CSS if missing
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .animate-spin {
    animation: spin 1s linear infinite;
  }
`;
document.head.appendChild(style);
