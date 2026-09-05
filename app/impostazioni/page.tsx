'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Building2, Image as ImageIcon, Save, ArrowLeft } from 'lucide-react';

export default function ImpostazioniPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [nomeParrocchia, setNomeParrocchia] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState('/logo.png');

  useEffect(() => {
    fetchUserData();
  }, []);

  async function fetchUserData() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push('/login');
      return;
    }

    setUserId(session.user.id);

    // Recupera i dati attuali del profilo
    const { data: profilo } = await supabase
      .from('profili')
      .select('nome_parrocchia, logo_url')
      .eq('id', session.user.id)
      .single();

    if (profilo) {
      setNomeParrocchia(profilo.nome_parrocchia || '');
      if (profilo.logo_url) {
        setCurrentLogoUrl(profilo.logo_url);
      }
    }

    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    let newLogoUrl = currentLogoUrl;

    try {
      // 1. Se l'utente ha selezionato un nuovo file immagine, lo carichiamo su Supabase Storage
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('loghi')
          .upload(filePath, logoFile, { upsert: true });

        if (uploadError) {
          throw new Error('Errore durante il caricamento del logo: ' + uploadError.message);
        }

        // 2. Recupera l'URL pubblico dell'immagine caricata
        const { data: publicUrlData } = supabase.storage
          .from('loghi')
          .getPublicUrl(filePath);

        newLogoUrl = publicUrlData.publicUrl;
      }

      // 3. Aggiorna la tabella profili con il nuovo nome parrocchia e il nuovo URL del logo
      const { error: updateError } = await supabase
        .from('profili')
        .update({
          nome_parrocchia: nomeParrocchia,
          logo_url: newLogoUrl,
        })
        .eq('id', userId);

      if (updateError) {
        throw new Error('Errore durante il salvataggio: ' + updateError.message);
      }

      alert('Impostazioni salvate con successo!');
      router.push('/');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-slate-500 text-sm">
        Caricamento impostazioni...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-800 py-10 px-6">
      <div className="max-w-xl mx-auto space-y-6">
        
        {/* Intestazione */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition text-slate-700 text-xs font-semibold shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Torna alla Home
          </button>
          <h1 className="text-xl font-bold font-serif text-slate-900">Personalizzazione Parrocchia</h1>
        </div>

        {/* Form Impostazioni */}
        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          
          {/* Nome Parrocchia */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Nome della Parrocchia
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={nomeParrocchia}
                onChange={(e) => setNomeParrocchia(e.target.value)}
                placeholder="Es. Parrocchia San Giuseppe"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium"
              />
            </div>
          </div>

          {/* Logo Attuale e Caricamento Nuovo Logo */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Stemma / Logo Parrocchiale
            </label>
            
            <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="w-16 h-16 relative bg-white border border-slate-200 rounded-lg p-1 flex items-center justify-center shrink-0">
                <img
                  src={logoFile ? URL.createObjectURL(logoFile) : currentLogoUrl}
                  alt="Anteprima Logo"
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setLogoFile(e.target.files[0]);
                    }
                  }}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">Formati consigliati: PNG o JPG con sfondo trasparente o chiaro.</p>
              </div>
            </div>
          </div>

          {/* Pulsante Salva */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Salvataggio in corso...' : 'Salva Modifiche'}
          </button>

        </form>

      </div>
    </main>
  );
}