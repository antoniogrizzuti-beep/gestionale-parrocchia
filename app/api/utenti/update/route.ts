import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function PUT(request: Request) {
  try {
    const { id, nome, cognome, username, ruolo, paese, lingua } = await request.json();

    if (!id || !nome || !cognome || !username || !ruolo) {
      return NextResponse.json({ error: 'Tutti i campi obbligatori sono richiesti.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const cleanUsername = username.trim().toLowerCase();
    const nuovaEmail = cleanUsername.includes('@')
      ? cleanUsername
      : `${cleanUsername}@parrocchia.it`;

    // 1. Aggiorna l'email/username in Supabase Auth
    await supabaseAdmin.auth.admin.updateUserById(id, {
      email: nuovaEmail,
    });

    // 2. Aggiorna la tabella profili (inclusi paese e lingua)
    const { error: profileError } = await supabaseAdmin
      .from('profili')
      .update({
        nome: nome.trim(),
        cognome: cognome.trim(),
        username: cleanUsername,
        ruolo,
        paese: paese || 'IT',
        lingua: lingua || 'it',
      })
      .eq('id', id);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Collaboratore aggiornato con successo!' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Errore del server' }, { status: 500 });
  }
}