// routes/admin.js
import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { supabase, supabaseAdmin } from '../config/database.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateUser, requireAdmin);

// ============================================
// USER MANAGEMENT
// ============================================

// Get all users (with service role)
router.get('/users', async (req, res) => {
    try {
        // Get all users from auth (requires service role)
        const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (usersError) throw usersError;
        
        // Get profiles for all users
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*');
        
        if (profilesError) throw profilesError;
        
        // Merge user data with profiles
        const usersWithProfiles = users.users.map(user => ({
            id: user.id,
            email: user.email,
            created_at: user.created_at,
            last_sign_in: user.last_sign_in_at,
            profile: profiles.find(p => p.id === user.id) || {}
        }));
        
        res.json({
            success: true,
            users: usersWithProfiles,
            total: usersWithProfiles.length
        });
        
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user by ID
router.get('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (userError) throw userError;
        
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        res.json({
            success: true,
            user: {
                ...user.user,
                profile: profile || {}
            }
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update user role
router.put('/users/:userId/role', async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        
        const validRoles = ['user', 'admin', 'instructor', 'moderator'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
            });
        }
        
        const { data, error } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                role: role,
                is_admin: role === 'admin',
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({
            success: true,
            message: `User role updated to ${role}`,
            profile: data
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete user (requires service role)
router.delete('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Delete user from auth
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        
        if (error) throw error;
        
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// COURSE MANAGEMENT
// ============================================

// Create new course
router.post('/courses', async (req, res) => {
    try {
        const {
            title, slug, subtitle, description, learning_outcomes,
            prerequisites, target_audience, price, duration_weeks,
            duration_hours, icon, level, certificate_type,
            passing_score, is_featured
        } = req.body;
        
        const { data, error } = await supabase
            .from('courses')
            .insert({
                title, slug, subtitle, description,
                learning_outcomes, prerequisites, target_audience,
                price, duration_weeks, duration_hours, icon,
                level, certificate_type, passing_score,
                is_featured, is_published: false,
                created_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({
            success: true,
            message: 'Course created successfully',
            course: data
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update course
router.put('/courses/:courseId', async (req, res) => {
    try {
        const { courseId } = req.params;
        const updates = req.body;
        
        const { data, error } = await supabase
            .from('courses')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', courseId)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({
            success: true,
            message: 'Course updated successfully',
            course: data
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Publish/unpublish course
router.patch('/courses/:courseId/publish', async (req, res) => {
    try {
        const { courseId } = req.params;
        const { is_published } = req.body;
        
        const { data, error } = await supabase
            .from('courses')
            .update({ is_published, updated_at: new Date().toISOString() })
            .eq('id', courseId)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({
            success: true,
            message: is_published ? 'Course published' : 'Course unpublished',
            course: data
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete course
router.delete('/courses/:courseId', async (req, res) => {
    try {
        const { courseId } = req.params;
        
        const { error } = await supabase
            .from('courses')
            .delete()
            .eq('id', courseId);
        
        if (error) throw error;
        
        res.json({
            success: true,
            message: 'Course deleted successfully'
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// UNIT MANAGEMENT
// ============================================

// Add unit to course
router.post('/courses/:courseId/units', async (req, res) => {
    try {
        const { courseId } = req.params;
        const { unit_number, title, subtitle, description, learning_objectives, content, key_takeaways, estimated_minutes } = req.body;
        
        const { data, error } = await supabase
            .from('units')
            .insert({
                course_id: courseId,
                unit_number,
                title,
                subtitle,
                description,
                learning_objectives,
                content,
                key_takeaways,
                estimated_minutes,
                is_published: false
            })
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({
            success: true,
            message: 'Unit added successfully',
            unit: data
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update unit
router.put('/units/:unitId', async (req, res) => {
    try {
        const { unitId } = req.params;
        const updates = req.body;
        
        const { data, error } = await supabase
            .from('units')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', unitId)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({
            success: true,
            message: 'Unit updated successfully',
            unit: data
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// DASHBOARD STATISTICS
// ============================================

router.get('/dashboard/stats', async (req, res) => {
    try {
        // Get counts
        const [
            { count: totalUsers },
            { count: totalCourses },
            { count: totalEnrollments },
            { count: totalRevenue },
            { count: completedEnrollments }
        ] = await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('courses').select('*', { count: 'exact', head: true }),
            supabase.from('enrollments').select('*', { count: 'exact', head: true }),
            supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
            supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'completed')
        ]);
        
        // Get recent enrollments
        const { data: recentEnrollments } = await supabase
            .from('enrollments')
            .select('*, users(email), courses(title)')
            .order('created_at', { ascending: false })
            .limit(10);
        
        // Get revenue by month
        const { data: monthlyRevenue } = await supabase
            .from('payments')
            .select('amount, created_at')
            .eq('status', 'completed');
        
        res.json({
            success: true,
            stats: {
                total_users: totalUsers || 0,
                total_courses: totalCourses || 0,
                total_enrollments: totalEnrollments || 0,
                completed_enrollments: completedEnrollments || 0,
                total_revenue: totalRevenue || 0
            },
            recent_enrollments: recentEnrollments || [],
            monthly_revenue: monthlyRevenue || []
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// ALL ENROLLMENTS (Admin view)
// ============================================

router.get('/enrollments', async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const offset = (page - 1) * limit;
        
        let query = supabase
            .from('enrollments')
            .select('*, users(email), courses(title, price)', { count: 'exact' });
        
        if (status) query = query.eq('status', status);
        
        const { data, error, count } = await query
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        res.json({
            success: true,
            enrollments: data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / limit)
            }
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// ALL PAYMENTS (Admin view)
// ============================================

router.get('/payments', async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const offset = (page - 1) * limit;
        
        let query = supabase
            .from('payments')
            .select('*, users(email), courses(title)', { count: 'exact' });
        
        if (status) query = query.eq('status', status);
        
        const { data, error, count } = await query
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        res.json({
            success: true,
            payments: data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / limit)
            }
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
