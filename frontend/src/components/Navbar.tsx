import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Scissors, LogOut, Calendar, User, LayoutDashboard } from 'lucide-react';
import { logoutUser } from '../services/api';
import type { User as UserType } from '../types';

interface NavbarProps {
  user: UserType | null;
}

export const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="navbar animate-fade-in">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <Scissors size={24} />
          <span>BarberApp</span>
        </Link>

        <div className="navbar-links">
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <LayoutDashboard size={18} />
              Painel
            </span>
          </Link>

          {user.role === 'cliente' && (
            <Link 
              to="/agendar" 
              className={`nav-link ${location.pathname === '/agendar' ? 'active' : ''}`}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={18} />
                Agendar
              </span>
            </Link>
          )}

          <div className="navbar-user-section">
            <span className="navbar-user-name">
              <User size={16} style={{ color: 'hsl(var(--primary))' }} />
              {user.nome} ({user.role})
            </span>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm" title="Sair">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
