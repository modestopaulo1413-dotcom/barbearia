import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Scheduling } from './pages/Scheduling';
import { apiFetch } from './services/api';
import type { User } from './types';
import './App.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const loadUser = async () => {
    const token = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');

    if (!token) {
      setUser(null);
      setCheckingAuth(false);
      return;
    }

    if (storedUser && storedUser !== 'undefined') {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error('Falha ao processar dados de sessão salvos:', err);
        localStorage.removeItem('user');
      }
    }

    try {
      // Validate token and fetch fresh user details
      const response = await apiFetch<any>('/auth/me');
      if (response && response.data) {
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      }
    } catch (err) {
      console.error('Falha ao autenticar sessão ativa:', err);
      // If error is authentication/unauthorized, apiFetch already handles logout
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    loadUser();

    // Listen to manual sign-out events (e.g. from apiFetch refresh failure)
    const handleAuthChange = () => {
      const stored = localStorage.getItem('user');
      if (stored && stored !== 'undefined') {
        try {
          setUser(JSON.parse(stored));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  if (checkingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(245,158,11,0.2)', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: 'hsl(var(--muted))', fontSize: '0.9rem' }}>Carregando sessão...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-container">
        <Navbar user={user} />
        
        <main className="main-content">
          <Routes>
            {/* Public routes */}
            <Route 
              path="/login" 
              element={user ? <Navigate to="/" replace /> : <Login onAuthSuccess={loadUser} />} 
            />
            <Route 
              path="/cadastro" 
              element={user ? <Navigate to="/" replace /> : <Register />} 
            />

            {/* Protected routes */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute user={user}>
                  <Dashboard user={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/agendar" 
              element={
                <ProtectedRoute user={user} allowedRoles={['cliente']}>
                  <Scheduling />
                </ProtectedRoute>
              } 
            />

            {/* Fallback redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
