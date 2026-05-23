// supabase.js - SINGLE SOURCE OF TRUTH
const SUPABASE_URL = 'https://qpqkmmkrzxlhcpccefjn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwcWttbWtyenhsaGNwY2NlZmpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MjU0NzIsImV4cCI6MjA5NTEwMTQ3Mn0.Vw1hexN3NKoF_y9VFBFs_NUhJgFNNMwuyzDjImUcM6s';

let supabaseClient = null;

function initSupabase() {
    if (supabaseClient) return supabaseClient;
    if (typeof supabase === 'undefined' && typeof window.supabase === 'undefined') {
        console.error('❌ Supabase library not loaded');
        return null;
    }
    const supabaseLib = window.supabase || supabase;
    try {
        supabaseClient = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
        });
        console.log('✅ Supabase initialized');
        return supabaseClient;
    } catch (error) {
        console.error('❌ Init failed:', error.message);
        return null;
    }
}

const supabase = initSupabase();

async function getCurrentUser() {
    if (!supabase) return null;
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) return null;
    return user;
}

async function getSession() {
    if (!supabase) return null;
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) return null;
    return session;
}

async function loginUser(email, password) {
    if (!supabase) return { success: false, error: 'Supabase not ready' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
}

async function registerUser(email, password) {
    if (!supabase) return { success: false, error: 'Supabase not ready' };
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { success: false, error: error.message };
    if (data?.user?.identities?.length === 0) {
        return { success: false, error: 'Email already registered' };
    }
    return { success: true, error: null };
}

async function logoutUser() {
    if (!supabase) return;
    await supabase.auth.signOut();
}

async function fetchCourses() {
    if (!supabase) return [];
    const { data, error } = await supabase.from('courses').select('*').order('id');
    if (error) return [];
    return data || [];
}

async function fetchCourseById(courseId) {
    if (!supabase) return null;
    const { data, error } = await supabase.from('courses').select('*').eq('id', courseId).single();
    if (error) return null;
    return data;
}

async function fetchLessons(courseId) {
    if (!supabase) return [];
    const { data, error } = await supabase.from('lessons').select('*').eq('course_id', courseId).order('order_number');
    if (error) return [];
    return data || [];
}

async function fetchEnrollments(userId) {
    if (!supabase || !userId) return [];
    const { data, error } = await supabase.from('enrollments').select('*, courses(*)').eq('user_id', userId);
    if (error) return [];
    return data || [];
}

async function enrollInCourse(userId, courseId) {
    if (!supabase) return { success: false, error: 'Supabase not ready' };
    const { data: existing } = await supabase.from('enrollments').select('id').eq('user_id', userId).eq('course_id', courseId).single();
    if (existing) return { success: false, error: 'Already enrolled' };
    const { error } = await supabase.from('enrollments').insert([{ user_id: userId, course_id: Number(courseId), progress: 0, status: 'active' }]);
    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
}

async function updateProgress(userId, courseId, progress) {
    if (!supabase) return { success: false, error: 'Supabase not ready' };
    const { error } = await supabase.from('enrollments').update({ progress, last_accessed: new Date().toISOString(), completed_at: progress === 100 ? new Date().toISOString() : null, status: progress === 100 ? 'completed' : 'active' }).eq('user_id', userId).eq('course_id', courseId);
    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
}

async function fetchLessonProgress(userId) {
    if (!supabase || !userId) return [];
    const { data, error } = await supabase.from('lesson_progress').select('*').eq('user_id', userId);
    if (error) return [];
    return data || [];
}

async function toggleLessonComplete(userId, lessonId, completed) {
    if (!supabase) return { success: false, error: 'Supabase not ready' };
    if (completed) {
        const { error } = await supabase.from('lesson_progress').upsert({ user_id: userId, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() });
        if (error) return { success: false, error: error.message };
    } else {
        const { error } = await supabase.from('lesson_progress').delete().eq('user_id', userId).eq('lesson_id', lessonId);
        if (error) return { success: false, error: error.message };
    }
    return { success: true, error: null };
}

window.MEIDrive = {
    supabase,
    getCurrentUser,
    getSession,
    loginUser,
    registerUser,
    logoutUser,
    fetchCourses,
    fetchCourseById,
    fetchLessons,
    fetchEnrollments,
    enrollInCourse,
    updateProgress,
    fetchLessonProgress,
    toggleLessonComplete,
    isReady: () => supabase !== null
};

console.log('🚀 MEI DRIVE AFRICA Ready');
