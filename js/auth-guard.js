// public/js/auth-guard.js
import { supabase } from '../../src/supabase.js';

export async function requireAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

export async function requireAdmin() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '/login.html';
        return false;
    }
    
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
    
    if (profile?.role !== 'admin') {
        window.location.href = '/dashboard.html';
        return false;
    }
    return true;
}
