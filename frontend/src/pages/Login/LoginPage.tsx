import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { ApiError } from '../../api/client';

type AuthMode = 'signin' | 'create';

export function LoginPage() {
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === 'create' && password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        await register(fullName, email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : mode === 'create' ? 'Unable to create your account. Please try again.' : 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const creating = mode === 'create';

  return (
    <div className="login-screen">
      <div className="login-hero">
        <div className="login-hero-brand">
          <span className="sidebar-brand-mark" aria-hidden="true" />
          <strong>CellBase</strong>
        </div>

        <div className="login-hero-copy">
          <h1>Every flask, incubator, and passage — tracked in one place.</h1>
          <p>
            Digitize monitoring, media prep, scheduling, and experiment records so your whole team works from
            the same bench log.
          </p>
        </div>

        <div className="login-hero-readouts">
          <div><span className="value readout">37.0°C</span><span className="label">Incubator A target</span></div>
          <div><span className="value readout">5.0%</span><span className="label">CO₂ target</span></div>
          <div><span className="value readout">P12</span><span className="label">Latest passage</span></div>
        </div>
      </div>

      <div className="login-form-side">
        <div className="login-card">
          <div className="login-tabs" role="tablist" aria-label="Account options">
            <button type="button" role="tab" aria-selected={!creating} className={!creating ? 'active' : ''} onClick={() => changeMode('signin')}>
              Sign in
            </button>
            <button type="button" role="tab" aria-selected={creating} className={creating ? 'active' : ''} onClick={() => changeMode('create')}>
              Create account
            </button>
          </div>

          <h2>{creating ? 'Join your lab' : 'Welcome back'}</h2>
          <p className="sub">{creating ? 'Create your account to start using CellBase.' : 'Sign in to open your laboratory workspace.'}</p>

          {error && <div className="form-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            {creating && (
              <div className="form-field">
                <label htmlFor="full-name">Full name</label>
                <input
                  id="full-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
            )}
            <div className="form-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@lab.edu"
              />
            </div>
            <div className="form-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete={creating ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={creating ? 'At least 8 characters' : 'Enter your password'}
              />
            </div>
            {creating && (
              <div className="form-field">
                <label htmlFor="confirm-password">Confirm password</label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Enter your password again"
                />
              </div>
            )}
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? creating ? 'Creating account…' : 'Signing in…' : creating ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div className="login-hint">
            {creating ? (
              <>New accounts receive researcher access. In a fresh database, the first account becomes the admin.</>
            ) : (
              <>First time here? Create an account. Your access is based on your assigned lab role.</>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
