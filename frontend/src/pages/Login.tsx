import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loader2, Lock, Mail, ShoppingCart, Package, TrendingUp } from 'lucide-react';
import AnshikaLogo from '../../assets/icon.svg';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
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
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Left — Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-800 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background decorative circles */}
        <div className="absolute top-[-80px] left-[-80px] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-60px] right-[-60px] w-80 h-80 bg-violet-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-[-40px] w-48 h-48 bg-indigo-300/20 rounded-full blur-2xl" />

        <div className="relative z-10 text-center text-white max-w-sm">
          {/* Logo */}
          <div className="mx-auto mb-8 w-28 h-28 bg-white rounded-2xl flex items-center justify-center border border-white/30 shadow-2xl p-2">
            <img src={AnshikaLogo} alt="Anshika Enterprises Logo" className="w-full h-full object-contain" />
          </div>

          <h1 className="text-4xl font-bold mb-3 tracking-tight">Anshika<br />Enterprises</h1>
          <p className="text-indigo-200 text-lg mb-12">Power • Solar • Appliances</p>

          {/* Feature pills */}
          <div className="flex flex-col gap-4 text-left">
            {[
              { icon: ShoppingCart, label: 'Sales & Purchase Tracking' },
              { icon: Package, label: 'Inventory Management' },
              { icon: TrendingUp, label: 'Profit & Reports Analytics' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-indigo-100">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm p-1">
              <img src={AnshikaLogo} alt="Anshika Enterprises" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">Anshika Enterprises</h1>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back 👋</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Sign in to your account to continue</p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-3.5 rounded-xl text-sm">
                <span className="text-red-500 mt-0.5">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
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
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-md shadow-indigo-200 dark:shadow-indigo-900/40 text-sm mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Sign In →'
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Anshika Enterprises Management System
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
