// src/auth.js - Centralized auth service
const API_URL = window.location.origin;

class AuthService {
    constructor() {
        this.listeners = [];
        this.currentUser = null;
        this.isLoading = false;
        this.error = null;
    }
    
    // Subscribe to auth state changes
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }
    
    // Notify all listeners
    notify() {
        this.listeners.forEach(listener => listener(this.getState()));
    }
    
    getState() {
        return {
            user: this.currentUser,
            isLoading: this.isLoading,
            error: this.error
        };
    }
    
    // Validate input
    validateEmail(email) {
        const re = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
        return re.test(String(email).toLowerCase());
    }
    
    validatePassword(password) {
        return password && password.length >= 6;
    }
    
    validateFullName(name) {
        return name && name.trim().length >= 2;
    }
    
    // Register
    async register(email, password, fullName) {
        this.isLoading = true;
        this.error = null;
        this.notify();
        
        try {
            // Frontend validation
            if (!this.validateEmail(email)) {
                throw new Error('Invalid email format');
            }
            if (!this.validatePassword(password)) {
                throw new Error('Password must be at least 6 characters');
            }
            if (!this.validateFullName(fullName)) {
                throw new Error('Full name is required');
            }
            
            const response = await fetch(`${API_URL}/api/auth?action=register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, fullName })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }
            
            this.isLoading = false;
            this.notify();
            return { success: true, message: data.message };
            
        } catch (error) {
            this.isLoading = false;
            this.error = error.message;
            this.notify();
            return { success: false, error: error.message };
        }
    }
    
    // Login
    async login(email, password) {
        this.isLoading = true;
        this.error = null;
        this.notify();
        
        try {
            if (!this.validateEmail(email)) {
                throw new Error('Invalid email format');
            }
            if (!this.validatePassword(password)) {
                throw new Error('Invalid password');
            }
            
            const response = await fetch(`${API_URL}/api/auth?action=login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }
            
            // Store session
            localStorage.setItem('access_token', data.session.access_token);
            localStorage.setItem('refresh_token', data.session.refresh_token);
            this.currentUser = data.user;
            
            this.isLoading = false;
            this.notify();
            return { success: true, user: data.user };
            
        } catch (error) {
            this.isLoading = false;
            this.error = error.message;
            this.notify();
            return { success: false, error: error.message };
        }
    }
    
    // Logout
    async logout() {
        this.isLoading = true;
        this.notify();
        
        try {
            await fetch(`${API_URL}/api/auth?action=logout`, {
                method: 'POST'
            });
            
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            this.currentUser = null;
            
            this.isLoading = false;
            this.notify();
            return { success: true };
            
        } catch (error) {
            this.isLoading = false;
            this.error = error.message;
            this.notify();
            return { success: false, error: error.message };
        }
    }
    
    // Check if user is authenticated
    async checkAuth() {
        const token = localStorage.getItem('access_token');
        if (!token) {
            this.currentUser = null;
            this.notify();
            return false;
        }
        
        try {
            const response = await fetch(`${API_URL}/api/auth?action=user`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                throw new Error('Invalid session');
            }
            
            const data = await response.json();
            this.currentUser = data.user;
            this.notify();
            return true;
            
        } catch (error) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            this.currentUser = null;
            this.notify();
            return false;
        }
    }
    
    // Check if user has access to premium course
    async checkCourseAccess(courseId) {
        const token = localStorage.getItem('access_token');
        if (!token) return false;
        
        try {
            const response = await fetch(`${API_URL}/api/courses/${courseId}/access`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const data = await response.json();
            return data.hasAccess;
            
        } catch (error) {
            return false;
        }
    }
    
    isAuthenticated() {
        return !!this.currentUser;
    }
    
    isAdmin() {
        return this.currentUser?.role === 'admin';
    }
}

export const auth = new AuthService();
