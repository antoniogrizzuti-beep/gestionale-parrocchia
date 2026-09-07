'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function CertificatoBattesimo() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');

  const [atto, setAtto] = useState<any>(null);
  const [parrocchia, setParrocchia] = useState<any>(null);
  const [annotazioniList, setAnnotazioniList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchDatiCertificato();
  }, [id]);

  async function fetchDatiCertificato() {
    setLoading(true);
    
    const { data: battesimo } = await supabase
      .from('battesimi')
      .select('*')
      .eq('id', id)
      .single();

    if (battesimo) {
      setAtto(battesimo);
      
      const { data: parr } = await supabase
        .from('parrocchie')
        .select('*')
        .eq('id', battesimo.parrocchia_id)
        .single();
      if (parr) setParrocchia(parr);

      const { data: annots } = await supabase
        .from('battesimi_annotazioni')
        .select('*')
        .eq('battesimo_id', id)
        .order('data_annotazione', { ascending: true });

      if (annots) {
        setAnnotazioniList(annots);
      }
    }
    setLoading(false);
  }

  if (loading) return <div className="p-8 text-center text-sm">Generazione certificato in corso...</div>;
  if (!atto) return <div className="p-8 text-center text-sm text-red-500">Atto non trovato.</div>;

  const dataNascitaFormatted = atto.data_nascita ? new Date(atto.data_nascita).toLocaleDateString('it-IT') : '________';
  const dataBattesimoFormatted = atto.data_battesimo ? new Date(atto.data_battesimo).toLocaleDateString('it-IT') : '________';

  return (
    <div className="min-h-screen bg-slate-100 p-6 flex flex-col items-center">
      
      <style jsx global>{`
        @media print {
          @page {
            margin: 1.5cm;
            size: auto;
          }
          body {
            background-color: white !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Pulsanti di azione (nascosti in stampa) */}
      <div className="max-w-[700px] w-full flex justify-between mb-6 no-print">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer"
        >
          ← Indietro
        </button>
        <button
          onClick={() => window.print()}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
        >
          🖨️ Stampa / Salva PDF
        </button>
      </div>

      {/* Foglio del Certificato con Doppia Cornice */}
      <div className="max-w-[700px] w-full bg-white p-10 rounded-2xl shadow-md border border-slate-200 print:shadow-none print:border-none print:p-0 font-serif text-slate-900">
        
        <div style={{ border: '4px double #1e293b', padding: '35px', position: 'relative' }}>
          
          {/* Logo della Parrocchia (se presente) */}
          {parrocchia?.logo_url && parrocchia.logo_url !== 'null' && parrocchia.logo_url.trim() !== '' && (
            <div className="flex justify-center mb-3">
              <img
                src={parrocchia.logo_url}
                alt="Logo Parrocchia"
                className="w-16 h-16 object-contain"
              />
            </div>
          )}

          {/* Intestazione Parrocchia / Diocesi */}
          <div className="text-center space-y-1">
            <h2 className="uppercase tracking-[2px] text-sm font-bold text-slate-700">
              {parrocchia?.nome_parrocchia || 'PARROCCHIA'}
            </h2>
            <p className="text-xs text-slate-500 font-sans">
              {parrocchia?.diocesi || 'Arcidiocesi di Sassari'}
            </p>
          </div>

          <h1 className="text-xl font-extrabold text-center uppercase tracking-wider my-6 text-slate-900">
            ATTO DI BATTESIMO
          </h1>

          <p className="italic text-center text-sm text-slate-700 my-4">
            Si certifica che nel Registro dei Battesimi di questa Parrocchia al N. <strong>{atto.numero_atto || '___'}</strong> risulta che
          </p>

          <div className="text-center my-5">
            <span className="text-xl font-bold uppercase tracking-wider border-b border-slate-300 pb-1 inline-block">
              {atto.cognome} {atto.nome}
            </span>
          </div>

          {/* Dettagli del Sacramento */}
          <div className="text-left mx-auto my-6 space-y-3 text-sm leading-relaxed" style={{ width: '90%' }}>
            <p><strong>Nato/a a:</strong> {atto.luogo_nascita || 'Sassari'} il {dataNascitaFormatted}</p>
            <p><strong>Figlio/a di:</strong> {atto.padre || '________'} e di {atto.madre || '________'}</p>
            <p><strong>È stato/a battezzato/a</strong> in questa Chiesa Parrocchiale in data <strong>{dataBattesimoFormatted}</strong>.</p>
            <p><strong>Ministro celebrante:</strong> {atto.ministro || 'd. Massimiliano Salis'}</p>
            {atto.padrino && <p><strong>Padrino:</strong> {atto.padrino}</p>}
            {atto.madrina && <p><strong>Madrina:</strong> {atto.madrina}</p>}
            
            {/* Box Annotazioni Marginali Canoniche */}
            <div className="mt-6 pt-3 border-t border-dashed border-slate-400 text-xs font-sans space-y-1">
              <span className="font-bold uppercase tracking-wider text-slate-700 block mb-1">
                Annotazioni Marginali (Can. 535 §2):
              </span>
              {annotazioniList.length > 0 ? (
                annotazioniList.map((a) => (
                  <p key={a.id} className="text-slate-700">
                    <strong>[{a.tipo_annotazione.toUpperCase()}]</strong> {a.testo_annotazione} <em className="text-[10px] text-slate-500">(Data: {new Date(a.data_annotazione).toLocaleDateString('it-IT')})</em>
                  </p>
                ))
              ) : atto.annotazioni ? (
                <p className="text-slate-700">{atto.annotazioni}</p>
              ) : (
                <p className="text-slate-400 italic">Nessuna annotazione marginale</p>
              )}
            </div>
          </div>

          {/* Sezione Firma e Data */}
          <div className="mt-12 pt-4 flex justify-between items-end text-xs font-sans">
            <div>
              <p>Data: <span className="font-semibold">{new Date().toLocaleDateString('it-IT')}</span></p>
            </div>
            <div className="text-right space-y-6">
              <p className="font-serif italic text-sm">Il Parroco</p>
              <div className="w-44 border-b border-slate-400 ml-auto"></div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}