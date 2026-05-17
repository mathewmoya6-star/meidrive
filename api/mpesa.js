import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { courseId, userId, phoneNumber } = req.body;
    
    // Validate input
    if (!courseId || !userId || !phoneNumber) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate phone number (Kenyan format)
    const phoneRegex = /^(254|0)[7-9][0-9]{8}$/;
    if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({ error: 'Invalid phone number format' });
    }
    
    try {
        // Get course price
        const { data: course } = await supabase
            .from('courses')
            .select('price, title')
            .eq('id', courseId)
            .single();
        
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }
        
        // Format phone number for M-Pesa (254XXXXXXXXX)
        const formattedPhone = phoneNumber.startsWith('0') 
            ? '254' + phoneNumber.slice(1) 
            : phoneNumber;
        
        // Create payment record
        const { data: payment } = await supabase
            .from('payments')
            .insert({
                user_id: userId,
                course_id: courseId,
                amount: course.price,
                status: 'pending'
            })
            .select()
            .single();
        
        // Initiate M-Pesa STK Push (mock for now - integrate with actual API)
        // In production, call Safaricom API here
        
        return res.status(200).json({
            success: true,
            paymentId: payment.id,
            message: 'STK Push sent to your phone'
        });
        
    } catch (error) {
        console.error('Payment error:', error);
        return res.status(500).json({ error: 'Payment processing failed' });
    }
}
