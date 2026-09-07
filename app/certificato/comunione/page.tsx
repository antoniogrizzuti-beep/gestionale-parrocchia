'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Printer, ArrowLeft, Church } from 'lucide-react';

interface ComunioneAtto {
  id: string;
  numero_atto: number | null;
  nome: string;
  cognome: string;
  data_nascita: string;
  luogo_nascita: string;
  data_comunione: string;
  luogo_comunione: string;
  ministro: string;
  padre: string;
  madre: string;
  parrocchia_id?: string;
}

interface Parrocchia {
  nome_parrocchia: string;
  diocesi: string;
  logo_url?: string;
}

function CertificatoComunioneContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [atto, setAtto] = useState<ComunioneAtto | null>(null);
  const [parrocchia, setParrocchia] = useState<Parrocchia | null>(null);

  useEffect(() => {
    if (id) {
      fetchAttoEParrocchia(id);
    } else {
      setLoading(false);
    }
  }, [id]);

  async function fetchAttoEParrocchia(attoId: string) {
    setLoading(true);
    const { data: attoData, error: attoError } = await supabase
      .from('comunioni')
      .select('*')
      .eq('id', attoId)
      .single();

    if (attoError || !attoData) {
      alert('Atto di prima comunione non trovato.');
      setLoading(false);
      return;
    }

    setAtto(attoData);

    if (attoData.parrocchia_id) {
      const { data: pData } = await supabase
        .from('parrocchie')
        .select('*')
        .eq('id', attoData.parrocchia_id)
        .single();
      if (pData) setParrocchia(pData);
    } else {
      const { data: pFallback } = await supabase
        .from('parrocchie')
        .select('*')
        .limit(1)
        .single();
      if (pFallback) setParrocchia(pFallback);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
        Caricamento dati certificato in corso...
      </div>
    );
  }

  if (!atto) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-700 gap-4">
        <p className="text-sm">Nessun atto selezionato o record non trovato.</p>
        <button
          onClick={() => router.push('/?view=comunioni')}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
        >
          Torna al Registro
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 print:bg-white print:p-0 p-6 flex flex-col items-center">
      {/* Barra di controllo superiore (nascosta in stampa) */}
      <div className="max-w-3xl w-full flex items-center justify-between mb-6 print:hidden">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Indietro
        </button>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition shadow-md cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Stampa Certificato
        </button>
      </div>

      {/* Foglio del Certificato (Formato A4 ottimizzato per stampa) */}
      <div className="max-w-3xl w-full bg-white border border-slate-200 print:border-none shadow-lg print:shadow-none p-12 rounded-2xl print:rounded-none relative space-y-8 font-serif">
        
        {/* Intestazione Parrocchia / Diocesi */}
        <div className="text-center space-y-2 border-b border-slate-200 pb-6">
          <div className="flex justify-center mb-2">
            {parrocchia?.logo_url && parrocchia.logo_url !== '/logo.png' ? (
              <img src={parrocchia.logo_url} alt="Logo" className="w-16 h-16 object-contain" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                <Church className="w-8 h-8" />
              </div>
            )}
          </div>
          <span className="text-[11px] font-sans font-bold tracking-widest text-blue-800 uppercase block">
            {parrocchia?.diocesi || 'Arcidiocesi'}
          </span>
          <h1 className="text-xl font-extrabold text-slate-900 uppercase tracking-wide">
            {parrocchia?.nome_parrocchia || 'Parrocchia'}
          </h1>
        </div>

        {/* Titolo del Certificato */}
        <div className="text-center space-y-1 pt-4">
          <h2 className="text-2xl font-extrabold uppercase tracking-widest text-slate-900">
            CERTIFICATO DI PRIMA COMUNIONE
          </h2>
          <p className="text-xs font-sans text-slate-500">
            (Estratto dal Registro delle Comunioni)
          </p>
        </div>

        {/* Corpo del Certificato */}
        <div className="text-sm font-serif leading-loose text-slate-800 space-y-6 pt-4 px-4">
          <p className="text-justify">
            Si certifica che <strong>{atto.cognome} {atto.nome}</strong>, 
            nato/a a <span className="underline decoration-dotted underline-offset-4">{atto.luogo_nascita || '__________'}</span> il{' '}
            <strong>{atto.data_nascita ? new Date(atto.data_nascita).toLocaleDateString('it-IT') : '__________'}</strong>,
            figlio/a di <span className="underline decoration-dotted underline-offset-4">{atto.padre || '____________________'}</span> e di{' '}
            <span className="underline decoration-dotted underline-offset-4">{atto.madre || '____________________'}</span>,
          </p>

          <p className="text-justify">
            ha amministrato per la prima volta il Santissimo Sacramento dell&apos;Eucaristia (Prima Comunione) in questa Chiesa Parrocchiale il giorno{' '}
            <strong>{atto.data_comunione ? new Date(atto.data_comunione).toLocaleDateString('it-IT') : '__________'}</strong>.
          </p>

          <p className="text-justify">
            Dal predetto Registro risulta altresì che l&apos;atto è registrato al 
            N. <strong className="underline">{atto.numero_atto || '____'}</strong>.
          </p>
        </div>

        {/* Data e Firma del Parroco */}
        <div className="pt-16 flex justify-between items-end px-4 font-sans text-xs">
          <div>
            <p className="text-slate-500">Data rilascio: {new Date().toLocaleDateString('it-IT')}</p>
          </div>
          <div className="text-center space-y-8">
            <p className="text-slate-400 text-[11px]">Il Parroco / Cancelliere</p>
            <div className="w-48 border-b border-slate-400"></div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function CertificatoComunionePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">Caricamento in corso...</div>}>
      <CertificatoComunioneContent />
    </Suspense>
  );
}