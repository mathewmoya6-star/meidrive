import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { Body } = req.body;
    
    if (Body?.stkCallback?.ResultCode === 0) {
        const { CheckoutRequestID, Amount, MpesaReceiptNumber } = Body.stkCallback;
        
        // Find payment by checkout ID
        const { data: payment } = await supabase
            .from('payments')
            .select('*')
            .eq('mpesa_receipt', CheckoutRequestID)
            .single();
        
        if (payment) {
            // Update payment status
            await supabase
                .from('payments')
                .update({
                    status: 'completed',
                    mpesa_receipt: MpesaReceiptNumber,
                    completed_at: new Date().toISOString()
                })
                .eq('id', payment.id);
            
            // Create enrollment
            await supabase
                .from('enrollments')
                .insert({
                    user_id: payment.user_id,
                    course_id: payment.course_id,
                    progress: 0,
                    status: 'active',
                    enrolled_at: new Date().toISOString()
                });
        }
    }
    
    res.json({ ResultCode: 0, ResultDesc: 'Success' });
}
