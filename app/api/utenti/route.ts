import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, nome, cognome, ruolo, paese, lingua } = body;

    if (!username || !password || !nome || !cognome || !ruolo) {
      return NextResponse.json(
        { error: 'Tutti i campi sono obbligatori.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La password deve contenere almeno 6 caratteri.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const cleanUsername = username.trim().toLowerCase();
    const emailFittizia = cleanUsername.includes('@')
      ? cleanUsername
      : `${cleanUsername}@parrocchia.it`;

    // 1. Inserimento in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: emailFittizia,
      password: password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Errore durante la registrazione Auth.' },
        { status: 400 }
      );
    }

    // 2. Inserimento nella tabella profili (inclusi paese e lingua)
    const { error: profileError } = await supabase
      .from('profili')
      .upsert({
        id: authData.user.id,
        nome: nome.trim(),
        cognome: cognome.trim(),
        username: cleanUsername,
        ruolo: ruolo,
        paese: paese || 'IT',
        lingua: lingua || 'it',
      });

    if (profileError) {
      return NextResponse.json(
        { error: `Utente creato ma errore profilo: ${profileError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: 'Collaboratore registrato con successo!' });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Errore del server' },
      { status: 500 }
    );
  }
}