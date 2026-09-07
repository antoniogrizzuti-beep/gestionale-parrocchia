'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { Send, User, ShieldCheck, Paperclip, FileText } from 'lucide-react';

interface Profilo {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  ruolo: string;
}

interface Messaggio {
  id: string;
  mittente_id: string;
  destinatario_id: string | null;
  testo: string;
  allegato_url?: string | null;
  created_at: string;
  letto_da_operatore: boolean;
}

export default function BachecaChatPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [collaboratori, setCollaboratori] = useState<Profilo[]>([]);
  const [selectedContact, setSelectedContact] = useState<Profilo | null>(null);
  const [messaggi, setMessaggi] = useState<Messaggio[]>([]);
  const [tuttiMessaggi, setTuttiMessaggi] = useState<Messaggio[]>([]);
  const [testoMessaggio, setTestoMessaggio] = useState('');
  const [fileAllegato, setFileAllegato] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messaggi]);

  async function initChat() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push('/login');
      return;
    }

    setCurrentUser(session.user);

    const { data: profiloCorrente } = await supabase
      .from('profili')
      .select('ruolo, parrocchia_id')
      .eq('id', session.user.id)
      .single();

    let query = supabase
      .from('profili')
      .select('*')
      .neq('id', session.user.id);

    if (profiloCorrente?.ruolo !== 'super_admin' && profiloCorrente?.parrocchia_id) {
      query = query.eq('parrocchia_id', profiloCorrente.parrocchia_id);
    }

    const { data: profiliData } = await query;

    const { data: messaggiData } = await supabase
      .from('bacheca_ticket')
      .select('*')
      .or(`mittente_id.eq.${session.user.id},destinatario_id.eq.${session.user.id}`);

    if (messaggiData) {
      setTuttiMessaggi(messaggiData);
    }

    if (profiliData && profiliData.length > 0) {
      const collaboratoriOrdinati = ordinaCollaboratori(profiliData, messaggiData || [], session.user.id);
      setCollaboratori(collaboratoriOrdinati);
      setSelectedContact(collaboratoriOrdinati[0]);
      fetchMessaggi(session.user.id, collaboratoriOrdinati[0].id);
    } else {
      setCollaboratori([]);
      setSelectedContact(null);
    }

    setLoading(false);
  }

  function ordinaCollaboratori(listaProfili: Profilo[], listaMessaggi: Messaggio[], myId: string) {
    return [...listaProfili].sort((a, b) => {
      const msgA = listaMessaggi
        .filter(m => m.mittente_id === a.id || m.destinatario_id === a.id)
        .sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime())[0];

      const msgB = listaMessaggi
        .filter(m => m.mittente_id === b.id || m.destinatario_id === b.id)
        .sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime())[0];

      const timeA = msgA ? new Date(msgA.created_at).getTime() : 0;
      const timeB = msgB ? new Date(msgB.created_at).getTime() : 0;

      return timeB - timeA;
    });
  }

  async function fetchMessaggi(myId: string, contactId: string) {
    const { data, error } = await supabase
      .from('bacheca_ticket')
      .select('*')
      .or(`and(mittente_id.eq.${myId},destinatario_id.eq.${contactId}),and(mittente_id.eq.${contactId},destinatario_id.eq.${myId})`)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessaggi(data);
    }
  }

  const handleSelectContact = async (contact: Profilo) => {
    setSelectedContact(contact);
    if (currentUser) {
      await fetchMessaggi(currentUser.id, contact.id);

      await supabase
        .from('bacheca_ticket')
        .update({ letto_da_operatore: true })
        .eq('mittente_id', contact.id)
        .eq('destinatario_id', currentUser.id)
        .eq('letto_da_operatore', false);

      setTuttiMessaggi(prev =>
        prev.map(m =>
          m.mittente_id === contact.id && m.destinatario_id === currentUser.id
            ? { ...m, letto_da_operatore: true }
            : m
        )
      );
    }
  };

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if ((!testoMessaggio.trim() && !fileAllegato) || !selectedContact || !currentUser) return;

    let allegatoUrl = null;

    if (fileAllegato) {
      const fileName = `${Date.now()}_${fileAllegato.name}`;
      const { error: uploadError } = await supabase.storage
        .from('chat-allegati')
        .upload(fileName, fileAllegato);

      if (uploadError) {
        alert('Errore caricamento file: ' + uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('chat-allegati')
        .getPublicUrl(fileName);

      allegatoUrl = publicUrlData.publicUrl;
    }

    const testo = testoMessaggio.trim();
    setTestoMessaggio('');
    setFileAllegato(null);

    const { error } = await supabase.from('bacheca_ticket').insert([
      {
        mittente_id: currentUser.id,
        destinatario_id: selectedContact.id,
        testo: testo,
        allegato_url: allegatoUrl,
        stato: 'In attesa',
        letto_da_operatore: false
      }
    ]);

    if (error) {
      alert('Errore invio messaggio: ' + error.message);
    } else {
      fetchMessaggi(currentUser.id, selectedContact.id);

      const { data: aggiornaMessaggi } = await supabase
        .from('bacheca_ticket')
        .select('*')
        .or(`mittente_id.eq.${currentUser.id},destinatario_id.eq.${currentUser.id}`);

      if (aggiornaMessaggi) {
        setTuttiMessaggi(aggiornaMessaggi);
        setCollaboratori(prev => ordinaCollaboratori(prev, aggiornaMessaggi, currentUser.id));
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-slate-500 text-sm">
        Caricamento chat in corso...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col">
      
      {/* Header Unificato e Sticky */}
      <Header titoloPagina="Parla con il tuo team" />

      {/* Contenitore principale Chat */}
      <div className="max-w-6xl w-full mx-auto p-4 md:p-6 flex-1 flex">
        <div className="bg-white w-full rounded-2xl border border-slate-200 shadow-sm flex overflow-hidden h-[calc(100vh-140px)]">
          
          {/* COLONNA SINISTRA: Lista Contatti */}
          <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50/50">
            <div className="p-4 border-b border-slate-200 bg-white">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Collaboratori</h2>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {collaboratori.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">Nessun collaboratore trovato.</div>
              ) : (
                collaboratori.map((c) => {
                  const isSelected = selectedContact?.id === c.id;
                  const nomeCompleto = c.nome ? `${c.nome} ${c.cognome || ''}` : c.email;

                  const nonLettiCount = tuttiMessaggi.filter(
                    (m) => m.mittente_id === c.id && m.destinatario_id === currentUser?.id && !m.letto_da_operatore
                  ).length;

                  return (
                    <button
                      key={c.id}
                      onClick={() => handleSelectContact(c)}
                      className={`w-full text-left p-4 flex items-center justify-between transition cursor-pointer ${
                        isSelected ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                          {c.nome ? c.nome.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">{nomeCompleto}</div>
                          <div className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center gap-1 mt-0.5">
                            <ShieldCheck className="w-3 h-3 text-blue-500" /> {c.ruolo.replace('_', ' ')}
                          </div>
                        </div>
                      </div>

                      {nonLettiCount > 0 && (
                        <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                          {nonLettiCount}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* COLONNA DESTRA: Area Messaggi */}
          <div className="flex-1 flex flex-col bg-[#efeae2]/30">
            {selectedContact ? (
              <>
                <div className="p-4 bg-white border-b border-slate-200 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
                    {selectedContact.nome ? selectedContact.nome.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      {selectedContact.nome ? `${selectedContact.nome} ${selectedContact.cognome || ''}` : selectedContact.email}
                    </h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                      {selectedContact.ruolo.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                  {messaggi.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-xs text-slate-400 bg-white/80 px-4 py-2 rounded-xl shadow-2xs border border-slate-100">
                        Nessun messaggio con questo collaboratore. Inizia la conversazione!
                      </p>
                    </div>
                  ) : (
                    messaggi.map((m) => {
                      const isMe = m.mittente_id === currentUser?.id;
                      return (
                        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-md rounded-2xl px-4 py-2.5 text-xs shadow-2xs ${
                              isMe
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                            }`}
                          >
                            {m.allegato_url && (
                              <div className="mb-2">
                                {m.allegato_url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                  <a href={m.allegato_url} target="_blank" rel="noopener noreferrer">
                                    <img src={m.allegato_url} alt="Allegato" className="max-h-48 rounded-lg object-cover cursor-pointer hover:opacity-90 transition" />
                                  </a>
                                ) : (
                                  <a href={m.allegato_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-2 rounded-lg text-xs underline ${isMe ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-800'}`}>
                                    <FileText className="w-4 h-4" /> Apri documento allegato
                                  </a>
                                )}
                              </div>
                            )}

                            <p className="leading-relaxed whitespace-pre-wrap">{m.testo}</p>
                            <span
                              className={`block text-[9px] mt-1 text-right ${
                                isMe ? 'text-blue-200' : 'text-slate-400'
                              }`}
                            >
                              {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                  <label className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition cursor-pointer" title="Allega file">
                    <Paperclip className="w-4 h-4" />
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files?.[0]) setFileAllegato(e.target.files[0]);
                      }} 
                    />
                  </label>

                  {fileAllegato && (
                    <span className="text-[11px] bg-blue-50 text-blue-600 px-2 py-1 rounded-md truncate max-w-[120px]">
                      {fileAllegato.name}
                    </span>
                  )}

                 <input
  type="text"
  placeholder="Scrivi un messaggio al team..."
  value={testoMessaggio}
  onChange={(e) => setTestoMessaggio(e.target.value)}
  className="flex-1 px-4 py-2.5 bg-slate-100 border border-transparent rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 transition"
/>
                  <button
                    type="submit"
                    className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-sm cursor-pointer flex items-center justify-center"
                    title="Invia"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                Seleziona un collaboratore dalla lista a sinistra per iniziare a chattare.
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}