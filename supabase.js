// ============================================
// SUPABASE CONFIGURATION - SINGLE SOURCE OF TRUTH
// ============================================

const SUPABASE_URL = 'https://jeksrwrzzrczamxijvwl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impla3Nyd3J6enJjemFteGlqdndsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NzYyMjAsImV4cCI6MjA5NDI1MjIyMH0.1poYpJKNFEVe2NTBkXBTH2bIHGk2yT8aqCU-OlJc4vs';

let _supabase = null;

/**
 * Initialize Supabase client (singleton pattern)
 * Returns the same instance every time
 */
function initSupabase() {
    if (!_supabase) {
        console.log('🚀 Initializing Supabase client...');
        _supabase = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY
        );
        console.log('✅ Supabase client initialized');
    }
    return _supabase;
}

// Make available globally (for other scripts)
window.initSupabase = initSupabase;

// Optional: Pre-initialize
const supabase = initSupabase();
window.supabaseClient = supabase;

console.log('📦 supabase.js loaded - Singleton pattern active');
