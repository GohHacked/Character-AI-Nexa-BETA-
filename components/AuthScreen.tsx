import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, ArrowRight, Sparkles, Eye, EyeOff } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (email: string, password: string) => void;
  onRegister: (email: string, username: string, password: string) => void;
  error?: string;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onRegister, error }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoginMode) {
      onLogin(email, password);
    } else {
      onRegister(email, username, password);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-surface/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10 animate-fade-in-up">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-accent mb-4 shadow-lg shadow-primary/30">
            <Sparkles className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Character AI Nexa</h1>
          <p className="text-gray-400 text-sm">
            {isLoginMode ? 'С возвращением! Войдите в аккаунт.' : 'Создайте аккаунт и начните общение.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center font-medium animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="relative group">
              <Mail className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-primary transition-colors" size={20} />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-surfaceHighlight/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 focus:bg-surfaceHighlight transition-all"
              />
            </div>

            {!isLoginMode && (
              <div className="relative group animate-fade-in">
                <UserIcon className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-primary transition-colors" size={20} />
                <input
                  type="text"
                  placeholder="Имя пользователя (Никнейм)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required={!isLoginMode}
                  className="w-full bg-surfaceHighlight/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 focus:bg-surfaceHighlight transition-all"
                />
              </div>
            )}

            <div className="relative group">
              <Lock className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-primary transition-colors" size={20} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-surfaceHighlight/50 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white focus:outline-none focus:border-primary/50 focus:bg-surfaceHighlight transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-gray-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-primary hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 mt-6"
          >
            {isLoginMode ? 'Войти' : 'Создать аккаунт'}
            <ArrowRight size={20} />
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            {isLoginMode ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
            <button
              onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }}
              className="ml-2 text-primary font-medium hover:underline focus:outline-none"
            >
              {isLoginMode ? 'Регистрация' : 'Войти'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

function setError(arg0: string) {
    throw new Error('Function not implemented.');
}
