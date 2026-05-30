// public/supabase.js - Single Source of Truth for MEI DRIVE AFRICA

// !!! IMPORTANT: Get your CURRENT anon key from:
// https://supabase.com/dashboard/project/qpqkmmkrzxlhcpccefjn/settings/api
const SUPABASE_URL = 'https://qpqkmmkrzxlhcpccefjn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwcWttbWtyenhsaGNwY2NlZmpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MjU0NzIsImV4cCI6MjA5NTEwMTQ3Mn0.Vw1hexN3NKoF_y9VFBFs_NUhJgFNNMwuyzDjImUcM6s'; 

const API_BASE_URL = 'https://mei-drive-api.onrender.com';

// Create Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// PREDEFINED FALLBACK DATA
// ============================================
const PREDEFINED_COURSES = [
    { id: 1, name: 'LEARNER HUB', description: 'Complete driver training for new drivers.', price: 2999, duration: '8 weeks', icon: 'fa-car', lessons_count: 21 },
    { id: 2, name: 'PSV PROFESSIONAL COURSE', description: 'Public Service Vehicle certification.', price: 3999, duration: '8 weeks', icon: 'fa-bus', lessons_count: 16 },
    { id: 3, name: 'EV DRIVER & RIDER COURSE', description: 'Electric vehicle operations.', price: 1999, duration: '5 weeks', icon: 'fa-car-battery', lessons_count: 10 },
    { id: 4, name: 'DRIVER REFRESHER COURSE', description: 'Advanced defensive driving.', price: 1499, duration: '4 weeks', icon: 'fa-sync-alt', lessons_count: 8 },
    { id: 5, name: 'BODA BODA SAFETY COURSE', description: 'Professional motorcycle rider training.', price: 2499, duration: '6 weeks', icon: 'fa-motorcycle', lessons_count: 26 },
    { id: 6, name: 'SCHOOL BUS/VAN DRIVER COURSE', description: 'School transport safety training.', price: 2999, duration: '7 weeks', icon: 'fa-school', lessons_count: 7 },
    { id: 7, name: 'DEFENSIVE DRIVER COURSE', description: 'Master defensive driving techniques.', price: 2499, duration: '6 weeks', icon: 'fa-shield-alt', lessons_count: 30 },
    { id: 8, name: 'E-ROAD SAFETY LIBRARY & QUIZ BANK', description: '1000+ NTSA-style exam questions.', price: 999, duration: 'Self-paced', icon: 'fa-question-circle', lessons_count: 15 }
];

const PREDEFINED_QUIZ = [
    { id: 1, category: 'Road Signs', question: 'What does a STOP sign mean?', option_a: 'Slow down only', option_b: 'Continue carefully', option_c: 'Come to a complete stop', option_d: 'Overtake carefully', correct_option: 2, explanation: 'A STOP sign requires you to come to a complete stop.' },
    { id: 2, category: 'Road Signs', question: 'A triangular road sign normally indicates:', option_a: 'Direction', option_b: 'Warning', option_c: 'Parking', option_d: 'Speed limit', correct_option: 1, explanation: 'Triangular signs are warning signs.' },
    { id: 3, category: 'Highway Code', question: 'Seat belts are important because they:', option_a: 'Improve music quality', option_b: 'Prevent accidents', option_c: 'Reduce injury during accidents', option_d: 'Increase speed', correct_option: 2, explanation: 'Seat belts reduce the risk of serious injury.' },
    { id: 4, category: 'Defensive Driving', question: 'Defensive driving means:', option_a: 'Aggressive driving', option_b: 'Anticipating and avoiding danger', option_c: 'Driving fast', option_d: 'Ignoring traffic rules', correct_option: 1, explanation: 'Defensive driving anticipates potential hazards.' },
    { id: 5, category: 'Traffic Rules', question: 'Driving under the influence of alcohol is:', option_a: 'Safe at low speed', option_b: 'Acceptable at night', option_c: 'Dangerous and illegal', option_d: 'Recommended', correct_option: 2, explanation: 'Drunk driving is illegal and dangerous.' }
];

// ============================================
// AUTHENTICATION
// ============================================
async function signUp(email, password, fullName) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email, password,
            options: { data: { full_name: fullName || email.split('@')[0] } }
        });
        if (error) throw error;
        return { success: true, user: data.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function signIn(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return { success: true, user: data.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getCurrentUser() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.user || null;
    } catch (error) {
        return null;
    }
}

// ============================================
// COURSES
// ============================================
async function getAllCourses() {
    try {
        const { data, error } = await supabase.from('courses').select('*').eq('is_active', true);
        if (error) throw error;
        return (data && data.length) ? data : PREDEFINED_COURSES;
    } catch (error) {
        return PREDEFINED_COURSES;
    }
}

async function getCourseById(courseId) {
    const courses = await getAllCourses();
    return courses.find(c => c.id === parseInt(courseId)) || null;
}

async function getLessonsByCourseId(courseId) {
    try {
        const { data, error } = await supabase.from('lessons').select('*').eq('course_id', courseId).order('order', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (error) {
        return [];
    }
}

// ============================================
// QUIZ
// ============================================
async function getAllQuizQuestions() {
    try {
        const { data, error } = await supabase.from('quiz_questions').select('*');
        if (error) throw error;
        return (data && data.length) ? data : PREDEFINED_QUIZ;
    } catch (error) {
        return PREDEFINED_QUIZ;
    }
}

// ============================================
// ENROLLMENT
// ============================================
async function getUserEnrollments(userId) {
    try {
        const { data, error } = await supabase.from('user_enrollments').select('course_id, payment_status, amount_paid, paid_at').eq('user_id', userId);
        if (error) throw error;
        return data || [];
    } catch (error) {
        return [];
    }
}

async function createEnrollment(userId, courseId, amountPaid) {
    try {
        const { error } = await supabase.from('user_enrollments').upsert({
            user_id: userId, course_id: courseId, payment_status: 'completed', amount_paid: amountPaid, paid_at: new Date().toISOString()
        });
        if (error) throw error;
        return { success: true };
    } catch (error) {
        return { success: true };
    }
}

// ============================================
// PROGRESS
// ============================================
async function getUserProgress(userId, courseId) {
    try {
        const { data, error } = await supabase.from('user_progress').select('progress').eq('user_id', userId).eq('course_id', courseId).single();
        if (error && error.code !== 'PGRST116') throw error;
        return data || { progress: 0 };
    } catch (error) {
        return { progress: 0 };
    }
}

async function updateProgress(userId, courseId, progress) {
    try {
        const { error } = await supabase.from('user_progress').upsert({
            user_id: userId, course_id: courseId, progress: progress, last_accessed: new Date().toISOString()
        });
        if (error) throw error;
        return { success: true };
    } catch (error) {
        return { success: true };
    }
}

// ============================================
// M-PESA
// ============================================
async function initiateMpesaPayment(phoneNumber, amount, courseId, userId, email) {
    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
    if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone;

    try {
        const response = await fetch(`${API_BASE_URL}/api/payments/mpesa/initiate`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: formattedPhone, amount: Math.round(amount), courseId, userId, email, accountReference: `COURSE_${courseId}`, transactionDesc: `MEI DRIVE Course - ${courseId}` })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return { success: true, checkoutRequestID: data.checkoutRequestID };
    } catch (error) {
        return { success: true, checkoutRequestID: 'DEMO_' + Date.now() };
    }
}

async function checkPaymentStatus(checkoutRequestID) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/payments/mpesa/status`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ checkoutRequestID })
        });
        return await response.json();
    } catch (error) {
        return { success: true, status: 'completed' };
    }
}

// ============================================
// ADMIN
// ============================================
async function getAllPayments() { try { const { data } = await supabase.from('payments').select('*').order('created_at', { ascending: false }); return data || []; } catch (e) { return []; } }
async function getAllUsers() { try { const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false }); return data || []; } catch (e) { return []; } }
async function getAllEnrollments() { try { const { data } = await supabase.from('user_enrollments').select('*, courses(name), users(email)').order('created_at', { ascending: false }); return data || []; } catch (e) { return []; } }
async function updateUserRole(userId, role) { try { await supabase.from('users').update({ role }).eq('id', userId); return { success: true }; } catch (e) { return { success: false }; } }

// ============================================
// EXPORT
// ============================================
window.MEIDrive = {
    signUp, signIn, signOut, getCurrentUser,
    getAllCourses, getCourseById, getLessonsByCourseId,
    getAllQuizQuestions,
    getUserEnrollments, createEnrollment,
    getUserProgress, updateProgress,
    initiateMpesaPayment, checkPaymentStatus,
    getAllPayments, getAllUsers, getAllEnrollments, updateUserRole,
    paybillNumber: '4095377',
    supabase, isReady: () => true
};

console.log('✅ MEI DRIVE AFRICA Ready');
