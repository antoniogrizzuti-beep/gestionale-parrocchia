import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'ID utente mancante' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Elimina prima la riga dalla tabella profili
    const { error: profileError } = await supabaseAdmin
      .from('profili')
      .delete()
      .eq('id', userId);

    if (profileError) {
      return NextResponse.json(
        { error: `Errore tabella profili: ${profileError.message}` },
        { status: 400 }
      );
    }

    // 2. Tenta di eliminare l'utente da Supabase Auth (se le chiavi admin lo permettono)
    try {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    } catch (authErr) {
      console.warn('Cancellazione Auth saltata o non autorizzata:', authErr);
    }

    return NextResponse.json({ success: true, message: 'Collaboratore eliminato con successo!' });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Errore interno del server' },
      { status: 500 }
    );
  }
}