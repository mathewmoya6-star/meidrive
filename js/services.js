// public/js/services.js - Services Module
import { supabase } from './supabase.js';
import { UIComponents } from './ui.js';

export const cacheService = {
    cache: new Map(),
    get(key) { return this.cache.get(key); },
    set(key, value) { this.cache.set(key, value); setTimeout(() => this.cache.delete(key), 300000); },
    clear() { this.cache.clear(); }
};

export const apiService = {
    async fetchWithRetry(fn, retries = 3, delay = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                const result = await fn();
                if (result.error) throw result.error;
                return result;
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
                UIComponents.showToast(`Retrying... (${i + 1}/${retries})`, 'warning');
            }
        }
    }
};

export const courseService = {
    async loadCourses(limit = 12) {
        const cached = cacheService.get('courses');
        if (cached) return cached;
        
        const { data, error } = await supabase
            .from('courses')
            .select('id, title, description, type, price, icon, duration, level')
            .order('id', { ascending: true })
            .limit(limit);
        
        if (error) throw error;
        cacheService.set('courses', data);
        return data;
    },
    
    async loadCourseById(id) {
        const { data, error } = await supabase.from('courses').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    },
    
    async checkAccess(courseId, userId) {
        const { data: course } = await supabase.from('courses').select('type').eq('id', courseId).single();
        if (course?.type === 'free') return true;
        const { data: enrollment } = await supabase.from('enrollments').select('id').eq('user_id', userId).eq('course_id', courseId).maybeSingle();
        return !!enrollment;
    },
    
    async enroll(userId, courseId) {
        const { error } = await supabase.from('enrollments').insert({ user_id: userId, course_id: courseId, progress: 0 });
        if (error) throw error;
        return true;
    }
};
