// config/database.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Public client (for regular operations)
export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    }
);

// Service role client (for admin operations - use with caution!)
export const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Helper to check if user is admin
export async function isAdmin(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('role, is_admin')
        .eq('id', userId)
        .single();
    
    if (error) return false;
    return data?.role === 'admin' || data?.is_admin === true;
}

// Helper to get user profile
export async function getUserProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (error) return null;
    return data;
}

// Helper to create or update user profile
export async function upsertUserProfile(userId, userData) {
    const { data, error } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            ...userData,
            updated_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

export default { supabase, supabaseAdmin, isAdmin, getUserProfile, upsertUserProfile };
