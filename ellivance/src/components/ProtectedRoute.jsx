import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function ProtectedRoute({ adminOnly = false, children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="page">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !profile?.is_admin) return <Navigate to="/dashboard" replace />;
  return children;
}
