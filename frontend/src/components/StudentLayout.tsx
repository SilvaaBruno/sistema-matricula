import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function StudentLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="shell">
      <header className="topbar">
        <strong>Matrícula</strong>
        <span className="topbar-user">
          {user?.name}
          <button className="btn btn-small" onClick={logout}>
            Sair
          </button>
        </span>
        <nav className="tabs" aria-label="Menu do aluno">
          <NavLink to="ofertas">Ofertas</NavLink>
          <NavLink to="matriculas">Minhas matrículas</NavLink>
        </nav>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
