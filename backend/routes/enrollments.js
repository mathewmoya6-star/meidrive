// routes/enrollments.js
import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { supabase } from '../config/database.js';
import { validateEnrollment } from '../middleware/validation.js';

const router = express.Router();

// Get user's enrollments
router.get('/my-enrollments', authenticateUser, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('enrollments')
            .select('*, courses(*)')
            .eq('user_id', req.userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        res.json({
            success: true,
            enrollments: data
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Enroll in course
router.post('/', authenticateUser, validateEnrollment, async (req, res) => {
    try {
        const { course_id } = req.body;
        
        // Check if already enrolled
        const { data: existing, error: checkError } = await supabase
            .from('enrollments')
            .select('id')
            .eq('user_id', req.userId)
            .eq('course_id', course_id)
            .single();
        
        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'Already enrolled in this course'
            });
        }
        
        // Get course details
        const { data: course, error: courseError } = await supabase
            .from('courses')
            .select('price, is_free')
            .eq('id', course_id)
            .single();
        
        if (courseError) throw courseError;
        
        // For free courses, create enrollment immediately
        if (course.is_free || course.price === 0) {
            const { data, error } = await supabase
                .from('enrollments')
                .insert({
                    user_id: req.userId,
                    course_id: course_id,
                    progress: 0,
                    status: 'active',
                    enrolled_at: new Date().toISOString(),
                    enrollment_number: `ENR-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
                })
                .select()
                .single();
            
            if (error) throw error;
            
            return res.json({
                success: true,
                message: 'Successfully enrolled in course',
                enrollment: data
            });
        }
        
        // For paid courses, return payment required
        res.json({
            success: false,
            payment_required: true,
            message: 'Payment required to enroll',
            course_id: course_id,
            amount: course.price
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update unit progress
router.put('/:enrollmentId/progress', authenticateUser, async (req, res) => {
    try {
        const { enrollmentId } = req.params;
        const { unit_id, status, quiz_score } = req.body;
        
        // Verify enrollment belongs to user
        const { data: enrollment, error: enrollmentError } = await supabase
            .from('enrollments')
            .select('id, course_id')
            .eq('id', enrollmentId)
            .eq('user_id', req.userId)
            .single();
        
        if (enrollmentError) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
        
        // Update or insert unit progress
        const { data, error } = await supabase
            .from('unit_progress')
            .upsert({
                enrollment_id: enrollmentId,
                unit_id: unit_id,
                status: status,
                quiz_score: quiz_score || 0,
                quiz_passed: quiz_score >= 70,
                completed_at: status === 'completed' ? new Date().toISOString() : null,
                last_accessed: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) throw error;
        
        // Update overall course progress
        const { data: completedUnits } = await supabase
            .from('unit_progress')
            .select('unit_id')
            .eq('enrollment_id', enrollmentId)
            .eq('status', 'completed');
        
        const { data: totalUnits } = await supabase
            .from('units')
            .select('id')
            .eq('course_id', enrollment.course_id)
            .eq('is_published', true);
        
        const progressPercent = Math.round((completedUnits?.length || 0) / (totalUnits?.length || 1) * 100);
        
        await supabase
            .from('enrollments')
            .update({
                progress: progressPercent,
                last_accessed: new Date().toISOString(),
                status: progressPercent === 100 ? 'completed' : 'active',
                completed_at: progressPercent === 100 ? new Date().toISOString() : null
            })
            .eq('id', enrollmentId);
        
        res.json({
            success: true,
            message: 'Progress updated',
            progress: progressPercent,
            unit_progress: data
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
