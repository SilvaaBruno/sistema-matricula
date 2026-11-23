import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function SecretaryLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="shell shell-secretary">
      <aside className="sidebar">
        <strong>Secretaria</strong>
        <nav className="side-nav" aria-label="Menu da secretaria">
          <NavLink to="disciplinas">Disciplinas</NavLink>
          <NavLink to="professores">Professores</NavLink>
        </nav>
        <div className="sidebar-user">
          <span>{user?.name}</span>
          <button className="btn btn-small" onClick={logout}>
            Sair
          </button>
        </div>
      </aside>
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
