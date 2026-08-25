import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loader2, Lock, Mail, ShoppingCart, Package, TrendingUp, Sun, Moon } from 'lucide-react';
import AnshikaLogo from '../../assets/icon.svg';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  usePageTitle('Login');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/login', { email, password });
      login(response.data.token, response.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] bg-slate-100/60 dark:bg-slate-950 relative overflow-hidden">
      {/* Dark Mode Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-20 p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all active:scale-[0.95]"
        title={isDark ? 'Light Mode' : 'Dark Mode'}
      >
        {isDark ? (
          <Sun className="h-5 w-5 text-amber-400 transition-transform hover:rotate-45" />
        ) : (
          <Moon className="h-5 w-5 text-slate-600 transition-transform hover:-rotate-12" />
        )}
      </button>

      {/* Left — Brand Panel (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex-col items-center justify-center p-12 relative overflow-hidden border-r border-slate-800/40">
        {/* Subtle decorative mesh glow */}
        <div className="absolute top-[-100px] left-[-100px] w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 text-center text-white max-w-sm">
          {/* Logo */}
          <div className="mx-auto mb-8 w-24 h-24 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-white/20 dark:border-slate-800 shadow-2xl p-2.5 transition-transform hover:scale-105 duration-300">
            <img src={AnshikaLogo} alt="Anshika Enterprises" className="w-full h-full object-contain" />
          </div>

          <h1 className="text-3xl font-extrabold mb-2 tracking-tight text-white">Anshika Enterprises</h1>
          <p className="text-indigo-200/80 dark:text-slate-400 text-sm font-medium mb-10 tracking-wide uppercase">Power • Solar • Appliances</p>

          {/* Feature Bento Pills */}
          <div className="flex flex-col gap-3 text-left">
            {[
              { icon: ShoppingCart, label: 'Sales & Invoicing Pipeline' },
              { icon: Package, label: 'Real-time Inventory & Stock' },
              { icon: TrendingUp, label: 'Profit & Financial Analytics' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 bg-white/5 dark:bg-slate-900/50 backdrop-blur-md rounded-xl px-4 py-3 border border-white/10 dark:border-slate-800 shadow-sm transition-all hover:bg-white/10">
                <div className="w-8 h-8 bg-indigo-500/20 text-indigo-300 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-200 tracking-wide">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Mobile brand header */}
          <div className="lg:hidden flex flex-col items-center justify-center gap-2 mb-8 text-center">
            <div className="w-14 h-14 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-md p-1.5">
              <img src={AnshikaLogo} alt="Anshika Enterprises" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Anshika Enterprises</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Enterprise Management Portal</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-diffusion border border-slate-200/80 dark:border-slate-800/80 p-8 sm:p-10 transition-all">
            <div className="mb-7">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome Back</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs">Enter your credentials to access your account</p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 p-3.5 rounded-xl text-xs font-medium">
                <span className="text-red-500 font-bold mt-0.5">•</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all"
                    placeholder="name@anshika.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-sm text-sm mt-3"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-6 tracking-wide">
            Anshika Enterprises • Secure System
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
