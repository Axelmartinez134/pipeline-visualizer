import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = useMemo(() => {
    const state = location.state as { from?: string } | null;
    return state?.from || '/linkedin/upload';
  }, [location.state]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-white/60 text-sm">Sign in to your account to continue</p>
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="space-y-4 p-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white">Email</label>
              <Input 
                type="email" 
                placeholder="you@company.com"
                className="bg-black/50 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white">Password</label>
              <Input 
                type="password" 
                placeholder="••••••••"
                className="bg-black/50 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
            <Button
              className="w-full mt-2"
              onClick={() => {
                login();
                navigate(from, { replace: true });
              }}
            >
              Sign in
            </Button>
            <p className="text-xs text-white/40 text-center pt-2">
              Demo mode - click to continue
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
