// public/supabase.js - Frontend Supabase Client
// This file is served to the browser

const MEI_DRIVE_API = {
    // Base URL for API calls
    baseUrl: window.location.origin,
    
    // Helper function for API calls
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('access_token');
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.message || 'Request failed');
        }
        
        return data;
    },
    
    // Auth endpoints
    async login(email, password) {
        const result = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (result.session?.access_token) {
            localStorage.setItem('access_token', result.session.access_token);
            localStorage.setItem('user', JSON.stringify(result.user));
        }
        
        return result;
    },
    
    async register(email, password, fullName, phone) {
        return this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, full_name: fullName, phone })
        });
    },
    
    async logout() {
        await this.request('/api/auth/logout', { method: 'POST' });
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
    },
    
    async getCurrentUser() {
        try {
            const result = await this.request('/api/auth/me');
            return result.user;
        } catch (error) {
            return null;
        }
    },
    
    // Course endpoints
    async getAllCourses() {
        const result = await this.request('/api/courses');
        return result.courses || [];
    },
    
    async getCourseById(id) {
        const result = await this.request(`/api/courses/${id}`);
        return result.course;
    },
    
    // Enrollment endpoints
    async getMyEnrollments() {
        const result = await this.request('/api/enrollments/my-enrollments');
        return result.enrollments || [];
    },
    
    async enrollInCourse(courseId) {
        const result = await this.request('/api/enrollments', {
            method: 'POST',
            body: JSON.stringify({ course_id: courseId })
        });
        return result;
    },
    
    async updateProgress(enrollmentId, unitId, status, quizScore) {
        const result = await this.request(`/api/enrollments/${enrollmentId}/progress`, {
            method: 'PUT',
            body: JSON.stringify({ unit_id: unitId, status, quiz_score: quizScore })
        });
        return result;
    },
    
    // Payment endpoints
    async initiateMpesaPayment(phoneNumber, amount, courseId) {
        const result = await this.request('/api/payments/mpesa/initiate', {
            method: 'POST',
            body: JSON.stringify({ phoneNumber, amount, course_id: courseId })
        });
        return result;
    },
    
    async checkPaymentStatus(checkoutRequestId) {
        const result = await this.request(`/api/payments/mpesa/status/${checkoutRequestId}`);
        return result;
    },
    
    async getMyPayments() {
        const result = await this.request('/api/payments/my-payments');
        return result.payments || [];
    },
    
    // Get stored user
    getStoredUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },
    
    // Check if logged in
    isLoggedIn() {
        return !!localStorage.getItem('access_token');
    }
};

// Make available globally
window.MEI_DRIVE_API = MEI_DRIVE_API;

console.log('✅ MEI DRIVE API Client Ready');
