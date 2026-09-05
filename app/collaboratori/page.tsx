'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header  from '@/components/Header';
import { ArrowLeft, UserPlus, Shield, Users, Pencil, Trash2, Check, X, Globe } from 'lucide-react';

interface UtenteProfilo {
  id: string;
  nome: string;
  cognome: string;
  username?: string;
  ruolo: string;
  paese?: string;
  lingua?: string;
  parrocchia_id?: string;
  created_at: string;
}

export default function GestioneUtenti() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [utenti, setUtenti] = useState<UtenteProfilo[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('operatore');
  const [currentUserParrocchiaId, setCurrentUserParrocchiaId] = useState<string | null>(null);

  // Stato per la modifica inline dell'utente
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    nome: '',
    cognome: '',
    username: '',
    ruolo: 'operatore',
    paese: 'IT',
    lingua: 'it',
  });

  // Stato per la creazione del nuovo utente
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    username: '',
    password: '',
    ruolo: 'operatore',
    paese: 'IT',
    lingua: 'it',
  });

  useEffect(() => {
    checkAdminAndFetchUsers();
  }, []);

  async function checkAdminAndFetchUsers() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    setCurrentUserId(session.user.id);

    // Recupera il profilo dell'utente loggato per conoscerne il ruolo e la parrocchia
    const { data: profilo } = await supabase
      .from('profili')
      .select('ruolo, parrocchia_id')
      .eq('id', session.user.id)
      .single();

    if (!profilo || (profilo.ruolo !== 'super_admin' && profilo.ruolo !== 'admin')) {
      alert('Accesso non autorizzato. Sezione riservata agli amministratori.');
      router.push('/');
      return;
    }

    setCurrentUserRole(profilo.ruolo);
    setCurrentUserParrocchiaId(profilo.parrocchia_id);

    fetchUtenti(profilo.ruolo, profilo.parrocchia_id);
  }

  async function fetchUtenti(ruolo: string, parrocchiaId: string | null) {
    let query = supabase.from('profili').select('*').order('created_at', { ascending: false });

    // Se l'utente è un Admin di Parrocchia (non Super Admin), filtra solo per la sua parrocchia
    if (ruolo === 'admin' && parrocchiaId) {
      query = query.eq('parrocchia_id', parrocchiaId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setUtenti(data);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Se l'utente è admin locale, forziamo la sua parrocchia_id nel payload inviato alle API
      const payload = {
        ...formData,
        parrocchia_id: currentUserRole === 'admin' ? currentUserParrocchiaId : undefined,
        // Gli admin locali non possono creare super_admin
        ruolo: currentUserRole === 'admin' && formData.ruolo === 'super_admin' ? 'admin' : formData.ruolo
      };

      const res = await fetch('/api/utenti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const textData = await res.text();
      let data;
      try {
        data = JSON.parse(textData);
      } catch {
        alert(`Errore Server: ${textData.substring(0, 150)}`);
        setSubmitting(false);
        return;
      }

      if (!res.ok) {
        alert(`Errore: ${data.error}`);
      } else {
        alert('Nuovo collaboratore creato con successo!');
        setFormData({
          nome: '',
          cognome: '',
          username: '',
          password: '',
          ruolo: 'operatore',
          paese: 'IT',
          lingua: 'it',
        });
        fetchUtenti(currentUserRole, currentUserParrocchiaId);
      }
    } catch (err: any) {
      alert(`Errore di rete: ${err.message}`);
    }

    setSubmitting(false);
  }

  // Avvia la modifica di un utente caricando i dati attuali
  function handleStartEdit(u: UtenteProfilo) {
    setEditingUserId(u.id);
    setEditForm({
      nome: u.nome || '',
      cognome: u.cognome || '',
      username: u.username || '',
      ruolo: u.ruolo || 'operatore',
      paese: u.paese || 'IT',
      lingua: u.lingua || 'it',
    });
  }

  // Salva le modifiche apportate al collaboratore
  async function handleSaveEdit(id: string) {
    try {
      const res = await fetch('/api/utenti/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editForm }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`Errore aggiornamento: ${data.error}`);
      } else {
        setEditingUserId(null);
        fetchUtenti(currentUserRole, currentUserParrocchiaId);
      }
    } catch (err: any) {
      alert(`Errore di rete: ${err.message}`);
    }
  }

  // Funzione per eliminare l'utente
  async function handleDeleteUser(id: string, nomeCompleto: string) {
    if (id === currentUserId) {
      alert('Non puoi eliminare il tuo stesso utente mentre sei connesso!');
      return;
    }

    const conferma = confirm(`Sei sicuro di voler eliminare definitivamente il collaboratore ${nomeCompleto}?`);
    if (!conferma) return;

    try {
      const res = await fetch(`/api/utenti/delete?id=${id}`, {
        method: 'DELETE',
      });
      
      const textData = await res.text();
      let data;
      try {
        data = JSON.parse(textData);
      } catch {
        alert(`Errore Server: ${textData.substring(0, 150)}`);
        return;
      }

      if (!res.ok) {
        alert(`Errore durante l'eliminazione: ${data.error}`);
      } else {
        alert('Collaboratore eliminato con successo.');
        fetchUtenti(currentUserRole, currentUserParrocchiaId);
      }
    } catch (err: any) {
      alert(`Errore di rete: ${err.message}`);
    }
  }

  const etichetteRuolo: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Amministratore',
    operatore: 'Operatore',
    lettura: 'Solo Lettura',
  };

  return (
    <>
      <Header titoloPagina="Gestione Collaboratori Parrocchiali" />
<main className="min-h-screen bg-slate-50 p-6 md:p-12 text-slate-800">
  <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form per nuovo utente */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
              <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-slate-800">
                  Nuovo Collaboratore
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Es. Marco"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Cognome
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Es. Rossi"
                    value={formData.cognome}
                    onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Nome Utente (Username)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="es. marco.rossi"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Password Iniziale
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Selezione Paese e Lingua */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      Paese / Stato
                    </label>
                    <select
                      value={formData.paese}
                      onChange={(e) => setFormData({ ...formData, paese: e.target.value })}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer"
                    >
                      <option value="IT">Italia (IT)</option>
                      <option value="USA">Stati Uniti (USA)</option>
                      <option value="ES">Spagna (ES)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      Lingua Interfaccia
                    </label>
                    <select
                      value={formData.lingua}
                      onChange={(e) => setFormData({ ...formData, lingua: e.target.value })}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer"
                    >
                      <option value="it">Italiano</option>
                      <option value="en">English</option>
                      <option value="es">Español</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Ruolo Assegnato
                  </label>
                  <select
                    value={formData.ruolo}
                    onChange={(e) => setFormData({ ...formData, ruolo: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="lettura">Solo Lettura (Consultazione & PDF)</option>
                    <option value="operatore">Operatore (Inserimento Atti)</option>
                    <option value="admin">Amministratore (Inserimento & Modifica)</option>
                    {currentUserRole === 'super_admin' && (
                      <option value="super_admin">Super Admin (Accesso Totale)</option>
                    )}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl shadow text-sm transition cursor-pointer mt-4"
                >
                  {submitting ? 'Creazione in corso...' : 'Crea Utenza'}
                </button>
              </form>
            </div>

            {/* Tabella Utenti Esistenti con modifica in linea */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                    <Users className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold text-slate-800">
                    Collaboratori Registrati
                  </h2>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Caricamento utenze...
                </div>
              ) : utenti.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Nessun collaboratore trovato.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-100">
                      <th className="p-4">Nome e Cognome</th>
                      <th className="p-4">Username</th>
                      <th className="p-4">Paese / Lang</th>
                      <th className="p-4">Ruolo</th>
                      <th className="p-4 text-right">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {utenti.map((u) => {
                      const isEditing = editingUserId === u.id;
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/60 transition">
                          {/* Nome e Cognome */}
                          <td className="p-4 font-semibold text-slate-900">
                            {isEditing ? (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={editForm.nome}
                                  onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                                  placeholder="Nome"
                                  className="w-24 p-1.5 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                  type="text"
                                  value={editForm.cognome}
                                  onChange={(e) => setEditForm({ ...editForm, cognome: e.target.value })}
                                  placeholder="Cognome"
                                  className="w-28 p-1.5 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            ) : (
                              `${u.nome || ''} ${u.cognome || ''}`
                            )}
                          </td>

                          {/* Username */}
                          <td className="p-4 text-xs font-mono text-slate-600">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editForm.username}
                                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                placeholder="Username"
                                className="w-32 p-1.5 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            ) : (
                              u.username || '-'
                            )}
                          </td>

                          {/* Paese e Lingua */}
                          <td className="p-4 text-xs text-slate-600">
                            {isEditing ? (
                              <div className="flex gap-1.5">
                                <select
                                  value={editForm.paese}
                                  onChange={(e) => setEditForm({ ...editForm, paese: e.target.value })}
                                  className="p-1 border border-slate-300 rounded text-xs bg-white"
                                >
                                  <option value="IT">IT</option>
                                  <option value="USA">USA</option>
                                  <option value="ES">ES</option>
                                </select>
                                <select
                                  value={editForm.lingua}
                                  onChange={(e) => setEditForm({ ...editForm, lingua: e.target.value })}
                                  className="p-1 border border-slate-300 rounded text-xs bg-white"
                                >
                                  <option value="it">it</option>
                                  <option value="en">en</option>
                                  <option value="es">es</option>
                                </select>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-mono bg-slate-100 px-2 py-1 rounded text-xs text-slate-700 border border-slate-200">
                                <Globe className="w-3 h-3 text-blue-500" />
                                {u.paese || 'IT'} / {u.lingua || 'it'}
                              </span>
                            )}
                          </td>

                          {/* Ruolo */}
                          <td className="p-4">
                            {isEditing ? (
                              <select
                                value={editForm.ruolo}
                                onChange={(e) => setEditForm({ ...editForm, ruolo: e.target.value })}
                                className="p-1.5 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="lettura">Solo Lettura</option>
                                <option value="operatore">Operatore</option>
                                <option value="admin">Amministratore</option>
                                {currentUserRole === 'super_admin' && (
                                  <option value="super_admin">Super Admin</option>
                                )}
                              </select>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                <Shield className="w-3.5 h-3.5 text-blue-600" />
                                {etichetteRuolo[u.ruolo] || u.ruolo}
                              </span>
                            )}
                          </td>

                          {/* Azioni */}
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleSaveEdit(u.id)}
                                    title="Salva modifiche"
                                    className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-md transition cursor-pointer"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingUserId(null)}
                                    title="Annulla"
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition cursor-pointer"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleStartEdit(u)}
                                    title="Modifica Collaboratore"
                                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(u.id, `${u.nome} ${u.cognome}`)}
                                    title="Elimina Utente"
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}