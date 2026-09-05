import { supabase } from '@/lib/supabase';

export async function registraLog(tabella: string, recordId: string, azione: string, dettagli?: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Recupera nome e cognome o email dell'utente corrente dalla tabella profili
    const { data: profilo } = await supabase
      .from('profili')
      .select('nome, cognome')
      .eq('id', session.user.id)
      .single();

    const nomeCompleto = profilo?.nome || profilo?.cognome 
      ? `${profilo.nome || ''} ${profilo.cognome || ''}`.trim() 
      : session.user.email;

    await supabase.from('registri_log').insert([{
      tabella,
      record_id: recordId,
      azione,
      dettagli,
      utente_id: session.user.id,
      utente_email: nomeCompleto
    }]);
  } catch (err) {
    console.error('Errore scrittura log:', err);
  }
}