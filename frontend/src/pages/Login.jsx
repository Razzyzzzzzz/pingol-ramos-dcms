import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowLeft, LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authApi } from '../services/endpoints';
import { getMessage } from '../lib/api';
import { Button, Field, Input, Spinner } from '../components/ui/index.jsx';
import logo from '../assets/logo.png';

export default function Login() {
  const { login, isAuthenticated, booting } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Already signed in? Don't show the login screen.
  if (!booting && isAuthenticated) return <Navigate to={from} replace />;

  const submitLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      const user = await login(email.trim(), password, remember);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getMessage(err, 'Unable to sign in.'));
    } finally {
      setBusy(false);
    }
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Enter the email tied to your account.');
      return;
    }
    setBusy(true);
    try {
      await authApi.forgotPassword(email.trim());
      toast.success('If that email exists, a reset link has been generated.');
      setMode('login');
    } catch (err) {
      // Endpoint is intentionally generic; surface success-style messaging.
      toast.success('If that email exists, a reset link has been generated.');
      setMode('login');
      void err;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      {/* Brand / hero panel */}
      <div className="relative hidden overflow-hidden bg-navy-700 lg:block">
        <div className="absolute inset-0 opacity-20" style={heroPattern} />
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-lime-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 translate-x-1/3 translate-y-1/3 rounded-full bg-navy-400/30 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white p-1.5 shadow-pop">
              <img src={logo} alt="Pingol Ramos Dental Clinic" className="h-full w-full object-contain" />
            </span>
            <div className="leading-tight">
              <p className="font-display text-lg font-bold">Pingol Ramos</p>
              <p className="text-sm text-white/70">Dental Clinic</p>
            </div>
          </div>

          <div className="max-w-md">
            <h1 className="font-display text-4xl font-bold leading-tight">
              Clinic management,<br />beautifully organised.
            </h1>
            <p className="mt-4 text-white/70">
              Appointments, patient records, inventory, and revenue — all in one
              secure, modern workspace built for your practice.
            </p>
            <div className="mt-8 flex items-center gap-2 text-sm text-white/60">
              <ShieldCheck size={18} className="text-lime-400" />
              Encrypted sessions · Role-based access
            </div>
          </div>

          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Pingol Ramos Dental Clinic. All rights reserved.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-canvas px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white p-2 shadow-card">
              <img src={logo} alt="Pingol Ramos Dental Clinic" className="h-full w-full object-contain" />
            </span>
            <p className="mt-3 font-display text-lg font-bold text-ink">Pingol Ramos Dental Clinic</p>
          </div>

          {mode === 'login' ? (
            <>
              <h2 className="font-display text-2xl font-bold text-ink">Sign in</h2>
              <p className="mt-1 text-sm text-muted">Welcome back. Please enter your details.</p>

              <form onSubmit={submitLogin} className="mt-8 space-y-4">
                <Field label="Email address" htmlFor="email">
                  <div className="relative">
                    <Mail size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@pingolramos.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </Field>

                <Field label="Password" htmlFor="password">
                  <div className="relative">
                    <Lock size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <Input
                      id="password"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="px-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-ink"
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </Field>

                <div className="flex items-center justify-between">
                  <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-line text-navy-600 focus:ring-navy-500"
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(''); }}
                    className="text-sm font-medium text-navy-600 transition hover:text-navy-700"
                  >
                    Forgot password?
                  </button>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" loading={busy}>
                  <LogIn size={18} /> Sign in
                </Button>
              </form>

              <div className="mt-6 rounded-xl border border-line bg-white/60 p-4 text-xs text-muted">
                <p className="font-semibold text-ink">Demo credentials</p>
                <p className="mt-1">Admin · admin@pingolramos.com / Admin@123</p>
                <p>Dentist · dentist@pingolramos.com / Dentist@123</p>
                <p>Staff · staff@pingolramos.com / Staff@123</p>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); }}
                className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink"
              >
                <ArrowLeft size={16} /> Back to sign in
              </button>
              <h2 className="font-display text-2xl font-bold text-ink">Reset password</h2>
              <p className="mt-1 text-sm text-muted">
                Enter your account email and we'll generate a reset link.
              </p>

              <form onSubmit={submitForgot} className="mt-8 space-y-4">
                <Field label="Email address" htmlFor="femail">
                  <div className="relative">
                    <Mail size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <Input
                      id="femail"
                      type="email"
                      autoComplete="email"
                      placeholder="you@pingolramos.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </Field>

                {error && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" loading={busy}>
                  {busy ? <Spinner size={18} /> : 'Send reset link'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const heroPattern = {
  backgroundImage:
    'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)',
  backgroundSize: '28px 28px',
};
