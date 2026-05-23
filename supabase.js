// supabase.js - MEI DRIVE AFRICA
// Updated with your new Supabase project credentials

// ============================================
// 1. CONFIGURATION (UPDATED)
// ============================================
const SUPABASE_URL = 'https://qpqkmmkrzxlhcpccefjn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwcWttbWtyenhsaGNwY2NlZmpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MjU0NzIsImV4cCI6MjA5NTEwMTQ3Mn0.Vw1hexN3NKoF_y9VFBFs_NUhJgFNNMwuyzDjImUcM6s';

// ============================================
// 2. SINGLETON CLIENT
// ============================================
let supabaseClient = null;

// ============================================
// 3. INITIALIZATION FUNCTION
// ============================================
function initSupabase() {
    // Already initialized
    if (supabaseClient) {
        console.log('✓ Supabase client already initialized');
        return supabaseClient;
    }

    // Check if library is loaded
    if (typeof supabase === 'undefined' && typeof window.supabase === 'undefined') {
        console.error('✗ Supabase library not loaded. Add: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
        return null;
    }

    // Get library reference
    const supabaseLib = window.supabase || supabase;
    
    // Validate config
    if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        console.error('✗ Invalid Supabase URL');
        return null;
    }
    
    if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'YOUR_ANON_KEY_HERE') {
        console.error('✗ Invalid Supabase Anon Key');
        return null;
    }

    // Create client
    try {
        supabaseClient = supabaseLib.createClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY,
            {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true
                }
            }
        );
        
        console.log('✓ Supabase initialized successfully');
        console.log('✓ Project:', SUPABASE_URL);
        return supabaseClient;
        
    } catch (error) {
        console.error('✗ Supabase initialization failed:', error.message);
        return null;
    }
}

// ============================================
// 4. HELPER FUNCTIONS
// ============================================

// Check connection
async function checkSupabaseConnection() {
    if (!supabaseClient) return false;
    
    try {
        const { error } = await supabaseClient.from('courses').select('count', { count: 'exact', head: true });
        if (error) throw error;
        console.log('✓ Supabase connection verified');
        return true;
    } catch (error) {
        console.error('✗ Supabase connection failed:', error.message);
        return false;
    }
}

// Get current user
async function getCurrentUser() {
    if (!supabaseClient) return null;
    
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    if (error) {
        console.error('Error getting user:', error.message);
        return null;
    }
    return user;
}

// Get session
async function getSession() {
    if (!supabaseClient) return null;
    
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) {
        console.error('Error getting session:', error.message);
        return null;
    }
    return session;
}

// ============================================
// 5. EXPORTS (for different environments)
// ============================================

// Browser global
window.supabase = {
    client: null,
    init: initSupabase,
    checkConnection: checkSupabaseConnection,
    getUser: getCurrentUser,
    getSession: getSession,
    ready: false
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    window.supabase.client = initSupabase();
    if (window.supabase.client) {
        window.supabase.ready = true;
        await checkSupabaseConnection();
    }
});

// For ES6 modules (if using)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initSupabase,
        getSupabase: () => supabaseClient,
        checkConnection: checkSupabaseConnection,
        getCurrentUser,
        getSession
    };
}

// ============================================
// 6. QUICK TEST (Remove in production)
// ============================================
console.log('🚀 MEI DRIVE AFRICA - Supabase configured');
console.log('📡 Endpoint:', SUPABASE_URL);
