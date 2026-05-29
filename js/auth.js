// public/js/auth.js - Authentication Module
import { supabase } from './supabase.js';
import { UIComponents } from './ui.js';

// Rate limiter
class RateLimiter {
    constructor(maxAttempts = 5, windowMs = 900000) {
        this.attempts = [];
        this.maxAttempts = maxAttempts;
        this.windowMs = windowMs;
    }
    
    check(email) {
        const now = Date.now();
        this.attempts = this.attempts.filter(a => now - a.timestamp < this.windowMs);
        const userAttempts = this.attempts.filter(a => a.email === email);
        return userAttempts.length < this.maxAttempts;
    }
    
    record(email, success) {
        this.attempts.push({ email, timestamp: Date.now(), success });
    }
}

// Session Manager
class SessionManager {
    constructor(timeoutMs = 30 * 60 * 1000) {
        this.timeoutMs = timeoutMs;
        this.lastActivity = Date.now();
        this.interval = null;
    }
    
    start() {
        this.updateActivity();
        ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
            document.addEventListener(event, () => this.updateActivity());
        });
        this.interval = setInterval(() => this.check(), 60000);
    }
    
    updateActivity() { this.lastActivity = Date.now(); }
    
    async check() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && Date.now() - this.lastActivity > this.timeoutMs) {
            await supabase.auth.signOut();
            UIComponents.showToast('Session expired. Please login again.', 'warning');
            window.location.href = '/login.html?expired=true';
        }
    }
    
    stop() { if (this.interval) clearInterval(this.interval); }
}

// Validation
export function validateEmail(email) {
    const re = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
    return re.test(String(email).toLowerCase());
}

export function validatePassword(password) {
    const errors = [];
    if (password.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('One number');
    if (!/[!@#$%^&*]/.test(password)) errors.push('One special character');
    return { valid: errors.length === 0, errors };
}

export const rateLimiter = new RateLimiter();
export const sessionManager = new SessionManager();

// Auth functions
export async function login(email, password) {
    if (!validateEmail(email)) return { success: false, error: 'Invalid email format' };
    if (!rateLimiter.check(email)) return { success: false, error: 'Too many attempts. Try again in 15 minutes.' };
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    rateLimiter.record(email, !error);
    
    if (error) return { success: false, error: error.message === 'Invalid login credentials' ? 'Invalid email or password' : error.message };
    if (!data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        return { success: false, error: 'Please verify your email before logging in.' };
    }
    return { success: true, user: data.user };
}

export async function register(email, password, fullName) {
    if (!validateEmail(email)) return { success: false, error: 'Invalid email format' };
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) return { success: false, error: `Password must have: ${passwordCheck.errors.join(', ')}` };
    if (!fullName || fullName.trim().length < 2) return { success: false, error: 'Full name is required' };
    
    const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/login.html?verified=true` }
    });
    
    if (error) return { success: false, error: error.message };
    if (data.user) await supabase.from('profiles').upsert({ id: data.user.id, email, full_name: fullName, role: 'learner' });
    return { success: true, message: 'Verification email sent! Check your inbox.' };
}

export async function logout() { await supabase.auth.signOut(); window.location.href = '/'; }

export async function resendVerification(email) {
    const { error } = await supabase.auth.resend({ email, type: 'signup' });
    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Verification email resent!' };
}
