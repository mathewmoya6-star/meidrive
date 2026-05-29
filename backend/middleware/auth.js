// middleware/auth.js
import { supabase } from '../config/database.js';

// Verify JWT token from Supabase
export async function authenticateUser(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No token provided',
                message: 'Please provide a valid authentication token'
            });
        }
        
        const token = authHeader.split(' ')[1];
        
        // Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token',
                message: 'Please login again'
            });
        }
        
        req.user = user;
        req.userId = user.id;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            error: 'Authentication failed',
            message: error.message
        });
    }
}

// Optional auth (doesn't fail if no token)
export async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const { data: { user }, error } = await supabase.auth.getUser(token);
            
            if (!error && user) {
                req.user = user;
                req.userId = user.id;
            }
        }
        
        next();
    } catch (error) {
        next();
    }
}

export default { authenticateUser, optionalAuth };
