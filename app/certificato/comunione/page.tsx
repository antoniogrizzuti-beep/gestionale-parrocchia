'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function CertificatoComunione() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');

  const [atto, setAtto] = useState<any>(null);
  const [parrocchia, setParrocchia] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchDatiCertificato();
  }, [id]);

  async function fetchDatiCertificato() {
    setLoading(true);
    const { data: comunione } = await supabase
      .from('comunioni')
      .select('*')
      .eq('id', id)
      .single();

    if (comunione) {
      setAtto(comunione);
      const { data: parr } = await supabase
        .from('parrocchie')
        .select('*')
        .eq('id', comunione.parrocchia_id)
        .single();
      if (parr) setParrocchia(parr);
    }
    setLoading(false);
  }

  if (loading) return <div className="p-8 text-center text-sm">Generazione certificato in corso...</div>;
  if (!atto) return <div className="p-8 text-center text-sm text-red-500">Atto di Prima Comunione non trovato.</div>;

  const dataNascitaFormatted = atto.data_nascita ? new Date(atto.data_nascita).toLocaleDateString('it-IT') : '...................';
  const dataBattesimoFormatted = atto.data_battesimo ? new Date(atto.data_battesimo).toLocaleDateString('it-IT') : '...................';
  const dataComunioneFormatted = atto.data_comunione ? new Date(atto.data_comunione).toLocaleDateString('it-IT') : '...................';

  return (
    <div className="min-h-screen bg-slate-100 p-6 flex flex-col items-center">
      
      {/* Stile CSS globale per la stampa */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 2cm;
            size: auto;
          }
          body {
            background-color: white !important;
          }
        }
      `}</style>

      {/* Pulsanti di azione (nascosti in stampa) */}
      <div className="max-w-2xl w-full flex justify-between mb-6 print:hidden">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer"
        >
          ← Indietro
        </button>
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
        >
          🖨️ Stampa / Salva PDF
        </button>
      </div>

      {/* Foglio del Certificato */}
      <div className="max-w-2xl w-full bg-white p-12 rounded-2xl shadow-md border border-slate-200 print:shadow-none print:border-none print:p-0 print:w-full font-serif">
        
        {/* Intestazione con Logo e Diocesi */}
        <div className="text-center space-y-2 border-b border-slate-200 pb-6">
          {parrocchia?.logo_url && (
            <div className="flex justify-center mb-2">
              <img
                src={parrocchia.logo_url}
                alt="Logo Parrocchia"
                className="w-16 h-16 object-contain"
              />
            </div>
          )}
          <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-600 font-sans">
            {parrocchia?.diocesi || 'Arcidiocesi'}
          </h2>
          <h1 className="text-2xl font-extrabold text-slate-900">
            {parrocchia?.nome_parrocchia || 'Parrocchia'}
          </h1>
          <p className="text-[11px] text-slate-400 font-mono font-sans">{parrocchia?.codice}</p>
          
          <h3 className="text-lg font-bold text-slate-800 mt-6 uppercase tracking-wide">
            ATTESTATO DI PRIMA COMUNIONE
          </h3>
        </div>

        {/* Testo Discorsivo dell'Attestato */}
        <div className="py-8 text-slate-800 text-base leading-relaxed space-y-6 text-justify">
          <p className="indent-8">
            Si attesta che dai registri delle Prime Comunioni di questa Parrocchia 
            {atto.volume ? ` (Volume ${atto.volume}` : ''}
            {atto.pagina ? `, Pagina ${atto.pagina}` : ''}
            {atto.numero_atto ? `, Atto N. ${atto.numero_atto}` : ''}) 
            risulta che:
          </p>

          <p className="font-bold text-center text-lg my-4 text-slate-900">
            {atto.cognome} {atto.nome}
          </p>

          <p className="leading-loose">
            nato/a a <span className="font-semibold underline decoration-dotted">{atto.luogo_nascita || '......................................'}</span> il <span className="font-semibold underline decoration-dotted">{dataNascitaFormatted}</span>, 
            regolarmente battezzato/a nella Parrocchia di <span className="font-semibold">{atto.chiesa_battesimo || '......................................'}</span> in data <span className="font-semibold underline decoration-dotted">{dataBattesimoFormatted}</span>, 
            ha ricevuto per la prima volta il Santissimo Sacramento dell'Eucaristia (Prima Comunione) in questa Chiesa Parrocchiale (o presso <span className="font-semibold">{atto.chiesa_comunione || parrocchia}</span>) in data <span className="font-semibold underline decoration-dotted">{dataComunioneFormatted}</span>.
          </p>

          {atto.ministro && (
            <p className="text-sm text-slate-600 italic">
              Ministro / Celebrante: {atto.ministro}
            </p>
          )}
        </div>

        {/* Data, Timbro e Firma del Parroco */}
        <div className="mt-14 pt-6 flex justify-between items-end text-xs font-sans text-slate-700">
          <div>
            <p>Data di rilascio: <span className="font-semibold">{new Date().toLocaleDateString('it-IT')}</span></p>
          </div>
          <div className="text-center space-y-10">
            <p className="font-serif italic text-sm">Il Parroco</p>
            <div className="w-52 border-b border-slate-400"></div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">(Timbro e Firma)</p>
          </div>
        </div>

      </div>
    </div>
  );
}