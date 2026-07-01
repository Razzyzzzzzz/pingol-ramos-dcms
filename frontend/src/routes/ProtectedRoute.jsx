import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loading } from '../components/ui/index.jsx';

/**
 * Guards routes behind authentication (and optionally a set of roles).
 * - While the auth context is still verifying a stored token, show a spinner.
 * - If not signed in, bounce to /login and remember where we came from.
 * - If a `roles` list is given and the user isn't in it, send them home.
 */
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, booting, role } = useAuth();
  const location = useLocation();

  if (booting) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <Loading label="Preparing your workspace…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && roles.length && !roles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
