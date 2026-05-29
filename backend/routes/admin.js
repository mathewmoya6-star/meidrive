// routes/admin.js
// REAL PRODUCTION - MEI DRIVE AFRICA
// ADMIN ROUTES - Requires admin role

import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase with SERVICE ROLE (for admin operations)
const supabase = createClient(
    process.env.SUPABASE_URL || 'https://qpqkmmkrzxlhcpccefjn.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwcWttbWtyenhsaGNwY2NlZmpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTUyNTQ3MiwiZXhwIjoyMDk1MTAxNDcyfQ.8xHkQ3W5jZR2gZmDvVXq7jKyB5tQnC2ySmY9aBcfVpA'
);

// Initialize Supabase Anon for regular operations
const supabaseAnon = createClient(
    process.env.SUPABASE_URL || 'https://qpqkmmkrzxlhcpccefjn.supabase.co',
    process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwcWttbWtyenhsaGNwY2NlZmpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MjU0NzIsImV4cCI6MjA5NTEwMTQ3Mn0.Vw1hexN3NKoF_y9VFBFs_NUhJgFNNMwuyzDjImUcM6s'
);

// Helper: Verify user and admin role
async function verifyAdmin(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                error: 'Authorization header required'
            });
        }
        
        const token = authHeader.split(' ')[1];
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        
        if (userError || !user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        
        // Check if user has admin role
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role, is_admin')
            .eq('id', user.id)
            .maybeSingle();
        
        const isAdmin = profile?.role === 'admin' || profile?.is_admin === true;
        
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Admin privileges required.'
            });
        }
        
        req.user = user;
        req.userId = user.id;
        req.userRole = profile?.role;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Authentication failed'
        });
    }
}

// All admin routes require authentication and admin role
router.use(verifyAdmin);

// ============================================
// DASHBOARD STATISTICS
// ============================================
router.get('/dashboard/stats', async (req, res) => {
    try {
        // Get counts
        const { count: totalUsers, error: usersError } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true });
        
        const { count: totalCourses, error: coursesError } = await supabase
            .from('courses')
            .select('*', { count: 'exact', head: true });
        
        const { count: totalEnrollments, error: enrollError } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true });
        
        const { count: completedEnrollments, error: completedError } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'completed');
        
        // Get total revenue from transactions
        const { data: transactions, error: revenueError } = await supabase
            .from('transactions')
            .select('amount')
            .eq('status', 'completed');
        
        const totalRevenue = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
        
        // Get recent enrollments with user and course info
        const { data: recentEnrollments, error: recentError } = await supabase
            .from('enrollments')
            .select(`
                id,
                enrolled_at,
                payment_status,
                user_id,
                course_id
            `)
            .order('enrolled_at', { ascending: false })
            .limit(10);
        
        // Get monthly revenue (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const { data: monthlyTransactions, error: monthlyError } = await supabase
            .from('transactions')
            .select('amount, created_at')
            .eq('status', 'completed')
            .gte('created_at', sixMonthsAgo.toISOString())
            .order('created_at', { ascending: true });
        
        res.json({
            success: true,
            stats: {
                total_users: totalUsers || 0,
                total_courses: totalCourses || 0,
                total_enrollments: totalEnrollments || 0,
                completed_enrollments: completedEnrollments || 0,
                total_revenue: totalRevenue,
                completion_rate: totalEnrollments ? Math.round((completedEnrollments || 0) / totalEnrollments * 100) : 0
            },
            recent_enrollments: recentEnrollments || [],
            monthly_revenue: monthlyTransactions || []
        });
        
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// USER MANAGEMENT
// ============================================

// Get all users
router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let query = supabase
            .from('user_profiles')
            .select('*', { count: 'exact' });
        
        if (search) {
            query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
        }
        
        const { data: profiles, error, count } = await query
            .range(offset, offset + parseInt(limit) - 1)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        res.json({
            success: true,
            users: profiles,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / limit)
            }
        });
        
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get user by ID
router.get('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        
        // Get user enrollments
        const { data: enrollments } = await supabase
            .from('enrollments')
            .select('*, courses:course_id(name, price)')
            .eq('user_id', userId);
        
        res.json({
            success: true,
            user: {
                ...profile,
                enrollments: enrollments || [],
                total_enrollments: enrollments?.length || 0
            }
        });
        
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
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
            .from('user_profiles')
            .update({
                role: role,
                is_admin: role === 'admin',
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({
            success: true,
            message: `User role updated to ${role}`,
            user: data
        });
        
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// COURSE MANAGEMENT
// ============================================

// Get all courses (admin view)
router.get('/courses', async (req, res) => {
    try {
        const { page = 1, limit = 20, published } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let query = supabase.from('courses').select('*', { count: 'exact' });
        
        if (published !== undefined) {
            query = query.eq('is_published', published === 'true');
        }
        
        const { data: courses, error, count } = await query
            .range(offset, offset + parseInt(limit) - 1)
            .order('id', { ascending: true });
        
        if (error) throw error;
        
        res.json({
            success: true,
            courses: courses,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / limit)
            }
        });
        
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Create new course
router.post('/courses', async (req, res) => {
    try {
        const {
            name, description, price, icon, duration, units, modules
        } = req.body;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Course name is required'
            });
        }
        
        const { data, error } = await supabase
            .from('courses')
            .insert({
                name,
                description: description || '',
                price: price || 0,
                icon: icon || 'fa-book',
                duration: duration || 'Flexible',
                units: units || 0,
                modules: modules || [],
                is_published: false,
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
        console.error('Create course error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
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
            .eq('id', parseInt(courseId))
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({
            success: true,
            message: 'Course updated successfully',
            course: data
        });
        
    } catch (error) {
        console.error('Update course error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Publish/unpublish course
router.patch('/courses/:courseId/publish', async (req, res) => {
    try {
        const { courseId } = req.params;
        const { is_published } = req.body;
        
        const { data, error } = await supabase
            .from('courses')
            .update({ 
                is_published: is_published,
                updated_at: new Date().toISOString()
            })
            .eq('id', parseInt(courseId))
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({
            success: true,
            message: is_published ? 'Course published' : 'Course unpublished',
            course: data
        });
        
    } catch (error) {
        console.error('Publish course error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Delete course
router.delete('/courses/:courseId', async (req, res) => {
    try {
        const { courseId } = req.params;
        
        // First delete enrollments
        await supabase
            .from('enrollments')
            .delete()
            .eq('course_id', parseInt(courseId));
        
        // Then delete course
        const { error } = await supabase
            .from('courses')
            .delete()
            .eq('id', parseInt(courseId));
        
        if (error) throw error;
        
        res.json({
            success: true,
            message: 'Course deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// ENROLLMENT MANAGEMENT (Admin view)
// ============================================

router.get('/enrollments', async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let query = supabase
            .from('enrollments')
            .select('*', { count: 'exact' });
        
        if (status) query = query.eq('status', status);
        
        const { data, error, count } = await query
            .range(offset, offset + parseInt(limit) - 1)
            .order('enrolled_at', { ascending: false });
        
        if (error) throw error;
        
        // Get user and course info for each enrollment
        const enrollmentsWithDetails = await Promise.all(
            (data || []).map(async (enrollment) => {
                const [userRes, courseRes] = await Promise.all([
                    supabase.from('user_profiles').select('full_name, email').eq('id', enrollment.user_id).single(),
                    supabase.from('courses').select('name, price').eq('id', enrollment.course_id).single()
                ]);
                
                return {
                    ...enrollment,
                    user: userRes.data || {},
                    course: courseRes.data || {}
                };
            })
        );
        
        res.json({
            success: true,
            enrollments: enrollmentsWithDetails,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / limit)
            }
        });
        
    } catch (error) {
        console.error('Get enrollments error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// TRANSACTION MANAGEMENT (Admin view)
// ============================================

router.get('/transactions', async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let query = supabase
            .from('transactions')
            .select('*', { count: 'exact' });
        
        if (status) query = query.eq('status', status);
        
        const { data, error, count } = await query
            .range(offset, offset + parseInt(limit) - 1)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        res.json({
            success: true,
            transactions: data || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / limit)
            }
        });
        
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
