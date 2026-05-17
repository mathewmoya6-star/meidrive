import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// Validation functions
function validateEmail(email) {
    const re = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
    return re.test(String(email).toLowerCase());
}

function validatePassword(password) {
    return password && password.length >= 6;
}

function validateFullName(name) {
    return name && name.trim().length >= 2;
}

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    const { action } = req.query;
    
    try {
        // REGISTER
        if (action === 'register') {
            const { email, password, fullName } = req.body;
            
            if (!validateEmail(email)) {
                return res.status(400).json({ error: 'Invalid email format' });
            }
            if (!validatePassword(password)) {
                return res.status(400).json({ error: 'Password must be at least 6 characters' });
            }
            if (!validateFullName(fullName)) {
                return res.status(400).json({ error: 'Full name is required' });
            }
            
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName } }
            });
            
            if (error) throw error;
            
            if (data.user) {
                await supabase.from('profiles').insert({
                    id: data.user.id,
                    email,
                    full_name: fullName,
                    role: 'learner'
                });
            }
            
            return res.status(201).json({ 
                success: true, 
                message: 'Registration successful. Please check your email.' 
            });
        }
        
        // LOGIN
        if (action === 'login') {
            const { email, password } = req.body;
            
            if (!validateEmail(email)) {
                return res.status(400).json({ error: 'Invalid email format' });
            }
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, full_name')
                .eq('id', data.user.id)
                .single();
            
            return res.status(200).json({
                success: true,
                session: data.session,
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    role: profile?.role || 'learner',
                    fullName: profile?.full_name
                }
            });
        }
        
        // LOGOUT
        if (action === 'logout') {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return res.status(200).json({ success: true });
        }
        
        // GET USER
        if (action === 'user') {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            
            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (error || !user) {
                return res.status(401).json({ error: 'Invalid session' });
            }
            
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, full_name')
                .eq('id', user.id)
                .single();
            
            return res.status(200).json({
                user: {
                    id: user.id,
                    email: user.email,
                    role: profile?.role || 'learner',
                    fullName: profile?.full_name
                }
            });
        }
        
        return res.status(404).json({ error: 'Action not found' });
        
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(500).json({ error: error.message });
    }
}
