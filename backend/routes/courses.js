// routes/courses.js
import express from 'express';
import { authenticateUser, optionalAuth } from '../middleware/auth.js';
import { supabase } from '../config/database.js';

const router = express.Router();

// Get all published courses (public)
router.get('/', optionalAuth, async (req, res) => {
    try {
        let query = supabase
            .from('courses')
            .select('*, category:category_id(name, icon)')
            .eq('is_published', true)
            .order('display_order', { ascending: true });
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // If user is logged in, get enrollment status
        if (req.userId) {
            const { data: enrollments } = await supabase
                .from('enrollments')
                .select('course_id, progress')
                .eq('user_id', req.userId);
            
            const enrollmentMap = new Map();
            enrollments?.forEach(e => enrollmentMap.set(e.course_id, e));
            
            const coursesWithEnrollment = data.map(course => ({
                ...course,
                is_enrolled: enrollmentMap.has(course.id),
                progress: enrollmentMap.get(course.id)?.progress || 0
            }));
            
            return res.json({ success: true, courses: coursesWithEnrollment });
        }
        
        res.json({ success: true, courses: data });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single course by slug or ID
router.get('/:identifier', optionalAuth, async (req, res) => {
    try {
        const { identifier } = req.params;
        const isId = !isNaN(identifier);
        
        let query = supabase
            .from('courses')
            .select('*, category:category_id(*)')
            .eq(isId ? 'id' : 'slug', identifier)
            .single();
        
        const { data: course, error } = await query;
        
        if (error || !course) {
            return res.status(404).json({ success: false, error: 'Course not found' });
        }
        
        // Get course units
        const { data: units } = await supabase
            .from('units')
            .select('*')
            .eq('course_id', course.id)
            .eq('is_published', true)
            .order('unit_number', { ascending: true });
        
        course.units = units || [];
        course.total_units = units?.length || 0;
        
        // Get enrollment status if user is logged in
        if (req.userId) {
            const { data: enrollment } = await supabase
                .from('enrollments')
                .select('*')
                .eq('user_id', req.userId)
                .eq('course_id', course.id)
                .single();
            
            course.is_enrolled = !!enrollment;
            course.enrollment_progress = enrollment?.progress || 0;
            course.enrollment_status = enrollment?.status || null;
        }
        
        res.json({ success: true, course });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get course units (for enrolled users)
router.get('/:courseId/units', authenticateUser, async (req, res) => {
    try {
        const { courseId } = req.params;
        
        // Check if user is enrolled
        const { data: enrollment, error: enrollmentError } = await supabase
            .from('enrollments')
            .select('id, status')
            .eq('user_id', req.userId)
            .eq('course_id', courseId)
            .single();
        
        if (enrollmentError || !enrollment) {
            return res.status(403).json({
                success: false,
                error: 'You are not enrolled in this course'
            });
        }
        
        // Get units
        const { data: units, error } = await supabase
            .from('units')
            .select('*')
            .eq('course_id', courseId)
            .eq('is_published', true)
            .order('unit_number', { ascending: true });
        
        if (error) throw error;
        
        // Get unit progress
        const { data: progress } = await supabase
            .from('unit_progress')
            .select('unit_id, status, quiz_score')
            .eq('enrollment_id', enrollment.id);
        
        const progressMap = new Map();
        progress?.forEach(p => progressMap.set(p.unit_id, p));
        
        const unitsWithProgress = units.map(unit => ({
            ...unit,
            progress_status: progressMap.get(unit.id)?.status || 'locked',
            quiz_score: progressMap.get(unit.id)?.quiz_score || 0
        }));
        
        res.json({ success: true, units: unitsWithProgress });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
