'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { registraLog } from '@/lib/logger';
import {
  ArrowLeft,
  Save,
  BookOpen,
  User,
  Eye,
  Lock,
  Church,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  History,
} from 'lucide-react';

interface BattesimoSearchResult {
  id: string;
  nome: string;
  cognome: string;
  sesso: string;
  data_nascita: string;
  luogo_nascita: string;
  data_battesimo: string;
  luogo_battesimo: string;
}

export default function NuovaComunionePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const editId = searchParams.get('id');
  const modeParam = searchParams.get('mode');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [userRole, setUserRole] = useState<string>('lettura');

  // Stato per la ricerca nei battesimi
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BattesimoSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchErrorMessage, setSearchErrorMessage] = useState('');
  const [selectedFromBattesimi, setSelectedFromBattesimi] = useState(false);

  // Stato per la cronologia / log dell'atto
  const [cronologia, setCronologia] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    numero_atto: '',
    cognome: '',
    nome: '',
    sesso: 'M',
    data_nascita: '',
    luogo_nascita: 'Sassari',
    data_battesimo: '',
    chiesa_battesimo: 'MATER ECCLESIAE',
    data_comunione: '2026-06-07',
    chiesa_comunione: 'Sassari - Mater Ecclesiae',
    ministro: 'd. Massimiliano Salis',
    annotazioni: '',
  });

  useEffect(() => {
    async function checkPermessiAndFetch() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profilo } = await supabase
        .from('profili')
        .select('ruolo')
        .eq('id', session.user.id)
        .single();

      const ruoloCorrente = profilo?.ruolo || 'lettura';
      setUserRole(ruoloCorrente);

      const isLetturaRole = ruoloCorrente === 'lettura';
      const isExplicitView = modeParam === 'view';

      const lockForm = isLetturaRole || isExplicitView;
      setIsViewMode(lockForm);

      if (isLetturaRole && !editId) {
        alert('Non hai i permessi per inserire nuovi atti.');
        router.replace('/');
        return;
      }

      if (editId) {
        const { data: atto, error } = await supabase
          .from('comunioni')
          .select('*')
          .eq('id', editId)
          .single();

        if (!error && atto) {
          setFormData({
            numero_atto: atto.numero_atto ? String(atto.numero_atto) : '',
            cognome: atto.cognome || '',
            nome: atto.nome || '',
            sesso: atto.sesso || 'M',
            data_nascita: atto.data_nascita || '',
            luogo_nascita: atto.luogo_nascita || 'Sassari',
            data_battesimo: atto.data_battesimo || '',
            chiesa_battesimo: atto.chiesa_battesimo || '',
            data_comunione: atto.data_comunione || '',
            chiesa_comunione: atto.chiesa_comunione || 'Sassari - Mater Ecclesiae',
            ministro: atto.ministro || 'd. Massimiliano Salis',
            annotazioni: atto.annotazioni || '',
          });
          setSelectedFromBattesimi(true);
        }

        const { data: logs } = await supabase
          .from('registri_log')
          .select('*')
          .eq('record_id', editId)
          .order('created_at', { ascending: true });

        setCronologia(logs || []);
      }

      setLoading(false);
    }

    checkPermessiAndFetch();
  }, [editId, modeParam, router]);

  async function handleSearchBattesimi(query: string) {
    setSearchQuery(query);
    setSearchErrorMessage('');

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const term = query.trim();

    try {
      const [resCognome, resNome] = await Promise.all([
        supabase
          .from('battesimi')
          .select('id, nome, cognome, sesso, data_nascita, luogo_nascita, data_battesimo, luogo_battesimo')
          .ilike('cognome', `%${term}%`)
          .limit(5),
        supabase
          .from('battesimi')
          .select('id, nome, cognome, sesso, data_nascita, luogo_nascita, data_battesimo, luogo_battesimo')
          .ilike('nome', `%${term}%`)
          .limit(5)
      ]);

      if (resCognome.error || resNome.error) {
        const err = resCognome.error?.message || resNome.error?.message || 'Errore di lettura';
        setSearchErrorMessage(`Errore query: ${err}`);
        setSearchResults([]);
      } else {
        const combined = [...(resCognome.data || []), ...(resNome.data || [])];
        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
        setSearchResults(unique);
      }
    } catch (e: any) {
      setSearchErrorMessage(`Errore inatteso: ${e.message}`);
    } finally {
      setIsSearching(false);
    }
  }

  function handleSelectBattesimo(b: BattesimoSearchResult) {
    setFormData((prev) => ({
      ...prev,
      nome: b.nome || '',
      cognome: b.cognome || '',
      sesso: b.sesso || 'M',
      data_nascita: b.data_nascita || '',
      luogo_nascita: b.luogo_nascita || 'Sassari',
      data_battesimo: b.data_battesimo || '',
      chiesa_battesimo: b.luogo_battesimo || 'MATER ECCLESIAE',
    }));

    setSearchResults([]);
    setSearchQuery('');
    setSelectedFromBattesimi(true);
  }

  async function handleGeneraPDF() {
    if (editId) {
      await registraLog('comunioni', editId, 'STAMPA_CERTIFICATO', 'Generazione certificato PDF');
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Impossibile aprire la finestra di stampa. Controlla le impostazioni dei popup del browser.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <title>Certificato di Prima Comunione - ${formData.cognome} ${formData.nome}</title>
        <style>
          body { font-family: 'Times New Roman', serif; margin: 40px; color: #111; text-align: center; }
          .container { border: 4px double #1e293b; padding: 40px; max-width: 700px; margin: 0 auto; position: relative; }
          h2 { text-transform: uppercase; letter-spacing: 2px; font-size: 16px; margin-bottom: 5px; color: #334155; }
          h1 { font-size: 24px; margin-bottom: 20px; color: #0f172a; }
          .certifica { font-style: italic; font-size: 15px; margin: 20px 0; }
          .nome-persona { font-size: 22px; font-weight: bold; text-transform: uppercase; margin: 15px 0; border-bottom: 1px solid #cbd5e1; display: inline-block; padding-bottom: 5px; }
          .dettagli { text-align: left; margin: 30px auto; width: 85%; font-size: 15px; line-height: 1.8; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; font-size: 14px; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>PARROCCHIA MATER ECCLESIAE</h2>
          <p style="margin: 0; font-size: 13px;">Arcidiocesi di Sassari</p>
          
          <h1 style="margin-top: 30px;">ATTO DI PRIMA COMUNIONE</h1>
          
          <p class="certifica">Si certifica che</p>
          <div class="nome-persona">${formData.cognome} ${formData.nome}</div>
          
          <div class="dettagli">
            <p><strong>Nato/a a:</strong> ${formData.luogo_nascita || 'Sassari'} il ${formData.data_nascita ? new Date(formData.data_nascita).toLocaleDateString('it-IT') : '________'}</p>
            <p><strong>Battezzato/a presso:</strong> ${formData.chiesa_battesimo || 'MATER ECCLESIAE'} in data ${formData.data_battesimo ? new Date(formData.data_battesimo).toLocaleDateString('it-IT') : '________'}</p>
            <p><strong>Ha ricevuto la Prima S. Comunione</strong> in questa Chiesa Parrocchiale di Mater Ecclesiae in data <strong>${formData.data_comunione ? new Date(formData.data_comunione).toLocaleDateString('it-IT') : '________'}</strong>.</p>
            <p><strong>Ministro celebrante:</strong> ${formData.ministro || 'd. Massimiliano Salis'}</p>
            ${formData.annotazioni ? `<p><strong>Annotazioni:</strong> ${formData.annotazioni}</p>` : ''}
          </div>

          <div class="footer">
            <div>
              <p>Data: ${new Date().toLocaleDateString('it-IT')}</p>
            </div>
            <div style="text-align: right;">
              <p>Il Parroco</p>
              <br><br>
              <p>___________________________</p>
            </div>
          </div>

          <div class="no-print" style="margin-top: 40px;">
            <button onclick="window.print()" style="padding: 10px 20px; font-size: 14px; background: #047857; color: white; border: none; border-radius: 6px; cursor: pointer;">Stampa / Salva PDF</button>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isViewMode) return;
    setSubmitting(true);

    const payload = {
      ...formData,
      numero_atto: formData.numero_atto ? parseInt(formData.numero_atto, 10) : null,
      data_nascita: formData.data_nascita || null,
      data_battesimo: formData.data_battesimo || null,
    };

    let error;
    if (editId) {
      const res = await supabase.from('comunioni').update(payload).eq('id', editId);
      error = res.error;
      if (!error) {
        await registraLog('comunioni', editId, 'MODIFICA', 'Aggiornamento dati atto di Prima Comunione');
      }
    } else {
      const res = await supabase.from('comunioni').insert([payload]).select().single();
      error = res.error;
      if (!error && res.data) {
        await registraLog('comunioni', res.data.id, 'CREAZIONE', 'Registrazione nuovo atto di Prima Comunione');
      }
    }

    if (error) {
      alert(`Errore durante il salvataggio: ${error.message}`);
      setSubmitting(false);
    } else {
      router.push('/?view=comunioni');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
        Caricamento atto in corso...
      </div>
    );
  }

  // BLOCCO DEFINITIVO DELL'ANAGRAFICA
const isAnagraficaLocked = isViewMode || selectedFromBattesimi || Boolean(editId);
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 text-slate-800">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Torna indietro
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Intestazione */}
          <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-600 rounded-xl">
                {isViewMode ? <Eye className="w-6 h-6 text-white" /> : <BookOpen className="w-6 h-6 text-white" />}
              </div>
              <div>
                <h1 className="text-xl font-bold font-serif">
                  {isViewMode
                    ? 'Consultazione Atto di Prima Comunione'
                    : editId
                    ? 'Modifica Atto di Prima Comunione'
                    : 'Registrazione Atto di Prima Comunione'}
                </h1>
                <p className="text-xs text-slate-300">
                  {isViewMode
                    ? 'Modalità solo visualizzazione - Modifiche disabilitate'
                    : 'Modulo conforme al Registro Parrocchiale delle Prime Comunioni'}
                </p>
              </div>
            </div>

            {isViewMode && (
              <span className="inline-flex items-center gap-1.5 bg-slate-800 text-amber-400 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-700">
                <Lock className="w-3.5 h-3.5" /> Solo Lettura
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">

            {/* BOX DI RICERCA NEI BATTEZZATI */}
            {!isViewMode && !editId && (
              <div className="p-5 bg-emerald-50/80 border border-emerald-200 rounded-2xl">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider mb-1">
                  <Search className="w-4 h-4 text-emerald-600" /> Auto-compilazione da Registro Battesimi
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  Cerca per nome o cognome: se il ragazzo/a è stato battezzato a Mater Ecclesiae, compilerà tutti i dati e bloccherà i campi anagrafici per sicurezza.
                </p>

                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchBattesimi(e.target.value)}
                    placeholder="Digita cognome o nome (es. Mongiu)..."
                    className="w-full p-3 bg-white border border-emerald-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                  />

                  {isSearching && (
                    <span className="absolute right-3 top-3.5 text-xs text-emerald-600 font-medium">Cerca...</span>
                  )}

                  {/* Tendina dei risultati */}
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden divide-y divide-slate-100">
                      {searchResults.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleSelectBattesimo(b)}
                          className="w-full text-left p-3 hover:bg-emerald-50 transition flex justify-between items-center text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{b.cognome} {b.nome}</span>
                            <span className="text-slate-500 ml-2">
                              Nato/a il {b.data_nascita ? new Date(b.data_nascita).toLocaleDateString('it-IT') : '-'}
                            </span>
                          </div>
                          <span className="text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md font-medium text-[11px]">
                            Importa dati
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {searchErrorMessage && (
                  <div className="mt-2 text-xs text-rose-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {searchErrorMessage}
                  </div>
                )}

                {searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && !searchErrorMessage && (
                  <div className="mt-2 text-xs text-amber-700 font-medium">
                    Nessun battezzato trovato con "{searchQuery}" nel registro parrocchiale. Puoi proseguire con l'inserimento manuale.
                  </div>
                )}

                {selectedFromBattesimi && (
                  <div className="mt-2.5 text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Dati anagrafici e di battesimo importati e messi in sicurezza!
                  </div>
                )}
              </div>
            )}

            {/* SEZIONE 1: Dati Anagrafici */}
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" /> 1. Anagrafica Comunicando/a
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Atto N° (Comunione)
                  </label>
                  <input
                    type="number"
                    disabled={isViewMode}
                    placeholder="Es. 53"
                    value={formData.numero_atto}
                    onChange={(e) => setFormData({ ...formData, numero_atto: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Cognome
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isAnagraficaLocked}
                    placeholder="Es. MONGIU"
                    value={formData.cognome}
                    onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isAnagraficaLocked}
                    placeholder="Es. FILIPPO"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Sesso
                  </label>
                  <select
                    disabled={isAnagraficaLocked}
                    value={formData.sesso}
                    onChange={(e) => setFormData({ ...formData, sesso: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                  >
                    <option value="M">Maschile (nato)</option>
                    <option value="F">Femminile (nata)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Data di Nascita
                  </label>
                  <input
                    type="date"
                    disabled={isAnagraficaLocked}
                    value={formData.data_nascita}
                    onChange={(e) => setFormData({ ...formData, data_nascita: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Luogo di Nascita
                  </label>
                  <input
                    type="text"
                    disabled={isAnagraficaLocked}
                    placeholder="Es. Sassari"
                    value={formData.luogo_nascita}
                    onChange={(e) => setFormData({ ...formData, luogo_nascita: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* SEZIONE 2: Dati Battesimo */}
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Church className="w-4 h-4 text-emerald-600" /> 2. Estremi del Battesimo (Origine)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Data Battesimo
                  </label>
                  <input
                    type="date"
                    disabled={isAnagraficaLocked}
                    value={formData.data_battesimo}
                    onChange={(e) => setFormData({ ...formData, data_battesimo: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Battezzato/a presso (Parrocchia)
                  </label>
                  <input
                    type="text"
                    disabled={isAnagraficaLocked}
                    placeholder="Es. MATER ECCLESIAE / SAN GIUSEPPE"
                    value={formData.chiesa_battesimo}
                    onChange={(e) => setFormData({ ...formData, chiesa_battesimo: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* SEZIONE 3: Messa di Prima Comunione */}
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" /> 3. Messa di Prima Comunione
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Data Prima Comunione
                  </label>
                  <input
                    type="date"
                    required
                    disabled={isViewMode}
                    value={formData.data_comunione}
                    onChange={(e) => setFormData({ ...formData, data_comunione: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Nella Chiesa di
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isViewMode}
                    value={formData.chiesa_comunione}
                    onChange={(e) => setFormData({ ...formData, chiesa_comunione: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Ministro Celebrante
                  </label>
                  <input
                    type="text"
                    disabled={isViewMode}
                    value={formData.ministro}
                    onChange={(e) => setFormData({ ...formData, ministro: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* SEZIONE 4: Annotazioni */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Annotazioni
              </label>
              <textarea
                rows={2}
                disabled={isViewMode}
                placeholder="Note eventuali..."
                value={formData.annotazioni}
                onChange={(e) => setFormData({ ...formData, annotazioni: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
              />
            </div>

            {/* NOTA A PIÈ DI PAGINA / CRONOLOGIA EVENTI (Riservata a Admin e Super Admin) */}
            {editId && cronologia.length > 0 && (userRole === 'super_admin' || userRole === 'admin') && (
              <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-2">
                <p className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-4 h-4 text-emerald-600" /> Cronologia e Tracciabilità Atto (Riservato Admin)
                </p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1">
                  {cronologia.map((log: any) => {
                    const dataFormattata = new Date(log.created_at).toLocaleString('it-IT', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    });
                    
                    let azioneTesto = log.azione;
                    if (log.azione === 'CREAZIONE') azioneTesto = 'Creato';
                    if (log.azione === 'MODIFICA') azioneTesto = 'Modificato';
                    if (log.azione === 'STAMPA_CERTIFICATO') azioneTesto = 'Stampato certificato PDF';

                    return (
                      <p key={log.id} className="text-slate-600">
                        • {azioneTesto} il <strong>{dataFormattata}</strong> da <strong>{log.utente_email || 'Utente Parrocchiale'}</strong>
                      </p>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pulsanti Azione */}
            <div className="flex items-center justify-between gap-4 pt-6 border-t border-slate-100">
              
              {/* Tasto Genera PDF sempre visibile per atti salvati */}
              {editId && (
                <button
                  type="button"
                  onClick={handleGeneraPDF}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-xl shadow transition cursor-pointer"
                >
                  <FileText className="w-4 h-4" /> Genera Certificato PDF
                </button>
              )}

              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  {isViewMode ? 'Chiudi' : 'Annulla'}
                </button>

                {!isViewMode && (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow transition cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    {submitting ? 'Salvataggio...' : editId ? 'Aggiorna Atto' : 'Registra Atto'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}