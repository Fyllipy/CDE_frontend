import { Outlet } from 'react-router-dom';
import './AuthLayout.css';

export function AuthLayout() {
  return (
    <div className="auth-root">
      <div className="auth-card">
        <div className="auth-header">
          <span className="brand-mark">CDE</span>
          <h1>Ambiente Comum de Dados</h1>
          <p>Faça login para acessar os seus projetos e colaborar com a equipe.</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
