import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import FullScreenLoader from '../../components/ui/FullScreenLoader';

export default function RequireAuth() {
  const { authed, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader label="Checking session…" />;

  if (!authed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

