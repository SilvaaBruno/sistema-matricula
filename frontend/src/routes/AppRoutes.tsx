import { Navigate, Route, Routes } from 'react-router-dom';
import { StudentLayout } from '../components/StudentLayout';
import { SecretaryLayout } from '../components/SecretaryLayout';
import { homeOf, useAuth } from '../contexts/AuthContext';
import { LoginPage } from '../pages/LoginPage';
import { OffersPage } from '../pages/student/OffersPage';
import { EnrollmentsPage } from '../pages/student/EnrollmentsPage';
import { RequireRole } from './RequireRole';

export function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={homeOf(user.role)} replace /> : <LoginPage />} />
      <Route
        path="/aluno"
        element={
          <RequireRole role="STUDENT">
            <StudentLayout />
          </RequireRole>
        }
      >
        <Route index element={<Navigate to="ofertas" replace />} />
        <Route path="ofertas" element={<OffersPage />} />
        <Route path="matriculas" element={<EnrollmentsPage />} />
      </Route>
      <Route
        path="/secretaria"
        element={
          <RequireRole role="SECRETARY">
            <SecretaryLayout />
          </RequireRole>
        }
      >
        <Route index element={<p className="muted">Bem-vindo(a)! As telas desta área chegam nas próximas etapas.</p>} />
      </Route>
      <Route path="*" element={<Navigate to={user ? homeOf(user.role) : '/login'} replace />} />
    </Routes>
  );
}
