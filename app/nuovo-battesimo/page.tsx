'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { registraLog } from '@/lib/logger';
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
  Lock as LockIcon,
  History,
  FileText,
  Save,
} from 'lucide-react';

export default function NuovoBattesimoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const editId = searchParams.get('id');
  const modeParam = searchParams.get('mode');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [userRole, setUserRole] = useState<string>('lettura');

  // Stato per la cronologia / log dell'atto e per le annotazioni marginali
  const [cronologia, setCronologia] = useState<any[]>([]);
  const [annotazioniList, setAnnotazioniList] = useState<any[]>([]);

  // Stati per il form di inserimento annotazioni
  const [showAddAnnotazione, setShowAddAnnotazione] = useState(false);

  // Stati per le annotazioni guidate a spunta
  const [attivaMatrimonio, setAttivaMatrimonio] = useState(false);
  const [attivaCresima, setAttivaCresima] = useState(false);
  const [attivaOrdinazione, setAttivaOrdinazione] = useState(false);

  // Campi specifici per il Matrimonio
  const [matrimonioData, setMatrimonioData] = useState('');
  const [matrimonioParrocchia, setMatrimonioParrocchia] = useState('');
  const [matrimonioConiuge, setMatrimonioConiuge] = useState('');

  // Campi specifici per la Cresima
  const [cresimaData, setCresimaData] = useState('');
  const [cresimaParrocchia, setCresimaParrocchia] = useState('');

  // Campi specifici per l'Ordinazione
  const [ordinazioneDettaglio, setOrdinazioneDettaglio] = useState('');

  const [formData, setFormData] = useState({
    numero_atto: '',
    cognome: '',
    nome: '',
    sesso: 'M',
    data_nascita: '',
    luogo_nascita: 'Sassari',
    data_battesimo: '',
    luogo_battesimo: 'Sassari - Mater Ecclesiae',
    ministro: 'd. Massimiliano Salis',
    padre: '',
    madre: '',
    padrino: '',
    madrina: '',
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
          .from('battesimi')
          .select('*')
          .eq('id', editId)
          .single();

        if (!error && atto) {
          let padrinoVal = atto.padrino || '';
          let madrinaVal = atto.madrina || '';
          if (!padrinoVal && !madrinaVal && atto.padrino_madrina) {
            padrinoVal = atto.padrino_madrina;
          }

          setFormData({
            numero_atto: atto.numero_atto ? String(atto.numero_atto) : '',
            cognome: atto.cognome || '',
            nome: atto.nome || '',
            sesso: atto.sesso || 'M',
            data_nascita: atto.data_nascita || '',
            luogo_nascita: atto.luogo_nascita || 'Sassari',
            data_battesimo: atto.data_battesimo || '',
            luogo_battesimo: atto.luogo_battesimo || 'Sassari - Mater Ecclesiae',
            ministro: atto.ministro || 'd. Massimiliano Salis',
            padre: atto.padre || '',
            madre: atto.madre || '',
            padrino: padrinoVal,
            madrina: madrinaVal,
            annotazioni: atto.annotazioni || '',
          });
        }

        const { data: logs } = await supabase
          .from('registri_log')
          .select('*')
          .eq('record_id', editId)
          .order('created_at', { ascending: true });

        setCronologia(logs || []);
        fetchAnnotazioni(editId);
      }

      setLoading(false);
    }

    checkPermessiAndFetch();
  }, [editId, modeParam, router]);

  async function fetchAnnotazioni(battesimoId: string) {
    const { data, error } = await supabase
      .from('battesimi_annotazioni')
      .select('*')
      .eq('battesimo_id', battesimoId)
      .order('data_annotazione', { ascending: true });

    if (!error && data) {
      setAnnotazioniList(data);
    }
  }

  async function salvaAnnotazioneGuidata(tipo: string, testo: string) {
    if (!editId || !testo.trim()) {
      alert('Compila i campi richiesti prima di salvare.');
      return;
    }

    const { error } = await supabase.from('battesimi_annotazioni').insert([
      {
        battesimo_id: editId,
        tipo_annotazione: tipo,
        testo_annotazione: testo.trim(),
        data_annotazione: new Date().toISOString().split('T')[0]
      }
    ]);

    if (!error) {
      setAttivaMatrimonio(false);
      setAttivaCresima(false);
      setAttivaOrdinazione(false);
      setMatrimonioData('');
      setMatrimonioParrocchia('');
      setMatrimonioConiuge('');
      setCresimaData('');
      setCresimaParrocchia('');
      setOrdinazioneDettaglio('');
      setShowAddAnnotazione(false);
      
      fetchAnnotazioni(editId);
      await registraLog('battesimi', editId, 'ANNOTAZIONE', `Aggiunta annotazione guidata: ${tipo}`);
    } else {
      alert(`Errore salvataggio annotazione: ${error.message}`);
    }
  }

  async function handleDeleteAnnotazione(annotazioneId: string) {
    if (!confirm('Sei sicuro di voler eliminare questa annotazione marginale?')) return;

    const { error } = await supabase
      .from('battesimi_annotazioni')
      .delete()
      .eq('id', annotazioneId);

    if (!error && editId) {
      fetchAnnotazioni(editId);
      await registraLog('battesimi', editId, 'ANNOTAZIONE', 'Rimozione annotazione marginale');
    }
  }

  async function handleGeneraPDF() {
    if (editId) {
      await registraLog('battesimi', editId, 'STAMPA_CERTIFICATO', 'Generazione certificato Battesimo PDF');
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Impossibile aprire la finestra di stampa. Controlla le impostazioni dei popup del browser.');
      return;
    }

    // Recupera in modo robusto i dati della parrocchia e del logo associati all'utente loggato
    const { data: { session } } = await supabase.auth.getSession();
    let parrocchiaInfo: any = null;
    if (session) {
      const { data: profilo } = await supabase
        .from('profili')
        .select('parrocchia_id')
        .eq('id', session.user.id)
        .single();

      if (profilo?.parrocchia_id) {
        const { data: parr } = await supabase
          .from('parrocchie')
          .select('*')
          .eq('id', profilo.parrocchia_id)
          .single();
        parrocchiaInfo = parr;
      }
    }

    const logoHtml = parrocchiaInfo?.logo_url && parrocchiaInfo.logo_url !== 'null' && parrocchiaInfo.logo_url.trim() !== ''
      ? `<div style="text-align: center; margin-bottom: 12px;"><img src="${parrocchiaInfo.logo_url}" alt="Logo Parrocchia" style="width: 64px; height: 64px; object-fit: contain;" /></div>`
      : '';

    let htmlAnnotazioni = '<em style="color: #94a3b8; font-style: italic;">Nessuna annotazione marginale</em>';
    if (annotazioniList.length > 0) {
      htmlAnnotazioni = annotazioniList
        .map(a => `<p style="margin: 4px 0; color: #334155;"><strong>[${a.tipo_annotazione.toUpperCase()}]</strong> ${a.testo_annotazione} <em style="font-size: 10px; color: #64748b;">(Data: ${new Date(a.data_annotazione).toLocaleDateString('it-IT')})</em></p>`)
        .join('');
    } else if (formData.annotazioni) {
      htmlAnnotazioni = `<p style="color: #334155;">${formData.annotazioni}</p>`;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <title>Certificato di Battesimo - ${formData.cognome} ${formData.nome}</title>
        <style>
          body { font-family: 'Times New Roman', serif; margin: 0; padding: 20px; color: #0f172a; background: #fff; }
          .container { border: 4px double #1e293b; padding: 35px; max-width: 700px; margin: 0 auto; position: relative; }
          .parrocchia-title { text-transform: uppercase; letter-spacing: 2px; font-size: 14px; font-weight: bold; color: #334155; text-align: center; margin: 0; }
          .diocesi-title { font-size: 12px; color: #64748b; font-family: sans-serif; text-align: center; margin-top: 2px; }
          .titolo-atto { font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; text-align: center; margin: 25px 0 15px 0; color: #0f172a; }
          .certifica { font-style: italic; font-size: 14px; text-align: center; color: #334155; margin: 15px 0; }
          .nome-persona { font-size: 18px; font-weight: bold; text-transform: uppercase; text-align: center; margin: 15px 0; letter-spacing: 1px; }
          .nome-persona span { border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; display: inline-block; }
          .dettagli { text-align: left; margin: 25px auto; width: 90%; font-size: 14px; line-height: 1.8; }
          .annotazioni-box { margin-top: 25px; padding-top: 12px; border-top: 1px dashed #94a3b8; font-size: 12px; font-family: sans-serif; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; font-family: sans-serif; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${logoHtml}
          <h2 class="parrocchia-title">${parrocchiaInfo?.nome_parrocchia || 'PARROCCHIA MATER ECCLESIAE'}</h2>
          <p class="diocesi-title">${parrocchiaInfo?.diocesi || 'Arcidiocesi di Sassari'}</p>
          
          <div class="titolo-atto">ATTO DI BATTESIMO</div>
          
          <p class="certifica">Si certifica che nel Registro dei Battesimi di questa Parrocchia al N. <strong>${formData.numero_atto || '___'}</strong> risulta che</p>
          
          <div class="nome-persona"><span>${formData.cognome} ${formData.nome}</span></div>
          
          <div class="dettagli">
            <p><strong>Nato/a a:</strong> ${formData.luogo_nascita || 'Sassari'} il ${formData.data_nascita ? new Date(formData.data_nascita).toLocaleDateString('it-IT') : '________'}</p>
            <p><strong>Figlio/a di:</strong> ${formData.padre || '________'} e di ${formData.madre || '________'}</p>
            <p><strong>È stato/a battezzato/a</strong> in questa Chiesa Parrocchiale in data <strong>${formData.data_battesimo ? new Date(formData.data_battesimo).toLocaleDateString('it-IT') : '________'}</strong>.</p>
            <p><strong>Ministro celebrante:</strong> ${formData.ministro || 'd. Massimiliano Salis'}</p>
            ${formData.padrino ? `<p><strong>Padrino:</strong> ${formData.padrino}</p>` : ''}
            ${formData.madrina ? `<p><strong>Madrina:</strong> ${formData.madrina}</p>` : ''}
            
            <div class="annotazioni-box">
              <strong style="text-transform: uppercase; letter-spacing: 1px; color: #334155; display: block; margin-bottom: 4px;">Annotazioni Marginali (Can. 535 §2):</strong>
              ${htmlAnnotazioni}
            </div>
          </div>

          <div class="footer">
            <div>
              <p>Data: ${new Date().toLocaleDateString('it-IT')}</p>
            </div>
            <div style="text-align: right;">
              <p style="font-family: serif; font-style: italic; font-size: 14px; margin: 0 0 25px 0;">Il Parroco</p>
              <div style="width: 160px; border-bottom: 1px solid #94a3b8; margin-left: auto;"></div>
            </div>
          </div>

          <div class="no-print" style="margin-top: 30px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 24px; font-size: 14px; background: #1d4ed8; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">🖨️ Stampa / Salva PDF</button>
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

    const { data: { session } } = await supabase.auth.getSession();
    let parrocchiaId = null;
    if (session) {
      const { data: profilo } = await supabase
        .from('profili')
        .select('parrocchia_id')
        .eq('id', session.user.id)
        .single();
      parrocchiaId = profilo?.parrocchia_id;
    }

    const payload = {
      ...formData,
      numero_atto: formData.numero_atto ? parseInt(formData.numero_atto, 10) : null,
      data_nascita: formData.data_nascita || null,
      data_battesimo: formData.data_battesimo || null,
      parrocchia_id: parrocchiaId,
    };

    let error;
    if (editId) {
      const res = await supabase.from('battesimi').update(payload).eq('id', editId);
      error = res.error;
      if (!error) {
        await registraLog('battesimi', editId, 'MODIFICA', 'Aggiornamento dati atto di Battesimo');
      }
    } else {
      const res = await supabase.from('battesimi').insert([payload]).select().single();
      error = res.error;
      if (!error && res.data) {
        await registraLog('battesimi', res.data.id, 'CREAZIONE', 'Registrazione nuovo atto di Battesimo');
      }
    }

    if (error) {
      alert(`Errore durante il salvataggio: ${error.message}`);
      setSubmitting(false);
    } else {
      router.push('/?view=battesimi');
      router.refresh();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
        Caricamento atto in corso...
      </div>
    );
  }

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
          <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-xl">
                {isViewMode ? <Eye className="w-6 h-6 text-white" /> : <BookOpen className="w-6 h-6 text-white" />}
              </div>
              <div>
                <h1 className="text-xl font-bold font-serif">
                  {isViewMode
                    ? 'Consultazione Atto di Battesimo'
                    : editId
                    ? 'Modifica Atto di Battesimo'
                    : 'Registrazione Atto di Battesimo'}
                </h1>
                <p className="text-xs text-slate-300">
                  {isViewMode
                    ? 'Modalità solo visualizzazione - Modifiche disabilitate'
                    : 'Modulo conforme al Registro Parrocchiale dei Battesimi'}
                </p>
              </div>
            </div>

            {isViewMode && (
              <span className="inline-flex items-center gap-1.5 bg-slate-800 text-amber-400 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-700">
                <LockIcon className="w-3.5 h-3.5" /> Solo Lettura
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" /> 1. Anagrafica Battezzato/a
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Atto N°</label>
                  <input
                    type="number"
                    disabled={isViewMode}
                    placeholder="Es. 12"
                    value={formData.numero_atto}
                    onChange={(e) => setFormData({ ...formData, numero_atto: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Cognome</label>
                  <input
                    type="text"
                    required
                    disabled={isViewMode}
                    placeholder="Es. ROSSI"
                    value={formData.cognome}
                    onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nome</label>
                  <input
                    type="text"
                    required
                    disabled={isViewMode}
                    placeholder="Es. MARIO"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Sesso</label>
                  <select
                    disabled={isViewMode}
                    value={formData.sesso}
                    onChange={(e) => setFormData({ ...formData, sesso: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  >
                    <option value="M">Maschile (nato)</option>
                    <option value="F">Femminile (nata)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Data di Nascita</label>
                  <input
                    type="date"
                    disabled={isViewMode}
                    value={formData.data_nascita}
                    onChange={(e) => setFormData({ ...formData, data_nascita: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Luogo di Nascita</label>
                  <input
                    type="text"
                    disabled={isViewMode}
                    placeholder="Es. Sassari"
                    value={formData.luogo_nascita}
                    onChange={(e) => setFormData({ ...formData, luogo_nascita: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" /> 2. Filiazione (Genitori)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nome e Cognome del Padre</label>
                  <input
                    type="text"
                    disabled={isViewMode}
                    placeholder="Es. Rossi Giovanni"
                    value={formData.padre}
                    onChange={(e) => setFormData({ ...formData, padre: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nome e Cognome della Madre</label>
                  <input
                    type="text"
                    disabled={isViewMode}
                    placeholder="Es. Bianchi Maria"
                    value={formData.madre}
                    onChange={(e) => setFormData({ ...formData, madre: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Church className="w-4 h-4 text-blue-600" /> 3. Dettagli del Sacramento
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Data Battesimo</label>
                  <input
                    type="date"
                    required
                    disabled={isViewMode}
                    value={formData.data_battesimo}
                    onChange={(e) => setFormData({ ...formData, data_battesimo: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Luogo / Chiesa Battesimo</label>
                  <input
                    type="text"
                    required
                    disabled={isViewMode}
                    value={formData.luogo_battesimo}
                    onChange={(e) => setFormData({ ...formData, luogo_battesimo: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Ministro Celebrante</label>
                  <input
                    type="text"
                    disabled={isViewMode}
                    value={formData.ministro}
                    onChange={(e) => setFormData({ ...formData, ministro: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Padrino</label>
                  <input
                    type="text"
                    disabled={isViewMode}
                    placeholder="Nome e cognome del padrino..."
                    value={formData.padrino}
                    onChange={(e) => setFormData({ ...formData, padrino: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Madrina</label>
                  <input
                    type="text"
                    disabled={isViewMode}
                    placeholder="Nome e cognome della madrina..."
                    value={formData.madrina}
                    onChange={(e) => setFormData({ ...formData, madrina: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* SEZIONE 4: Annotazioni Marginali Guidate con Spunte (Visibile dopo il salvataggio dell'atto) */}
            {editId && (
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Cross className="w-4 h-4 text-blue-600" /> 4. Annotazioni Marginali (Can. 535 §2)
                    </h2>
                    <p className="text-xs text-slate-500">Seleziona i sacramenti posteriori ricevuti per compilarne i dati a margine.</p>
                  </div>
                  {!isViewMode && (
                    <button
                      type="button"
                      onClick={() => setShowAddAnnotazione(!showAddAnnotazione)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> {showAddAnnotazione ? 'Chiudi' : 'Nuova Nota Guidata'}
                    </button>
                  )}
                </div>

                {showAddAnnotazione && !isViewMode && (
                  <div className="p-4 mb-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Seleziona il tipo di annotazione:</p>
                    
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs">
                        <input
                          type="checkbox"
                          checked={attivaMatrimonio}
                          onChange={(e) => setAttivaMatrimonio(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        💍 Matrimonio
                      </label>

                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs">
                        <input
                          type="checkbox"
                          checked={attivaCresima}
                          onChange={(e) => setAttivaCresima(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        🕊️ Cresima
                      </label>

                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs">
                        <input
                          type="checkbox"
                          checked={attivaOrdinazione}
                          onChange={(e) => setAttivaOrdinazione(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        ⛪ Ordinazione / Altro
                      </label>
                    </div>

                    {attivaMatrimonio && (
                      <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-3">
                        <p className="text-xs font-bold text-blue-900 uppercase">Dettagli Matrimonio</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">Data Nozze</label>
                            <input
                              type="date"
                              value={matrimonioData}
                              onChange={(e) => setMatrimonioData(e.target.value)}
                              className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">Parrocchia / Luogo</label>
                            <input
                              type="text"
                              placeholder="Es. Parr. San Pietro, Roma"
                              value={matrimonioParrocchia}
                              onChange={(e) => setMatrimonioParrocchia(e.target.value)}
                              className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">Nome Coniuge</label>
                            <input
                              type="text"
                              placeholder="Nome e Cognome coniuge"
                              value={matrimonioConiuge}
                              onChange={(e) => setMatrimonioConiuge(e.target.value)}
                              className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={async () => {
                              const testo = `Celebrato in data ${matrimonioData || '___'} presso ${matrimonioParrocchia || '___'} con ${matrimonioConiuge || '___'}.`;
                              await salvaAnnotazioneGuidata('Matrimonio', testo);
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                          >
                            Salva Nota Matrimonio
                          </button>
                        </div>
                      </div>
                    )}

                    {attivaCresima && (
                      <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-3">
                        <p className="text-xs font-bold text-blue-900 uppercase">Dettagli Cresima</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">Data Cresima</label>
                            <input
                              type="date"
                              value={cresimaData}
                              onChange={(e) => setCresimaData(e.target.value)}
                              className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">Parrocchia / Luogo</label>
                            <input
                              type="text"
                              placeholder="Es. Cattedrale di Sassari"
                              value={cresimaParrocchia}
                              onChange={(e) => setCresimaParrocchia(e.target.value)}
                              className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={async () => {
                              const testo = `Ricevuta in data ${cresimaData || '___'} presso ${cresimaParrocchia || '___'}.`;
                              await salvaAnnotazioneGuidata('Cresima', testo);
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                          >
                            Salva Nota Cresima
                          </button>
                        </div>
                      </div>
                    )}

                    {attivaOrdinazione && (
                      <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-3">
                        <p className="text-xs font-bold text-blue-900 uppercase">Dettagli Ordinazione / Altro</p>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">Testo dell'annotazione</label>
                          <textarea
                            rows={2}
                            placeholder="Inserisci i dettagli canonici dell'ordinazione o del cambio di rito..."
                            value={ordinazioneDettaglio}
                            onChange={(e) => setOrdinazioneDettaglio(e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none"
                          />
                        </div>
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={async () => {
                              await salvaAnnotazioneGuidata('Ordinazione', ordinazioneDettaglio);
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                          >
                            Salva Nota Ufficiale
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  {annotazioniList.length === 0 ? (
                    <div className="p-4 bg-slate-50 text-center rounded-xl text-xs text-slate-400 border border-slate-100">
                      Nessuna annotazione marginale registrata.
                    </div>
                  ) : (
                    annotazioniList.map((item) => (
                      <div key={item.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono">
                              {item.tipo_annotazione}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Data: {new Date(item.data_annotazione).toLocaleDateString('it-IT')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">{item.testo_annotazione}</p>
                        </div>
                        {!isViewMode && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAnnotazione(item.id)}
                            className="text-slate-400 hover:text-red-600 p-1 transition cursor-pointer"
                            title="Elimina annotazione"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {editId && cronologia.length > 0 && (userRole === 'super_admin' || userRole === 'admin') && (
              <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-2">
                <p className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-4 h-4 text-blue-600" /> Cronologia e Tracciabilità Atto (Riservato Admin)
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
                    if (log.azione === 'ANNOTAZIONE') azioneTesto = 'Aggiornato annotazione marginale';

                    return (
                      <p key={log.id} className="text-slate-600">
                        • {azioneTesto} il <strong>{dataFormattata}</strong> da <strong>{log.utente_email || 'Utente Parrocchiale'}</strong>
                      </p>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-4 pt-6 border-t border-slate-100">
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
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition cursor-pointer"
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