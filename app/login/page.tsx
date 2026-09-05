'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Lock, User, ArrowRight, Sparkles, Globe } from 'lucide-react';
import { dict } from '@/lib/translations';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Impostiamo l'inglese ('en') come lingua predefinita della schermata di login
  const [currentLang, setCurrentLang] = useState('en');
  const t = dict[currentLang] || dict['en'];

  async function handleLoginDemo() {
    const { error } = await supabase.auth.signInWithPassword({
      email: 'demo@parrocchia.it', 
      password: 'sassari01', 
    });

    if (error) {
      alert('Errore accesso demo: ' + error.message);
    } else {
      router.push('/'); 
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const cleanInput = username.trim().toLowerCase();
    
    const emailLogin = cleanInput.includes('@')
      ? cleanInput
      : `${cleanInput}@parrocchia.it`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailLogin,
      password: password,
    });

    if (error) {
      setErrorMsg(`Errore Accesso / Login Error: ${error.message}`);
      setLoading(false);
    } else {
      // Una volta loggato, la dashboard leggerà automaticamente 
      // il campo 'lingua' associato all'utente nel database (tabella profili)!
      router.push('/');
      router.refresh();
    }
  }

  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 p-8 md:p-10 relative">
          
          {/* Selettore di Lingua integrato nel box di login */}
          <div className="absolute top-6 right-6 flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl text-slate-700 text-xs shadow-sm">
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={currentLang}
              onChange={(e) => setCurrentLang(e.target.value)}
              className="bg-transparent text-slate-800 outline-none cursor-pointer font-semibold"
            >
              <option value="en">English</option>
              <option value="it">Italiano</option>
              <option value="es">Español</option>
            </select>
          </div>

          {/* Header Lumen */}
          <div className="flex flex-col items-center text-center mb-8 pt-2">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white mb-3">
              <Sparkles className="w-8 h-8" />
            </div>
            <span className="text-[11px] font-bold tracking-widest text-blue-600 uppercase mb-1">
              {t.subtitle}
            </span>
            <h1 className="text-3xl font-serif font-extrabold text-slate-900">
              Lumen
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {t.titleDescription}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl text-center font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                {t.usernameLabel}
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder={t.usernamePlaceholder}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                {t.passwordLabel}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleLoginDemo}
              className="w-full py-2 bg-transparent hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-xl text-xs font-medium transition cursor-pointer mt-3 border border-dashed border-slate-200 flex items-center justify-center gap-2"
            >
              {t.demoBtn}
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl shadow-lg shadow-blue-600/20 text-sm transition cursor-pointer mt-2"
            >
              {loading ? (
                t.loading
              ) : (
                <>
                  {t.loginBtn} <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          {t.footer}
        </p>
      </div>
    </main>
  );
}