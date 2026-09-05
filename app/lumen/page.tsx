'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { Globe, Search, Church, MapPin, MessageSquare, Send, ShieldAlert, Info, User, Phone, Mail } from 'lucide-react';
import dynamic from 'next/dynamic';

const LumenMap = dynamic(() => import('@/components/LumenMap'), { ssr: false });

interface ParrocchiaNetwork {
  id: string;
  codice: string;
  nome_parrocchia: string;
  diocesi: string;
  paese?: string;
  indirizzo?: string;
  citta?: string;
  referente_nome?: string;
  referente_email?: string;
  referente_telefono?: string;
  lat?: number;
  lng?: number;
}

interface MessaggioLumen {
  id: string;
  mittente_id: string;
  destinatario_id: string | null;
  testo: string;
  created_at: string;
}

export default function LumenNetworkPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [parrocchie, setParrocchie] = useState<ParrocchiaNetwork[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiocesi, setSelectedDiocesi] = useState('all');
  
  const [activeTab, setActiveTab] = useState<'esplora' | 'chat'>('esplora');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserParrocchiaId, setCurrentUserParrocchiaId] = useState<string | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  
  // Stati per modale Chat e modale Info
  const [selectedParrocchiaChat, setSelectedParrocchiaChat] = useState<ParrocchiaNetwork | null>(null);
  const [messaggi, setMessaggi] = useState<MessaggioLumen[]>([]);
  const [testoMessaggio, setTestoMessaggio] = useState('');

  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [parrocchiaInfo, setParrocchiaInfo] = useState<ParrocchiaNetwork | null>(null);

  useEffect(() => {
    initLumenNetwork();
  }, []);

  async function initLumenNetwork() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    setCurrentUserId(session.user.id);

    const { data: profilo } = await supabase
      .from('profili')
      .select('ruolo, parrocchia_id')
      .eq('id', session.user.id)
      .single();

    if (profilo) {
      setCurrentUserParrocchiaId(profilo.parrocchia_id);
      const adminCheck = profilo.ruolo === 'admin' || profilo.ruolo === 'super_admin';
      setIsUserAdmin(adminCheck);
    }

    // Recupera le parrocchie (inclusi eventuali campi anagrafici se presenti)
    const { data, error } = await supabase
      .from('parrocchie')
      .select('*');

    let parrocchieFinali = [];

    if (!error && data && data.length > 0) {
      parrocchieFinali = data.map((p, index) => {
        let lat = p.lat;
        let lng = p.lng;
        let citta = p.citta || 'Sardegna';

        if (!lat || !lng) {
          if (p.codice?.includes('SS') || p.diocesi?.toLowerCase().includes('sassari')) {
            lat = 40.7259 + (index * 0.02);
            lng = 8.5557 + (index * 0.02);
            citta = 'Sassari';
          } else if (p.codice?.includes('PV') || p.diocesi?.toLowerCase().includes('pavia')) {
            lat = 45.1847;
            lng = 9.1579;
            citta = 'Pavia';
          } else if (p.codice?.includes('CO') || p.diocesi?.toLowerCase().includes('como')) {
            lat = 45.8081;
            lng = 9.0852;
            citta = 'Como';
          } else {
            lat = 40.1200 + (index * 0.05);
            lng = 9.0129 + (index * 0.05);
          }
        }

        return {
          ...p,
          citta,
          lat,
          lng,
          referente_nome: p.referente_nome || 'Amministratore Parrocchiale',
          indirizzo: p.indirizzo || 'Indirizzo istituzionale registrato'
        };
      });
    }

    setParrocchie(parrocchieFinali);
    setLoading(false);
  }

  function apriInfoParrocchia(parrocchia: ParrocchiaNetwork) {
    setParrocchiaInfo(parrocchia);
    setInfoModalOpen(true);
  }

  async function apriChatConParrocchia(parrocchia: ParrocchiaNetwork) {
    if (parrocchia.id === currentUserParrocchiaId) return;
    setSelectedParrocchiaChat(parrocchia);
    setActiveTab('chat');
    if (currentUserId) {
      fetchMessaggiChat(parrocchia.id);
    }
  }

  async function fetchMessaggiChat(parrocchiaIdTarget: string) {
    const { data: adminTarget } = await supabase
      .from('profili')
      .select('id')
      .eq('parrocchia_id', parrocchiaIdTarget)
      .limit(1);

    const targetUserId = adminTarget?.[0]?.id;
    if (!targetUserId || !currentUserId) return;

    const { data } = await supabase
      .from('bacheca_ticket')
      .select('*')
      .or(`and(mittente_id.eq.${currentUserId},destinatario_id.eq.${targetUserId}),and(mittente_id.eq.${targetUserId},destinatario_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true });

    if (data) setMessaggi(data);
  }

  async function inviaMessaggioChat(e: React.FormEvent) {
    e.preventDefault();
    if (!testoMessaggio.trim() || !selectedParrocchiaChat || !currentUserId) return;

    const { data: adminTarget } = await supabase
      .from('profili')
      .select('id')
      .eq('parrocchia_id', selectedParrocchiaChat.id)
      .limit(1);

    const targetUserId = adminTarget?.[0]?.id || null;

    const { error } = await supabase.from('bacheca_ticket').insert([
      {
        mittente_id: currentUserId,
        destinatario_id: targetUserId,
        testo: `[Lumen Network] ${testoMessaggio.trim()}`,
        stato: 'In attesa',
        letto_da_operatore: false
      }
    ]);

    if (!error) {
      setTestoMessaggio('');
      fetchMessaggiChat(selectedParrocchiaChat.id);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-slate-500 text-sm">
        Verifica autorizzazioni Network Lumen...
      </div>
    );
  }

  if (!isUserAdmin) {
    return (
      <main className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col">
        <Header titoloPagina="Network Lumen - Accesso Riservato" />
        <div className="max-w-md mx-auto my-auto p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-base font-bold font-serif text-slate-900">Accesso Riservato agli Amministratori</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            La sezione Network Lumen è riservata agli amministratori parrocchiali per il coordinamento istituzionale.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Torna alla Dashboard
          </button>
        </div>
      </main>
    );
  }

  const diocesiList = Array.from(new Set(parrocchie.map(p => p.diocesi).filter(Boolean)));

  const filteredParrocchie = parrocchie.filter(p => {
    const matchesQuery = 
      p.nome_parrocchia.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.diocesi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.codice.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDiocesi = selectedDiocesi === 'all' || p.diocesi === selectedDiocesi;

    return matchesQuery && matchesDiocesi;
  });

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col">
      <Header titoloPagina="Network Lumen - Comunità in Rete" />

      <div className="max-w-6xl w-full mx-auto p-6 space-y-6 flex-1 flex flex-col">
        
        {/* BARRA TAB */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-4">
          <button
            onClick={() => setActiveTab('esplora')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'esplora' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Globe className="w-4 h-4" /> Esplora & Mappa
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'chat' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Messaggi & Chat
          </button>
        </div>

        {activeTab === 'esplora' ? (
          <div className="space-y-6 flex-1">
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-1">
                  <Globe className="w-4 h-4" /> Ecosistema Connesso
                </div>
                <h1 className="text-xl font-serif font-bold text-slate-900">Mappa e Directory delle Parrocchie Lumen</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Esplorate le comunità collegate, visualizzate la posizione geografica e accedete ai dettagli istituzionali.
                </p>
              </div>
              <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-xl text-xs font-semibold text-center shrink-0">
                {parrocchie.length} Parrocchie in Rete
              </div>
            </div>

            {/* MAPPA */}
            <div>
              <LumenMap 
                parrocchie={filteredParrocchie} 
                currentUserParrocchiaId={currentUserParrocchiaId} 
                onOpenChat={apriChatConParrocchia} 
                onOpenInfo={apriInfoParrocchia}
              />
            </div>

            {/* FILTRI */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cerca parrocchia, diocesi o codice..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={selectedDiocesi}
                onChange={(e) => setSelectedDiocesi(e.target.value)}
                className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 cursor-pointer"
              >
                <option value="all">Tutte le Diocesi</option>
                {diocesiList.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* GRIGLIA */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredParrocchie.length === 0 ? (
                <div className="col-span-full py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                  Nessuna parrocchia trovata con i filtri selezionati.
                </div>
              ) : (
                filteredParrocchie.map((p) => {
                  const isCurrent = p.id === currentUserParrocchiaId;
                  return (
                    <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                            <Church className="w-5 h-5" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isCurrent && (
                              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                                La tua parrocchia
                              </span>
                            )}
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-200">
                              {p.codice}
                            </span>
                          </div>
                        </div>

                        <div>
                          <h2 className="text-sm font-bold text-slate-900 font-serif">{p.nome_parrocchia}</h2>
                          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {p.diocesi} {p.citta ? `(${p.citta})` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => apriInfoParrocchia(p)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5" /> Info
                        </button>

                        {!isCurrent && (
                          <button
                            onClick={() => apriChatConParrocchia(p)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> Chat
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        ) : (
          /* CHAT */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex overflow-hidden h-[calc(100vh-200px)] flex-1">
            <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50/50">
              <div className="p-4 border-b border-slate-200 bg-white">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Parrocchie in Chat</h2>
              </div>
              <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                {parrocchie
                  .filter(p => p.id !== currentUserParrocchiaId)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedParrocchiaChat(p);
                        fetchMessaggiChat(p.id);
                      }}
                      className={`w-full text-left p-4 flex items-center justify-between transition cursor-pointer ${
                        selectedParrocchiaChat?.id === p.id ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-100/60'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 truncate">{p.nome_parrocchia}</div>
                        <div className="text-[10px] text-blue-600 font-semibold uppercase mt-0.5">{p.diocesi}</div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            <div className="flex-1 flex flex-col bg-[#efeae2]/30">
              {selectedParrocchiaChat ? (
                <>
                  <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">{selectedParrocchiaChat.nome_parrocchia}</h3>
                      <p className="text-[10px] text-blue-600 font-semibold uppercase">{selectedParrocchiaChat.diocesi}</p>
                    </div>
                    <button
                      onClick={() => apriInfoParrocchia(selectedParrocchiaChat)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5" /> Dettagli Parrocchia
                    </button>
                  </div>

                  <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    {messaggi.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-xs text-slate-400 bg-white px-4 py-2 rounded-xl shadow-2xs border border-slate-100">
                          Nessun messaggio con questa parrocchia. Inizia la conversazione!
                        </p>
                      </div>
                    ) : (
                      messaggi.map((m) => {
                        const isMe = m.mittente_id === currentUserId;
                        return (
                          <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-md rounded-2xl px-4 py-2.5 text-xs shadow-2xs ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'}`}>
                              <p className="leading-relaxed">{m.testo}</p>
                              <span className={`block text-[9px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={inviaMessaggioChat} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Scrivi un messaggio alla parrocchia..."
                      value={testoMessaggio}
                      onChange={(e) => setTestoMessaggio(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-slate-100 border border-transparent rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 transition"
                    />
                    <button
                      type="submit"
                      className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition cursor-pointer flex items-center justify-center"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                  Seleziona una parrocchia dalla lista a sinistra per aprire la chat.
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* MODALE INFORMAZIONI PARROCCHIA */}
      {infoModalOpen && parrocchiaInfo && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Church className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-serif text-slate-900">{parrocchiaInfo.nome_parrocchia}</h3>
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {parrocchiaInfo.codice}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setInfoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl space-y-2 border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dati Territoriali</div>
                <div className="flex items-start gap-2 text-slate-700">
                  <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{parrocchiaInfo.diocesi}</p>
                    <p className="text-slate-500">{parrocchiaInfo.indirizzo} {parrocchiaInfo.citta ? `- ${parrocchiaInfo.citta}` : ''} ({parrocchiaInfo.paese || 'Italia'})</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/50 p-3.5 rounded-xl space-y-2 border border-blue-100/60">
                <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Referente Istituzionale</div>
                <div className="flex items-center gap-2 text-slate-700">
                  <User className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-semibold text-slate-900">{parrocchiaInfo.referente_nome}</span>
                </div>
                {parrocchiaInfo.referente_email && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{parrocchiaInfo.referente_email}</span>
                  </div>
                )}
                {parrocchiaInfo.referente_telefono && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{parrocchiaInfo.referente_telefono}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setInfoModalOpen(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}