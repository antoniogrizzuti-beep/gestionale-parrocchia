'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, User, ShieldCheck, LogOut } from 'lucide-react';

interface HeaderProps {
  titoloPagina?: string;
  isHome?: boolean;
  nomeParrocchia?: string;
  codiceParrocchia?: string;
  paese?: string;
  lingua?: string;
}

export default function Header({
  titoloPagina,
  isHome = false,
  nomeParrocchia,
  codiceParrocchia,
  paese,
  lingua,
}: HeaderProps) {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('lettura');
  const [veroRuolo, setVeroRuolo] = useState<string>('lettura');
  const [listaUtenti, setListaUtenti] = useState<any[]>([]);
  const [paeseCorrente, setPaeseCorrente] = useState<string>('');
  const [nomeParrocchiaDb, setNomeParrocchiaDb] = useState<string>('');
  const isImpersonating = typeof window !== 'undefined' && localStorage.getItem('impersonated_user_id');

  useEffect(() => {
    fetchUserData();
  }, []);

  async function fetchUserData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profiloVero } = await supabase
      .from('profili')
      .select('*')
      .eq('id', session.user.id)
      .single();

    const ruoloReale = profiloVero?.ruolo || 'lettura';
    setVeroRuolo(ruoloReale);

    let profiliTotali: any[] = [];
    if (ruoloReale === 'super_admin') {
      const { data } = await supabase.from('profili').select('*');
      profiliTotali = data || [];
      setListaUtenti(profiliTotali);
    }

    const impersonatedId = typeof window !== 'undefined' ? localStorage.getItem('impersonated_user_id') : null;
    let profiloAttivo = profiloVero;

    if (impersonatedId && ruoloReale === 'super_admin' && profiliTotali.length > 0) {
      const trovato = profiliTotali.find(p => p.id === impersonatedId);
      if (trovato) profiloAttivo = trovato;
    }

    setUserRole(profiloAttivo?.ruolo || 'lettura');

    if (profiloAttivo?.nome || profiloAttivo?.cognome) {
      setUserName(`${profiloAttivo.nome || ''} ${profiloAttivo?.cognome || ''}`.trim());
    } else {
      setUserName(profiloAttivo?.username || session.user.email || 'Utente');
    }

    if (profiloAttivo?.parrocchia_id) {
      const { data: parrocchiaData } = await supabase
        .from('parrocchie')
        .select('*')
        .eq('id', profiloAttivo.parrocchia_id)
        .single();

      if (parrocchiaData) {
        setPaeseCorrente(parrocchiaData.paese || 'Italia');
        setNomeParrocchiaDb(parrocchiaData.nome_parrocchia || '');
      }
    }
  }

  const handleLogout = async () => {
    localStorage.removeItem('impersonated_user_id');
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const paeseVisualizzato = paese || paeseCorrente || 'Italia';
  const codiceVisualizzato = codiceParrocchia || 'IT-SAR-SS-SS001';
  const nomeParh = nomeParrocchia || nomeParrocchiaDb;

 // Determina bandiera SVG e lingua in base al paese
  let bandieraUrl = 'https://flagcdn.com/w20/it.png'; // Default Italia
  let linguaVisualizzata = 'IT';
  
  const paeseLower = paeseVisualizzato.toLowerCase();
  if (paeseLower.includes('united states') || paeseLower.includes('usa') || paeseLower.includes('america')) {
    bandieraUrl = 'https://flagcdn.com/w20/us.png';
    linguaVisualizzata = 'EN';
  } else if (paeseLower.includes('spain') || paeseLower.includes('spagna')) {
    bandieraUrl = 'https://flagcdn.com/w20/es.png';
    linguaVisualizzata = 'ES';
  } else if (paeseLower.includes('france') || paeseLower.includes('francia')) {
    bandieraUrl = 'https://flagcdn.com/w20/fr.png';
    linguaVisualizzata = 'FR';
  }

  const titoloPrincipale = titoloPagina || nomeParh || "Gestione Parrocchiale";
  const mostraNomeSecondario = nomeParh && titoloPagina && titoloPagina !== nomeParh;

  return (
    <header className={`sticky top-0 z-50 ${isImpersonating ? 'bg-amber-500 text-slate-900 border-b border-amber-600' : 'bg-[#0b1329] text-white'} py-3 px-6 shadow-md transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
        
        {/* PARTE SINISTRA */}
        <div className="flex items-center gap-4 flex-wrap">
          {!isHome && (
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
            >
              <ArrowLeft className="w-4 h-4" /> Home
            </Link>
          )}

          <div className="flex items-center gap-2">
            <h1 className="font-serif font-bold text-base tracking-wide">
              {titoloPrincipale}
            </h1>
          </div>

          <div className="hidden lg:flex items-center gap-2 border-l border-slate-700 pl-4">
            {mostraNomeSecondario && (
              <span className="font-serif font-bold text-sm tracking-wide text-slate-300">{nomeParh}</span>
            )}
            <span className="bg-blue-900/80 text-blue-200 text-[10px] font-mono px-2 py-0.5 rounded border border-blue-700/50">
              {codiceVisualizzato}
            </span>
           <span className="bg-slate-800 text-slate-200 text-[10px] px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1.5">
              <img src={bandieraUrl} alt="Bandiera" className="w-3.5 h-2.5 object-cover rounded-xs" /> 
              {paeseVisualizzato}
            </span>
            <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-700 uppercase">
              {linguaVisualizzata}
            </span>
          </div>
        </div>

        {/* PARTE DESTRA */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-3 px-3 py-1.5 rounded-xl border ${
            isImpersonating ? 'bg-amber-600/30 border-amber-700/60 text-slate-900' : 'bg-slate-800/60 border-slate-700/60 text-white'
          }`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white ${isImpersonating ? 'bg-amber-700' : 'bg-blue-600'}`}>
              <User className="w-4 h-4" />
            </div>
            
            <div className="text-left leading-tight">
              <span className="block text-xs font-bold">{userName || 'Caricamento...'}</span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${isImpersonating ? 'text-amber-950' : 'text-blue-400'}`}>
                <ShieldCheck className="w-3 h-3" /> {userRole?.replace('_', ' ')}
              </span>
            </div>

            {veroRuolo === 'super_admin' && listaUtenti.length > 0 && (
              <div className={`ml-2 pl-2 border-l ${isImpersonating ? 'border-amber-700/60' : 'border-slate-700'}`}>
                <select
                  onChange={async (e) => {
                    const selectedId = e.target.value;
                    if (!selectedId) {
                      localStorage.removeItem('impersonated_user_id');
                      window.location.reload();
                      return;
                    }
                    const targetUser = listaUtenti.find(u => u.id === selectedId);
                    if (targetUser) {
                      localStorage.setItem('impersonated_user_id', targetUser.id);
                      window.location.reload();
                    }
                  }}
                  defaultValue={typeof window !== 'undefined' ? localStorage.getItem('impersonated_user_id') || '' : ''}
                  className={`text-[11px] font-medium py-1 px-2 rounded-lg border outline-none cursor-pointer ${
                    isImpersonating ? 'bg-amber-900 text-amber-100 border-amber-700' : 'bg-slate-900 text-slate-200 border-slate-700'
                  }`}
                  title="Switch rapido utente"
                >
                  <option value="">(Tuo Account Super Admin)</option>
                  {listaUtenti.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome ? `${u.nome} ${u.cognome || ''}` : u.email} ({u.ruolo})
                    </option>
                  ))} 
                </select>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className={`p-2 rounded-lg transition cursor-pointer ${
              isImpersonating ? 'text-slate-900 hover:bg-amber-600/30' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Disconnetti"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

      </div>
    </header>
  );
}