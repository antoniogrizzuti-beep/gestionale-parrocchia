'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import {
  BookOpen,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  LogOut,
  Users,
  Heart,
  Cross,
  UserCheck,
  User,
  ShieldCheck,
  Wine,
  MessageSquare,
  Globe,
  Printer,
  Church,
  Music,
  ArrowLeft,
} from 'lucide-react';

const dashboardDict: Record<string, Record<string, string>> = {
  it: {
    battesimi: "Battesimi",
    subBattesimi: "Registro degli atti di Battesimo e stampa certificati",
    comunioni: "Prime Comunioni",
    subComunioni: "Registro degli atti di Prima Comunione e stampa attestati",
    nuovo: "Nuovo",
    consulta: "Consulta Registro",
    cresime: "Cresime",
    subCresime: "Registro degli atti di Confermazione",
    matrimoni: "Matrimoni",
    subMatrimoni: "Registro dei Matrimoni concordatari e canonici",
    defunti: "Defunti",
    subDefunti: "Registro dei Defunti e esequie",
    inArrivo: "In arrivo",
    subtitle: "Sistema di Gestione Anagrafica e Registri dei Sacramenti",
    searchPlaceholder: "Cerca per cognome, nome o numero atto...",
    tuttiGliAnni: "Tutti gli Anni",
    archivioSacramenti: "Archivio Sacramenti",
    coroLiturgia: "Coro & Liturgia",
    agendaPastorale: "Agenda & Pastorale",
    bacheca: "Bacheca",
    gestisciTeam: "Gestisci Team",
    impostazioni: "Impostazioni"
  },
  en: {
    battesimi: "Baptisms",
    subBattesimi: "Baptismal registry and certificate printing",
    comunioni: "First Communions",
    subComunioni: "First Communion registry and certificate printing",
    nuovo: "New",
    consulta: "View Register",
    cresime: "Confirmations",
    subCresime: "Confirmation acts registry",
    matrimoni: "Marriages",
    subMatrimoni: "Canonical and concordat marriage registry",
    defunti: "Deceased",
    subDefunti: "Death and funeral registry",
    inArrivo: "Coming Soon",
    subtitle: "Parish Registry & Sacraments Management System",
    searchPlaceholder: "Search by last name, first name or act number...",
    tuttiGliAnni: "All Years",
    archivioSacramenti: "Sacraments Archive",
    coroLiturgia: "Choir & Liturgy",
    agendaPastorale: "Agenda & Pastoral",
    bacheca: "Board",
    gestisciTeam: "Manage Team",
    impostazioni: "Settings"
  },
  es: {
    battesimi: "Bautismos",
    subBattesimi: "Registro de bautismos y impresión de certificados",
    comunioni: "Primeras Comuniones",
    subComunioni: "Registro de primeras comuniones y certificados",
    nuovo: "Nuevo",
    consulta: "Consultar Registro",
    cresime: "Confirmaciones",
    subCresime: "Registro de actas de confirmación",
    matrimoni: "Matrimonios",
    subMatrimoni: "Registro de matrimonios canónicos y concordatarios",
    defunti: "Difuntos",
    subDefunti: "Registro de defunciones y exequias",
    inArrivo: "Próximamente",
    subtitle: "Sistema de Gestión de Registros y Sacramentos",
    searchPlaceholder: "Buscar por apellido, nombre o número...",
    tuttiGliAnni: "Todos los Años",
    archivioSacramenti: "Archivo Sacramentos",
    coroLiturgia: "Coro y Liturgia",
    agendaPastorale: "Agenda y Pastoral",
    bacheca: "Tablón",
    gestisciTeam: "Gestionar Equipo",
    impostazioni: "Configuración"
  }
};

interface Battesimo {
  id: string;
  numero_atto: number | null;
  nome: string;
  cognome: string;
  sesso: string;
  data_nascita: string;
  luogo_nascita: string;
  data_battesimo: string;
  luogo_battesimo: string;
  ministro: string;
  padre: string;
  madre: string;
}

interface Comunione {
  id: string;
  numero_atto: number | null;
  nome: string;
  cognome: string;
  sesso: string;
  data_nascita: string;
  luogo_nascita: string;
  data_battesimo: string;
  chiesa_battesimo: string;
  data_comunione: string;
  chiesa_comunione: string;
  ministro: string;
}

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view') || 'dashboard';

  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('lettura');
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [listaUtenti, setlistaUtenti] = useState<any[]>([]);
  const [veroRuolo, setVeroRuolo] = useState<string>('lettura');

  // Stato per la Privacy Mode (ON di default)
  const [privacyMode, setPrivacyMode] = useState(true);

  // Stati per Paese e Lingua
  const [userCountry, setUserCountry] = useState<string>('IT');
  const [userLang, setUserLang] = useState<string>('it');
  const t = dashboardDict[userLang?.toLowerCase()] || dashboardDict['it'];
  
  // Stati per la parrocchia e personalizzazione
  const [parrocchiaId, setParrocchiaId] = useState<string | null>(null);
  const [nomeParrocchia, setNomeParrocchia] = useState<string>('Parrocchia');
  const [codiceParrocchia, setCodiceParrocchia] = useState<string>('');
  const [diocesiParrocchia, setDiocesiParrocchia] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('/logo.png');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempNomeParrocchia, setTempNomeParrocchia] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [battesimi, setBattesimi] = useState<Battesimo[]>([]);
  const [comunioni, setComunioni] = useState<Comunione[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  useEffect(() => {
    checkUserAndFetchData();
  }, [currentView]);

  async function checkUserAndFetchData() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push('/login');
      return;
    }

    const emailUtente = session.user.email || '';
    setUserEmail(emailUtente);

    const { data: profiloVero } = await supabase
      .from('profili')
      .select('*, parrocchie(id, codice, nome_parrocchia, diocesi, logo_url)')
      .eq('id', session.user.id)
      .single();

    const ruoloReale = profiloVero?.ruolo || 'lettura';
    setVeroRuolo(ruoloReale);

    let profiliTotali: any[] = [];
    if (ruoloReale === 'super_admin') {
      const { data } = await supabase.from('profili').select('*');
      profiliTotali = data || [];
      setlistaUtenti(profiliTotali);
    }

    const impersonatedId = typeof window !== 'undefined' ? localStorage.getItem('impersonated_user_id') : null;
    let profiloAttivo = profiloVero;

    if (impersonatedId && ruoloReale === 'super_admin' && profiliTotali.length > 0) {
      const trovato = profiliTotali.find(p => p.id === impersonatedId);
      if (trovato) {
        profiloAttivo = trovato;
      }
    }

    const ruoloCorrente = profiloAttivo?.ruolo || 'lettura';
    setUserRole(ruoloCorrente);

    setUserCountry(profiloAttivo?.paese || 'IT');
    setUserLang(profiloAttivo?.lingua || 'it');

    if (profiloAttivo?.nome || profiloAttivo?.cognome) {
      setUserName(`${profiloAttivo.nome || ''} ${profiloAttivo.cognome || ''}`.trim());
    } else {
      setUserName(profiloAttivo?.username || emailUtente || 'Utente');
    }

    let parrocchiaData = null;

    if (profiloAttivo?.parrocchia_id) {
      const { data: pDirect } = await supabase
        .from('parrocchie')
        .select('*')
        .eq('id', profiloAttivo.parrocchia_id)
        .single();
      
      if (pDirect) parrocchiaData = pDirect;
    }

    if (!parrocchiaData) {
      const { data: pFallback } = await supabase
        .from('parrocchie')
        .select('*')
        .limit(1)
        .single();
      
      if (pFallback) parrocchiaData = pFallback;
    }

    if (parrocchiaData) {
      setParrocchiaId(parrocchiaData.id);
      setNomeParrocchia(parrocchiaData.nome_parrocchia || 'Parrocchia');
      setTempNomeParrocchia(parrocchiaData.nome_parrocchia || 'Parrocchia');
      setCodiceParrocchia(parrocchiaData.codice || '');
      setDiocesiParrocchia(parrocchiaData.diocesi || 'Arcidiocesi');
      
      const logoDb = parrocchiaData.logo_url;
      setLogoUrl((logoDb && logoDb !== 'null' && logoDb.trim() !== '') ? logoDb : '');
    }

    const targetIdForNotif = impersonatedId && profiloVero?.ruolo === 'super_admin' ? impersonatedId : session.user.id;

    const { count } = await supabase
      .from('bacheca_ticket')
      .select('*', { count: 'exact', head: true })
      .or(`destinatario_id.eq.${targetIdForNotif},destinatario_id.is.null`)
      .neq('stato', 'Risolta')
      .eq('letto_da_operatore', false)
      .neq('mittente_id', targetIdForNotif);

    setUnreadCount(count || 0);

    const currentParrocchiaId = parrocchiaData?.id || profiloAttivo?.parrocchia_id;

    if (currentView === 'battesimi' && currentParrocchiaId) {
      const { data } = await supabase
        .from('battesimi')
        .select('*')
        .eq('parrocchia_id', currentParrocchiaId)
        .order('created_at', { ascending: false });
      setBattesimi(data || []);
    } else if (currentView === 'comunioni' && currentParrocchiaId) {
      const { data } = await supabase
        .from('comunioni')
        .select('*')
        .eq('parrocchia_id', currentParrocchiaId)
        .order('created_at', { ascending: false });
      setComunioni(data || []);
    }

    setLoading(false);
  }

  async function handleDeleteBattesimo(id: string, nomeCompleto: string) {
    if (userRole === 'lettura' || userRole === 'operatore') {
      alert('Non hai i permessi per eliminare gli atti.');
      return;
    }
    if (confirm(`Sei sicuro di voler eliminare l'atto di battesimo di ${nomeCompleto}?`)) {
      const { error } = await supabase.from('battesimi').delete().eq('id', id);
      if (error) alert(`Errore: ${error.message}`);
      else setBattesimi(battesimi.filter((b) => b.id !== id));
    }
  }

  async function handleDeleteComunione(id: string, nomeCompleto: string) {
    if (userRole === 'lettura' || userRole === 'operatore') {
      alert('Non hai i permessi per eliminare gli atti.');
      return;
    }
    if (confirm(`Sei sicuro di voler eliminare l'atto di prima comunione di ${nomeCompleto}?`)) {
      const { error } = await supabase.from('comunioni').delete().eq('id', id);
      if (error) alert(`Errore: ${error.message}`);
      else setComunioni(comunioni.filter((c) => c.id !== id));
    }
  }

  const isSoloLettura = userRole === 'lettura';
  const isAdminOrSuper = userRole === 'admin' || userRole === 'super_admin';
  const isDemoUser = userEmail === 'demo@parrocchia.it';
  const canModifyConfig = userRole === 'super_admin' || isDemoUser;

  const filteredBattesimi = battesimi.filter((b) => {
    const matchesQuery =
      b.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.cognome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.numero_atto && b.numero_atto.toString().includes(searchQuery));

    const year = b.data_battesimo ? new Date(b.data_battesimo).getFullYear().toString() : '';
    const matchesYear = selectedYear === 'all' || year === selectedYear;

    return matchesQuery && matchesYear;
  });

  const filteredComunioni = comunioni.filter((c) => {
    const matchesQuery =
      c.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.cognome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.numero_atto && c.numero_atto.toString().includes(searchQuery));

    const year = c.data_comunione ? new Date(c.data_comunione).getFullYear().toString() : '';
    const matchesYear = selectedYear === 'all' || year === selectedYear;

    return matchesQuery && matchesYear;
  });

  const yearsBattesimi = Array.from(
    new Set(battesimi.map((b) => (b.data_battesimo ? new Date(b.data_battesimo).getFullYear().toString() : '')).filter(Boolean))
  ).sort((a, b) => b.localeCompare(a));

  const yearsComunioni = Array.from(
    new Set(comunioni.map((c) => (c.data_comunione ? new Date(c.data_comunione).getFullYear().toString() : '')).filter(Boolean))
  ).sort((a, b) => b.localeCompare(a));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-slate-500 text-sm">
        Caricamento dashboard in corso...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-800 pb-16">
      
      {/* Header Unificato e Sticky */}
      <Header 
        isHome={currentView === 'dashboard'} 
        titoloPagina={
          currentView === 'battesimi' ? "Registro dei Battesimi" :
          currentView === 'comunioni' ? "Registro delle Prime Comunioni" : undefined
        }
        nomeParrocchia={nomeParrocchia} 
        codiceParrocchia={codiceParrocchia} 
        userRole={userRole} 
        veroRuolo={veroRuolo} 
        listaUtenti={listaUtenti} 
      />

      {/* LOGO E NOME PARROCCHIA */}
      <div className="max-w-5xl mx-auto px-6 pt-8 pb-4 text-center">
        <div className="inline-block relative w-24 h-24 mb-3 group">
          <label htmlFor={canModifyConfig ? "logo-upload" : undefined} className={`${canModifyConfig ? 'cursor-pointer' : 'cursor-default'} block w-full h-full relative`}>
            {logoUrl && logoUrl !== '/logo.png' ? (
              <img
                src={logoUrl}
                alt="Logo Parrocchia"
                width={96}
                height={96}
                className={`w-24 h-24 object-contain mx-auto rounded-xl border border-transparent ${canModifyConfig ? 'group-hover:border-blue-500' : ''} transition`}
              />
            ) : (
              <div className={`w-24 h-24 mx-auto rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 ${canModifyConfig ? 'group-hover:border-blue-500 group-hover:text-blue-600' : ''} transition`}>
                <Church className="w-10 h-10" />
              </div>
            )}

            {canModifyConfig && (
              <div className="absolute inset-0 bg-slate-900/60 rounded-xl opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white text-[10px] font-bold">
                <span>✏️ {logoUrl && logoUrl !== '/logo.png' ? 'Cambia' : 'Aggiungi'}</span>
              </div>
            )}
          </label>
          
          {canModifyConfig && parrocchiaId && (
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                
                setIsUploadingLogo(true);
                try {
                  const fileExt = file.name.split('.').pop();
                  const fileName = `logo-${Date.now()}.${fileExt}`;
                  
                  const { error: uploadError } = await supabase.storage
                    .from('loghi')
                    .upload(fileName, file, { upsert: true });

                  if (uploadError) throw uploadError;

                  const { data: publicUrlData } = supabase.storage
                    .from('loghi')
                    .getPublicUrl(fileName);

                  const newUrl = publicUrlData.publicUrl;

                  await supabase
                    .from('parrocchie')
                    .update({ logo_url: newUrl })
                    .eq('id', parrocchiaId);

                  setLogoUrl(newUrl);
                } catch (err: any) {
                  alert('Errore caricamento logo: ' + err.message);
                } finally {
                  setIsUploadingLogo(false);
                }
              }}
            />
          )}
        </div>

        <div>
          <span className="text-[11px] font-bold tracking-widest text-blue-600 uppercase">
            {diocesiParrocchia || 'Arcidiocesi'}
          </span>

          <div className="flex items-center justify-center gap-2 mt-1 group">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempNomeParrocchia}
                  onChange={(e) => setTempNomeParrocchia(e.target.value)}
                  className="text-2xl font-extrabold font-serif text-slate-900 bg-white border border-blue-500 rounded-lg px-2 py-1 outline-none text-center shadow-inner"
                  autoFocus
                />
                <button
                  onClick={async () => {
                    if (parrocchiaId) {
                      await supabase
                        .from('parrocchie')
                        .update({ nome_parrocchia: tempNomeParrocchia })
                        .eq('id', parrocchiaId);
                    }
                    setNomeParrocchia(tempNomeParrocchia);
                    setIsEditingName(false);
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg shadow hover:bg-blue-700 transition cursor-pointer"
                >
                  Salva
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  className="px-2 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-300 transition cursor-pointer"
                >
                  Annulla
                </button>
              </div>
            ) : (
              <div 
                className={`flex items-center justify-center gap-2 ${canModifyConfig ? 'cursor-pointer' : ''}`} 
                onClick={() => {
                  if (!canModifyConfig) {
                    alert('La modifica del nome ufficiale è riservata ai Super Admin.');
                    return;
                  }
                  setTempNomeParrocchia(nomeParrocchia); 
                  setIsEditingName(true); 
                }}
              >
                <h1 className="text-3xl font-extrabold font-serif text-slate-900">
                  {nomeParrocchia}
                </h1>
                {canModifyConfig && (
                  <span className="text-slate-400 group-hover:text-blue-600 transition text-sm" title="Modifica nome parrocchia">
                    ✏️
                  </span>
                )}
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 mt-1">
            {isUploadingLogo ? 'Caricamento nuovo logo in corso...' : t.subtitle}
          </p>
        </div>
      </div>

      {/* DOPPIA FILA DI BADGE STICKY CON TRADUZIONI E COLORI PASTELLO */}
      <div className="sticky top-[58px] z-40 bg-white/95 backdrop-blur-md py-3 border-b border-slate-200 shadow-xs mb-8 space-y-2">
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-2.5">
          <button
            onClick={() => document.getElementById('archivio')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <span>📄</span> {t.archivioSacramenti}
          </button>

          <button
            onClick={() => document.getElementById('coro')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <span>🎵</span> {t.coroLiturgia}
          </button>

          <button
            onClick={() => document.getElementById('pastorale')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <span>👥</span> {t.agendaPastorale}
          </button>
        </div>

        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-2.5 pt-1 border-t border-slate-100/80">
          <Link
            href="/bacheca"
            className="relative px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-2xs"
          >
            <MessageSquare className="w-3.5 h-3.5" /> {t.bacheca}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                {unreadCount}
              </span>
            )}
          </Link>

          <Link
            href="/lumen"
            className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-2xs"
          >
            <Globe className="w-3.5 h-3.5" /> Network Lumen
          </Link>

          {(userRole === 'super_admin' || userRole === 'admin') && (
            <Link
              href="/collaboratori"
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-2xs"
            >
              <Users className="w-3.5 h-3.5" /> {t.gestisciTeam}
            </Link>
          )}

          <button
            onClick={() => alert('Sezione Impostazioni parrocchia')}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <span>⚙️</span> {t.impostazioni}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 space-y-16 pb-16">

        {/* VISTA DASHBOARD PRINCIPALE */}
        {currentView === 'dashboard' && (
          <div className="space-y-12">
            
            <section id="archivio" className="scroll-mt-28 space-y-6">
              <div className="border-b border-slate-200 pb-4 text-center">
                <h2 className="text-xl font-bold font-serif text-slate-900">Archivio Sacramenti</h2>
                <p className="text-xs text-slate-500">Gestione dei registri parrocchiali e degli atti sacramentali</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                
                {/* Battesimi */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between h-[160px]">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{t.battesimi}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{t.subBattesimi}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {!isSoloLettura && (
                      <Link
                        href="/nuovo-battesimo"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#1d4ed8] hover:bg-blue-700 text-white rounded-xl text-xs font-medium transition shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> {t.nuovo}
                      </Link>
                    )}
                    <button
                      onClick={() => router.push('/?view=battesimi')}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#f1f5f9] hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" /> {t.consulta}
                    </button>
                  </div>
                </div>

                {/* Prime Comunioni */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between h-[160px]">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <Wine className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{t.comunioni}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{t.subComunioni}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {!isSoloLettura && (
                      <Link
                        href="/nuova-comunione"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#047857] hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> {t.nuovo}
                      </Link>
                    )}
                    <button
                      onClick={() => router.push('/?view=comunioni')}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#f1f5f9] hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" /> {t.consulta}
                    </button>
                  </div>
                </div>

                {/* Cresime */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between h-[160px] opacity-75">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-700">{t.cresime}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{t.subCresime}</p>
                    </div>
                  </div>
                  <div>
                    <span className="inline-block bg-amber-50 text-amber-700 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-amber-200/60">
                      {t.inArrivo}
                    </span>
                  </div>
                </div>

                {/* Matrimoni */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between h-[160px] opacity-75">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-rose-50 text-rose-500 rounded-xl shrink-0">
                      <Heart className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-700">{t.matrimoni}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{t.subMatrimoni}</p>
                    </div>
                  </div>
                  <div>
                    <span className="inline-block bg-rose-50 text-rose-600 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-rose-200/60">
                      {t.inArrivo}
                    </span>
                  </div>
                </div>

                {/* Defunti */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between h-[160px] opacity-75 md:col-span-2">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-slate-100 text-slate-500 rounded-xl shrink-0">
                      <Cross className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-700">{t.defunti}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{t.subDefunti}</p>
                    </div>
                  </div>
                  <div>
                    <span className="inline-block bg-slate-100 text-slate-600 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-slate-200">
                      {t.inArrivo}
                    </span>
                  </div>
                </div>

              </div>
            </section>

            {/* SEZIONE 2: CORO & LITURGIA */}
            <section id="coro" className="scroll-mt-28 space-y-6 pt-6 border-t border-slate-100">
              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                  Vita Liturgica e Comunitaria
                </h3>
                <h2 className="text-xl font-bold font-serif text-slate-900">Coro & Liturgia</h2>
                <p className="text-xs text-slate-500">Gestione repertorio canti e scalette delle messe</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
  
  {/* Intenzioni di Messa */}
  <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between h-[160px]">
    <div className="flex items-center gap-3.5">
      <div className="p-3 bg-purple-50 text-purple-600 rounded-xl shrink-0">
        <Heart className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-base font-bold text-slate-900">Intenzioni di Messa</h3>
        <p className="text-xs text-slate-500 mt-0.5">Gestione suffragi e stampa foglio settimanale bacheca</p>
      </div>
    </div>

    <div className="flex gap-3">
      <Link
        href="/intenzioni"
        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-medium transition shadow-sm"
      >
        <BookOpen className="w-3.5 h-3.5" /> Gestisci Intenzioni
      </Link>
    </div>
  </div>

  {/* Coro & Liturgia */}
  <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between h-[160px]">
    <div className="flex items-center gap-3.5">
      <div className="p-3 bg-purple-50 text-purple-600 rounded-xl shrink-0">
        <Music className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-base font-bold text-slate-900">Coro & Liturgia</h3>
        <p className="text-xs text-slate-500 mt-0.5">Gestione repertorio canti e scalette delle messe</p>
      </div>
    </div>

    <div className="flex gap-3">
      {!isSoloLettura && (
        <Link
          href="/coro/nuova-scaletta"
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-medium transition shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Nuova Scaletta
        </Link>
      )}
      <button
        onClick={() => router.push('/?view=coro')}
        className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#f1f5f9] hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition cursor-pointer"
      >
        <BookOpen className="w-3.5 h-3.5" /> Repertorio
      </button>
    </div>
  </div>

</div>
            </section>

            {/* SEZIONE 3: AGENDA & PASTORALE */}
            <section id="pastorale" className="scroll-mt-28 space-y-6 pt-6 border-t border-slate-100">
              <div className="border-b border-slate-200 pb-4">
                <h2 className="text-xl font-bold font-serif text-slate-900">Agenda & Pastorale</h2>
                <p className="text-xs text-slate-500">Calendario incontri, catechismo e appuntamenti parrocchiali</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
                <p className="text-xs text-slate-400">Sezione in fase di configurazione...</p>
              </div>
            </section>

          </div>
        )}

        {/* REGISTRO BATTESIMI */}
        {currentView === 'battesimi' && (
          <div className="space-y-6 pt-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold font-serif text-slate-900">Registro dei Battesimi</h2>
                <p className="text-xs text-slate-500">Elenco completo degli atti registrati per questa parrocchia</p>
              </div>

              {!isSoloLettura && (
                <Link
                  href="/nuovo-battesimo"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-xl transition shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Nuovo Atto Battesimo
                </Link>
              )}
            </div>

            {/* BARRA DI RICERCA, FILTRO ANNO E TOGGLE PRIVACY MODE */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cerca per cognome, nome o numero atto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 cursor-pointer"
                >
                  <option value="all">Tutti gli Anni</option>
                  {yearsBattesimi.map((yr) => (
                    <option key={yr} value={yr}>Anno {yr}</option>
                  ))}
                </select>
              </div>

              {/* Toggle Privacy Mode */}
              <button
                type="button"
                onClick={() => setPrivacyMode(!privacyMode)}
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border shadow-2xs shrink-0 ${
                  privacyMode 
                    ? 'bg-amber-50 border-amber-300 text-amber-900' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                title="Nascondi i dati sensibili sullo schermo"
              >
                <span>{privacyMode ? '🔒 Privacy On' : '🔓 Privacy Off'}</span>
                <div className={`w-7 h-4 flex items-center rounded-full p-0.5 duration-300 ${privacyMode ? 'bg-amber-600 justify-end' : 'bg-slate-300 justify-start'}`}>
                  <div className="bg-white w-3 h-3 rounded-full shadow-md"></div>
                </div>
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="py-3.5 px-4">Atto N°</th>
                    <th className="py-3.5 px-4">Cognome e Nome</th>
                    <th className="py-3.5 px-4">Data Nascita</th>
                    <th className="py-3.5 px-4">Data Battesimo</th>
                    <th className="py-3.5 px-4">Genitori</th>
                    <th className="py-3.5 px-4 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBattesimi.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Nessun atto trovato per questa parrocchia.
                      </td>
                    </tr>
                  ) : (
                    filteredBattesimi.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-800">{b.numero_atto || '-'}</td>
                        <td 
                          className={`py-3.5 px-4 font-semibold text-slate-900 transition-all duration-200 ${privacyMode ? 'blur-sm select-none hover:blur-none cursor-pointer' : ''}`}
                          title={privacyMode ? 'Dato protetto - Passa sopra per visualizzare' : ''}
                        >
                          {b.cognome} {b.nome}
                        </td>
                        <td 
                          className={`py-3.5 px-4 transition-all duration-200 ${privacyMode ? 'blur-sm select-none hover:blur-none cursor-pointer' : ''}`}
                          title={privacyMode ? 'Dato protetto - Passa sopra per visualizzare' : ''}
                        >
                          {b.data_nascita ? new Date(b.data_nascita).toLocaleDateString('it-IT') : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-blue-700 font-medium">
                          {b.data_battesimo ? new Date(b.data_battesimo).toLocaleDateString('it-IT') : '-'}
                        </td>
                        <td 
                          className={`py-3.5 px-4 text-slate-500 transition-all duration-200 ${privacyMode ? 'blur-sm select-none hover:blur-none cursor-pointer' : ''}`}
                          title={privacyMode ? 'Dato protetto - Passa sopra per visualizzare' : ''}
                        >
                          {b.padre && b.madre ? `${b.padre} e ${b.madre}` : b.padre || b.madre || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <Link
                            href={`/nuovo-battesimo?id=${b.id}&mode=view`}
                            className="p-1.5 inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
                            title="Visualizza Sola Lettura"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>

                          {!isSoloLettura && (
                            <Link
                              href={`/nuovo-battesimo?id=${b.id}`}
                              className="p-1.5 inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-medium transition"
                              title="Modifica"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Link>
                          )}
                          <Link
                            href={`/certificato/battesimo?id=${b.id}`}
                            target="_blank"
                            className="p-1.5 inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
                            title="Stampa Certificato"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Link>
                          {isAdminOrSuper && (
                            <button
                              onClick={() => handleDeleteBattesimo(b.id, `${b.cognome} ${b.nome}`)}
                              className="p-1.5 inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                              title="Elimina"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REGISTRO PRIME COMUNIONI */}
        {currentView === 'comunioni' && (
          <div className="space-y-6 pt-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold font-serif text-slate-900">Registro delle Prime Comunioni</h2>
                <p className="text-xs text-slate-500">Elenco degli atti delle Prime Comunioni celebrate per questa parrocchia</p>
              </div>

              {!isSoloLettura && (
                <Link
                  href="/nuova-comunione"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl transition shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Nuovo Atto Prima Comunione
                </Link>
              )}
            </div>

            {/* BARRA DI RICERCA, FILTRO ANNO E TOGGLE PRIVACY MODE */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cerca per cognome, nome o numero atto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 cursor-pointer"
                >
                  <option value="all">Tutti gli Anni</option>
                  {yearsComunioni.map((yr) => (
                    <option key={yr} value={yr}>Anno {yr}</option>
                  ))}
                </select>
              </div>

              {/* Toggle Privacy Mode */}
              <button
                type="button"
                onClick={() => setPrivacyMode(!privacyMode)}
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border shadow-2xs shrink-0 ${
                  privacyMode 
                    ? 'bg-amber-50 border-amber-300 text-amber-900' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                title="Nascondi i dati sensibili sullo schermo"
              >
                <span>{privacyMode ? '🔒 Privacy On' : '🔓 Privacy Off'}</span>
                <div className={`w-7 h-4 flex items-center rounded-full p-0.5 duration-300 ${privacyMode ? 'bg-amber-600 justify-end' : 'bg-slate-300 justify-start'}`}>
                  <div className="bg-white w-3 h-3 rounded-full shadow-md"></div>
                </div>
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="py-3.5 px-4">Atto N°</th>
                    <th className="py-3.5 px-4">Cognome e Nome</th>
                    <th className="py-3.5 px-4">Data Nascita</th>
                    <th className="py-3.5 px-4">Data Battesimo</th>
                    <th className="py-3.5 px-4">Prima Comunione</th>
                    <th className="py-3.5 px-4 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredComunioni.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Nessun atto trovato per questa parrocchia.
                      </td>
                    </tr>
                  ) : (
                    filteredComunioni.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-800">{c.numero_atto || '-'}</td>
                        <td 
                          className={`py-3.5 px-4 font-semibold text-slate-900 transition-all duration-200 ${privacyMode ? 'blur-sm select-none hover:blur-none cursor-pointer' : ''}`}
                          title={privacyMode ? 'Dato protetto - Passa sopra per visualizzare' : ''}
                        >
                          {c.cognome} {c.nome}
                        </td>
                        <td 
                          className={`py-3.5 px-4 transition-all duration-200 ${privacyMode ? 'blur-sm select-none hover:blur-none cursor-pointer' : ''}`}
                          title={privacyMode ? 'Dato protetto - Passa sopra per visualizzare' : ''}
                        >
                          {c.data_nascita ? new Date(c.data_nascita).toLocaleDateString('it-IT') : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {c.data_battesimo ? new Date(c.data_battesimo).toLocaleDateString('it-IT') : '-'} ({c.chiesa_battesimo || 'N.D.'})
                        </td>
                        <td className="py-3.5 px-4 text-emerald-700 font-medium">
                          {c.data_comunione ? new Date(c.data_comunione).toLocaleDateString('it-IT') : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <Link
                            href={`/nuova-comunione?id=${c.id}&mode=view`}
                            className="p-1.5 inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
                            title="Visualizza Sola Lettura"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>

                          {!isSoloLettura && (
                            <Link
                              href={`/nuova-comunione?id=${c.id}`}
                              className="p-1.5 inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg font-medium transition"
                              title="Modifica"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Link>
                          )}
                          <Link
                            href={`/certificato/comunione?id=${c.id}`}
                            target="_blank"
                            className="p-1.5 inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-medium transition"
                            title="Stampa Attestato Comunione"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Link>
                          {isAdminOrSuper && (
                            <button
                              onClick={() => handleDeleteComunione(c.id, `${c.cognome} ${c.nome}`)}
                              className="p-1.5 inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                              title="Elimina"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}