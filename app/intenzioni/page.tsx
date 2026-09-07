'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import {
  Plus,
  Search,
  Trash2,
  Printer,
  ArrowLeft,
  Heart,
  CalendarDays,
} from 'lucide-react';

interface Intenzione {
  id: string;
  data_messa: string;
  ora_messa: string;
  richiedente: string;
  intenzione: string;
  offerta: number | null;
  parrocchia_id: string;
}

export default function IntenzioniPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string>('lettura');
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [parrocchiaId, setParrocchiaId] = useState<string | null>(null);
  const [nomeParrocchia, setNomeParrocchia] = useState<string>('Parrocchia');
  const [codiceParrocchia, setCodiceParrocchia] = useState<string>('');
  const [diocesiParrocchia, setDiocesiParrocchia] = useState<string>('');

  const [intenzioni, setIntenzioni] = useState<Intenzione[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filtro per la stampa settimanale (data di inizio settimana, es. lunedì)
  const [dataStartSettimana, setDataStartSettimana] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ottieni il lunedì della settimana corrente
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  });

  // Form nuovo inserimento
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    data_messa: new Date().toISOString().split('T')[0],
    ora_messa: '18:30',
    richiedente: '',
    intenzione: '',
    offerta: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    setUserEmail(session.user.email || '');

    const { data: profilo } = await supabase
      .from('profili')
      .select('*, parrocchie(id, codice, nome_parrocchia, diocesi)')
      .eq('id', session.user.id)
      .single();

    if (profilo) {
      setUserRole(profilo.ruolo || 'lettura');
      setUserName(`${profilo.nome || ''} ${profilo.cognome || ''}`.trim() || profilo.username);
      if (profilo.parrocchie) {
        setParrocchiaId(profilo.parrocchie.id);
        setNomeParrocchia(profilo.parrocchie.nome_parrocchia);
        setCodiceParrocchia(profilo.parrocchie.codice);
        setDiocesiParrocchia(profilo.parrocchie.diocesi || 'Arcidiocesi');

        const { data: list } = await supabase
          .from('intenzioni_messa')
          .select('*')
          .eq('parrocchia_id', profilo.parrocchie.id)
          .order('data_messa', { ascending: true })
          .order('ora_messa', { ascending: true });

        setIntenzioni(list || []);
      }
    }
    setLoading(false);
  }

  async function handleAggiungiIntenzione(e: React.FormEvent) {
    e.preventDefault();
    if (!parrocchiaId) return;
    setSubmitting(true);

    const { error } = await supabase.from('intenzioni_messa').insert([
      {
        parrocchia_id: parrocchiaId,
        data_messa: formData.data_messa,
        ora_messa: formData.ora_messa,
        richiedente: formData.richiedente,
        intenzione: formData.intenzione,
        offerta: formData.offerta ? parseFloat(formData.offerta) : null,
      },
    ]);

    if (error) {
      alert(`Errore inserimento: ${error.message}`);
    } else {
      setFormData({
        data_messa: new Date().toISOString().split('T')[0],
        ora_messa: '18:30',
        richiedente: '',
        intenzione: '',
        offerta: '',
      });
      setShowForm(false);
      fetchData();
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (userRole === 'lettura') {
      alert('Non hai i permessi per eliminare le intenzioni.');
      return;
    }
    if (confirm('Sei sicuro di voler eliminare questa intenzione di Messa?')) {
      const { error } = await supabase.from('intenzioni_messa').delete().eq('id', id);
      if (!error) {
        setIntenzioni(intenzioni.filter((i) => i.id !== id));
      } else {
        alert(`Errore: ${error.message}`);
      }
    }
  }

  // Funzione per stampare il Calendario Liturgico Settimanale Ufficiale (stile foglio parrocchiale)
  function handleStampaFoglioSettimanale() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Calcola i 7 giorni a partire da dataStartSettimana
    const start = new Date(dataStartSettimana);
    const giorniTabella = [];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateString = d.toISOString().split('T')[0];
      
      const nomeGiorno = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
      
      // Trova le intenzioni per questo giorno
      const messeDelGiorno = intenzioni.filter(item => item.data_messa === dateString);
      
      giorniTabella.push({
        nomeGiorno,
        dateString,
        messe: messeDelGiorno
      });
    }

    const html = `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <title>Calendario Liturgico e Intenzioni Settimanali - ${nomeParrocchia}</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 20px; color: #111; margin: 0; }
          .header-parrocchia { text-align: center; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 20px; }
          .header-parrocchia h1 { font-size: 18px; text-transform: uppercase; margin: 0; color: #990000; font-family: sans-serif; font-weight: bold; }
          .header-parrocchia p { font-size: 11px; margin: 2px 0; font-family: sans-serif; color: #555; }
          .titolo-foglio { text-align: center; font-size: 15px; font-weight: bold; text-transform: uppercase; margin-bottom: 20px; letter-spacing: 1px; }
          
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px; }
          th, td { border: 1.5px solid #222; padding: 8px 12px; vertical-align: top; }
          th { background: #f4f4f4; text-align: center; font-size: 12px; text-transform: uppercase; }
          .col-giorno { width: 35%; font-weight: bold; font-size: 12px; background: #fafafa; }
          .col-intenzioni { width: 65%; }
          .messa-item { margin-bottom: 6px; border-bottom: 1px dotted #ccc; padding-bottom: 4px; }
          .messa-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
          .ora { font-weight: bold; color: #111; display: inline-block; min-width: 55px; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header-parrocchia">
          <h1>${nomeParrocchia}</h1>
          <p>${diocesiParrocchia}</p>
        </div>

        <div class="titolo-foglio">
          Calendario Liturgico e Intenzioni Settimanali
        </div>

        <table>
          <thead>
            <tr>
              <th>Giorno Liturgico</th>
              <th>Orari e Intenzioni delle Sante Messe</th>
            </tr>
          </thead>
          <tbody>
            ${giorniTabella.map(g => `
              <tr>
                <td class="col-giorno">${g.nomeGiorno}</td>
                <td class="col-intenzioni">
                  ${g.messe.length > 0 ? g.messe.map(m => `
                    <div class="messa-item">
                      <span class="ora">${m.ora_messa}</span> 
                      <span><strong>${m.intenzione}</strong> ${m.richiedente ? `<em style="font-size: 11px; color: #555;">(Req. ${m.richiedente})</em>` : ''}</span>
                    </div>
                  `).join('') : '<em style="color: #888; font-size: 11px;">Nessuna intenzione registrata</em>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <script>
          window.print();
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  }

  const filtered = intenzioni.filter(i => {
    return i.intenzione.toLowerCase().includes(searchQuery.toLowerCase()) ||
           i.richiedente.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">Caricamento intenzioni...</div>;
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-800 pb-16">
      <Header 
        isHome={false} 
        titoloPagina="Intenzioni di Santa Messa"
        nomeParrocchia={nomeParrocchia} 
        codiceParrocchia={codiceParrocchia} 
        userRole={userRole} 
        veroRuolo={userRole} 
        listaUtenti={[]} 
      />

      <div className="max-w-5xl mx-auto px-6 pt-8 space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <button
            onClick={() => router.push('/?view=dashboard')}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Torna alla Dashboard
          </button>

          <div className="flex flex-wrap items-center gap-3">
            {/* Selettore data inizio settimana per la stampa */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <span className="font-semibold text-slate-600">Inizio Settimana:</span>
              <input
                type="date"
                value={dataStartSettimana}
                onChange={(e) => setDataStartSettimana(e.target.value)}
                className="outline-none cursor-pointer font-medium text-slate-800"
              />
            </div>

            <button
              onClick={handleStampaFoglioSettimanale}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4" /> Stampa Foglio Ufficiale
            </button>

            {userRole !== 'lettura' && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" /> {showForm ? 'Chiudi Modulo' : 'Nuova Intenzione'}
              </button>
            )}
          </div>
        </div>

        {/* MODULO INSERIMENTO */}
        {showForm && (
          <div className="bg-white p-6 rounded-2xl border border-purple-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-purple-900 uppercase tracking-wider flex items-center gap-2">
              <Heart className="w-4 h-4 text-purple-600" /> Registra Nuova Intenzione di Messa
            </h2>

            <form onSubmit={handleAggiungiIntenzione} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Data Messa</label>
                <input
                  type="date"
                  required
                  value={formData.data_messa}
                  onChange={(e) => setFormData({ ...formData, data_messa: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Orario</label>
                <input
                  type="text"
                  required
                  placeholder="Es. 18:30"
                  value={formData.ora_messa}
                  onChange={(e) => setFormData({ ...formData, ora_messa: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Offerente / Richiedente</label>
                <input
                  type="text"
                  placeholder="Es. Famiglia Rossi"
                  value={formData.richiedente}
                  onChange={(e) => setFormData({ ...formData, richiedente: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Testo dell'Intenzione (Suffragio / Ringraziamento)</label>
                <input
                  type="text"
                  required
                  placeholder="Es. In suffragio di Mario Rossi nel mesimo..."
                  value={formData.intenzione}
                  onChange={(e) => setFormData({ ...formData, intenzione: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Offerta (€) - Facoltativa</label>
                <input
                  type="number"
                  step="0.50"
                  placeholder="Es. 10.00"
                  value={formData.offerta}
                  onChange={(e) => setFormData({ ...formData, offerta: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="md:col-span-3 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow transition"
                >
                  {submitting ? 'Salvataggio...' : 'Salva Intenzione'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* BARRA DI RICERCA */}
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca per intenzione o offerente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* TABELLA ELENCO */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 uppercase font-semibold text-slate-500">
              <tr>
                <th className="py-3.5 px-4">Data e Ora</th>
                <th className="py-3.5 px-4">Richiedente</th>
                <th className="py-3.5 px-4">Intenzione</th>
                <th className="py-3.5 px-4">Offerta</th>
                <th className="py-3.5 px-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Nessuna intenzione di Messa registrata.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {new Date(item.data_messa).toLocaleDateString('it-IT')} ore {item.ora_messa}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">{item.richiedente || '-'}</td>
                    <td className="py-3.5 px-4 text-purple-900 font-medium">{item.intenzione}</td>
                    <td className="py-3.5 px-4 text-slate-500">{item.offerta ? `€ ${item.offerta.toFixed(2)}` : '-'}</td>
                    <td className="py-3.5 px-4 text-right">
                      {userRole !== 'lettura' && (
                        <button
                          onClick={() => handleDelete(item.id)}
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
    </main>
  );
}