import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './MainLayout.css';

export function MainLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="container header-content">
          <Link to="/" className="brand">
            <span className="brand-mark">CDE</span>
            <span className="brand-title">Common Data Environment</span>
          </Link>
          <div className="user-area">
            {user && (
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className="user-email">{user.email}</span>
              </div>
            )}
            <button className="btn secondary" onClick={logout}>Sair</button>
          </div>
        </div>
      </header>
      <main className="app-main">
        <div className="container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
