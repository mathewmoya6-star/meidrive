import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    // GET user enrollments
    if (req.method === 'GET') {
        try {
            const { data, error } = await supabase
                .from('enrollments')
                .select('*, courses(id, title, description, type, price, duration, level)')
                .eq('user_id', user.id)
                .order('enrolled_at', { ascending: false });
            
            if (error) throw error;
            return res.status(200).json({ success: true, enrollments: data });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    
    // POST - Create enrollment
    if (req.method === 'POST') {
        const { course_id } = req.body;
        
        if (!course_id) {
            return res.status(400).json({ error: 'Course ID required' });
        }
        
        // Check if already enrolled
        const { data: existing } = await supabase
            .from('enrollments')
            .select('id')
            .eq('user_id', user.id)
            .eq('course_id', course_id)
            .single();
        
        if (existing) {
            return res.status(400).json({ error: 'Already enrolled in this course' });
        }
        
        // Get course type
        const { data: course } = await supabase
            .from('courses')
            .select('type, price')
            .eq('id', course_id)
            .single();
        
        // For free courses, enroll immediately
        if (course?.type === 'free') {
            const { data, error } = await supabase
                .from('enrollments')
                .insert([{
                    user_id: user.id,
                    course_id: course_id,
                    progress: 0,
                    status: 'active',
                    enrolled_at: new Date()
                }])
                .select();
            
            if (error) return res.status(500).json({ error: error.message });
            return res.status(201).json({ success: true, enrollment: data[0] });
        }
        
        // For premium courses, require payment
        return res.status(402).json({ error: 'Payment required for premium course', requiresPayment: true, amount: course?.price });
    }
    
    // PUT - Update progress
    if (req.method === 'PUT') {
        const { enrollment_id, progress } = req.body;
        
        if (!enrollment_id) {
            return res.status(400).json({ error: 'Enrollment ID required' });
        }
        
        const { data, error } = await supabase
            .from('enrollments')
            .update({ progress, updated_at: new Date() })
            .eq('id', enrollment_id)
            .eq('user_id', user.id)
            .select();
        
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, enrollment: data[0] });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}
