'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Shield, Loader2, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { useAdmin } from '../../contexts/admin-context';
import { toast } from 'sonner';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAdmin();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
      toast.success('Logged in successfully!');
      router.push('/dashboard');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed. Try the demo credentials below.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      await login('admin', 'admin123');
      toast.success('Welcome! Logged in with Demo Credentials.');
      router.push('/dashboard');
    } catch (err: any) {
      setError('Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setUsername('admin');
    setPassword('admin123');
    toast.info('Demo credentials filled!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-slate-950 dark:to-slate-900">
      <Card className="w-full max-w-md shadow-xl border-border">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950">
            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold">Admin Portal</CardTitle>
          <CardDescription>
            Sign in to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Demo Credentials Info Box */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-3.5 text-sm dark:border-blue-900/60 dark:bg-blue-950/40">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Demo Credentials
              </span>
              <button
                type="button"
                onClick={handleFillDemo}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 hover:underline"
              >
                Auto-fill
              </button>
            </div>
            <div className="mt-2 text-xs text-blue-800 dark:text-blue-300 space-y-1">
              <div className="flex items-center justify-between">
                <span>Username:</span>
                <code className="rounded bg-white/80 dark:bg-slate-900 px-1.5 py-0.5 font-mono font-bold text-blue-900 dark:text-blue-200 border border-blue-200/60 dark:border-blue-800">admin</code>
              </div>
              <div className="flex items-center justify-between">
                <span>Password:</span>
                <code className="rounded bg-white/80 dark:bg-slate-900 px-1.5 py-0.5 font-mono font-bold text-blue-900 dark:text-blue-200 border border-blue-200/60 dark:border-blue-800">admin123</code>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username (e.g. admin)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password (e.g. admin123)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !username || !password}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-blue-700 dark:text-blue-300"
            onClick={handleDemoLogin}
            disabled={isLoading}
          >
            <Sparkles className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
            Quick Demo Login (1-Click)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
