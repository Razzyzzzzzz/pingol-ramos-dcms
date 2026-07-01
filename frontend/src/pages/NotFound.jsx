import { Link } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';
import { Button } from '../components/ui/index.jsx';
import logo from '../assets/logo.png';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-6">
      <div className="text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white p-2 shadow-card">
          <img src={logo} alt="Pingol Ramos Dental Clinic" className="h-full w-full object-contain" />
        </span>
        <p className="mt-6 font-display text-7xl font-bold text-navy-600">404</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">Page not found</h1>
        <p className="mt-2 max-w-sm text-sm text-muted">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link to="/"><Button><Home size={18} /> Back to dashboard</Button></Link>
        </div>
      </div>
    </div>
  );
}
