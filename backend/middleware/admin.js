// middleware/admin.js
import { supabase } from '../config/database.js';

// Check if user has admin role
export async function requireAdmin(req, res, next) {
    try {
        if (!req.userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                message: 'Please login to access this resource'
            });
        }
        
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('role, is_admin')
            .eq('id', req.userId)
            .single();
        
        if (error || !profile) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'Admin privileges required'
            });
        }
        
        const isAdmin = profile.role === 'admin' || profile.is_admin === true;
        
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'Admin privileges required'
            });
        }
        
        req.userRole = profile.role;
        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        return res.status(500).json({
            success: false,
            error: 'Authorization failed',
            message: error.message
        });
    }
}

// Check if user has specific role
export function requireRole(...roles) {
    return async (req, res, next) => {
        try {
            if (!req.userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }
            
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', req.userId)
                .single();
            
            if (error || !profile || !roles.includes(profile.role)) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied',
                    message: `Required role: ${roles.join(' or ')}`
                });
            }
            
            next();
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    };
}

export default { requireAdmin, requireRole };
