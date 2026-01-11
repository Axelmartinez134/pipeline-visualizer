import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const { authed, loading, loginWithPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = useMemo(() => {
    const state = location.state as { from?: string } | null;
    return state?.from || '/linkedin/upload';
  }, [location.state]);

  useEffect(() => {
    if (loading) return;
    if (authed) navigate(from, { replace: true });
  }, [authed, from, loading, navigate]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="mx-auto flex w-full max-w-[380px] flex-col space-y-6">
          <div className="flex flex-col space-y-2 text-center">
            <div className="text-sm font-semibold tracking-tight">AutomatedBots</div>
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Enter your email and password to continue
            </p>
          </div>

          <div className="grid gap-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSubmitting(true);
                setError(null);
                try {
                  const result = await loginWithPassword(email, password);
                  if (!result.ok) {
                    setError(result.error || 'Sign-in failed.');
                    return;
                  }
                  navigate(from, { replace: true });
                } catch {
                  setError('Sign-in failed.');
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="axel@automatedbots.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-[var(--background)] border-[var(--input)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:ring-[var(--ring)]"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-[var(--background)] border-[var(--input)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:ring-[var(--ring)]"
                  />
                </div>

                {error ? <p className="text-sm text-red-600">{error}</p> : null}

                <Button type="submit" className="w-full" disabled={submitting || loading}>
                  {submitting ? 'Signing in…' : 'Sign in'}
                </Button>
              </div>
            </form>
          </div>

          <p className="px-8 text-center text-sm text-[var(--muted-foreground)]">
            Authorized access only.
          </p>
        </div>
      </div>
    </div>
  );
}
