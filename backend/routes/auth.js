// routes/auth.js
import express from 'express';
import { supabase } from '../config/database.js';
import { validateUser } from '../middleware/validation.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Register new user
router.post('/register', validateUser, async (req, res) => {
    try {
        const { email, password, full_name, phone } = req.body;
        
        // Check if user exists
        const { data: existingUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();
        
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'User already exists'
            });
        }
        
        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name,
                    phone
                }
            }
        });
        
        if (authError) throw authError;
        
        // Create user profile
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: authData.user.id,
                email: email,
                full_name: full_name || '',
                phone: phone || '',
                role: 'user',
                created_at: new Date().toISOString()
            });
        
        if (profileError) console.error('Profile creation error:', profileError);
        
        res.json({
            success: true,
            message: 'Registration successful. Please check your email to confirm your account.',
            user: {
                id: authData.user.id,
                email: authData.user.email
            }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Registration failed'
        });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        // Get user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
        
        res.json({
            success: true,
            message: 'Login successful',
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at
            },
            user: {
                id: data.user.id,
                email: data.user.email,
                profile: profile
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({
            success: false,
            error: error.message || 'Invalid email or password'
        });
    }
});

// Logout user
router.post('/logout', authenticateUser, async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        res.json({
            success: true,
            message: 'Logout successful'
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get current user
router.get('/me', authenticateUser, async (req, res) => {
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', req.userId)
            .single();
        
        res.json({
            success: true,
            user: {
                id: req.user.id,
                email: req.user.email,
                profile: profile
            }
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'https://www.meidriveafrica.com/reset-password'
        });
        
        if (error) throw error;
        
        res.json({
            success: true,
            message: 'Password reset email sent. Please check your inbox.'
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Reset password
router.post('/reset-password', async (req, res) => {
    try {
        const { password } = req.body;
        
        const { error } = await supabase.auth.updateUser({
            password: password
        });
        
        if (error) throw error;
        
        res.json({
            success: true,
            message: 'Password updated successfully'
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
