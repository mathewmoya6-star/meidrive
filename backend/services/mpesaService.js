// services/mpesaService.js
import { supabase } from '../config/database.js';
import { initiateStkPush, queryTransactionStatus } from '../config/mpesa.js';

// Store transactions in memory (use database in production)
const transactionStore = new Map();

// Create a payment record
export async function createPaymentRecord(userId, courseId, amount, phoneNumber, checkoutRequestId) {
    const { data, error } = await supabase
        .from('payments')
        .insert({
            user_id: userId,
            course_id: courseId,
            amount: amount,
            phone_number: phoneNumber,
            checkout_request_id: checkoutRequestId,
            status: 'pending',
            payment_number: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
        })
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// Update payment status
export async function updatePaymentStatus(checkoutRequestId, status, receiptNumber = null) {
    const { data, error } = await supabase
        .from('payments')
        .update({
            status: status,
            mpesa_receipt: receiptNumber,
            payment_date: status === 'completed' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
        })
        .eq('checkout_request_id', checkoutRequestId)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// Initiate M-Pesa payment
export async function initiatePayment(userId, courseId, courseTitle, amount, phoneNumber) {
    try {
        const accountReference = `CRS-${courseId}-${Date.now()}`;
        const transactionDesc = `${courseTitle.substring(0, 35)}`;
        
        const result = await initiateStkPush(phoneNumber, amount, accountReference, transactionDesc, userId, courseId);
        
        if (result.ResponseCode === '0') {
            const paymentRecord = await createPaymentRecord(
                userId, courseId, amount, phoneNumber, result.CheckoutRequestID
            );
            
            transactionStore.set(result.CheckoutRequestID, {
                userId,
                courseId,
                amount,
                status: 'pending',
                createdAt: new Date().toISOString()
            });
            
            return {
                success: true,
                checkoutRequestID: result.CheckoutRequestID,
                merchantRequestID: result.MerchantRequestID,
                paymentId: paymentRecord.id
            };
        } else {
            throw new Error(result.ResponseDescription || 'Payment initiation failed');
        }
    } catch (error) {
        console.error('Initiate payment error:', error);
        throw error;
    }
}

// Check payment status
export async function checkPaymentStatus(checkoutRequestId) {
    const transaction = transactionStore.get(checkoutRequestId);
    
    if (!transaction) {
        // Check database
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('checkout_request_id', checkoutRequestId)
            .single();
        
        if (error) throw new Error('Transaction not found');
        return data;
    }
    
    return transaction;
}

// Process M-Pesa callback
export async function processCallback(callbackData) {
    const { Body } = callbackData;
    
    if (!Body || !Body.stkCallback) {
        throw new Error('Invalid callback structure');
    }
    
    const { stkCallback } = Body;
    const {
        CheckoutRequestID,
        ResultCode,
        ResultDesc,
        CallbackMetadata
    } = stkCallback;
    
    let mpesaReceiptNumber = null;
    let amount = 0;
    
    if (ResultCode === 0 && CallbackMetadata?.Item) {
        for (const item of CallbackMetadata.Item) {
            if (item.Name === 'MpesaReceiptNumber') mpesaReceiptNumber = item.Value;
            if (item.Name === 'Amount') amount = item.Value;
        }
    }
    
    const status = ResultCode === 0 ? 'completed' : 'failed';
    
    // Update payment in database
    await updatePaymentStatus(CheckoutRequestID, status, mpesaReceiptNumber);
    
    // Update transaction store
    transactionStore.set(CheckoutRequestID, {
        ...transactionStore.get(CheckoutRequestID),
        status,
        mpesaReceiptNumber,
        amountPaid: amount,
        completedAt: new Date().toISOString()
    });
    
    // If payment successful, create enrollment
    if (status === 'completed') {
        const payment = await supabase
            .from('payments')
            .select('user_id, course_id')
            .eq('checkout_request_id', CheckoutRequestID)
            .single();
        
        if (payment.data) {
            await createEnrollment(payment.data.user_id, payment.data.course_id);
        }
    }
    
    return { success: true, status, receiptNumber: mpesaReceiptNumber };
}

// Create enrollment after successful payment
async function createEnrollment(userId, courseId) {
    const { error } = await supabase
        .from('enrollments')
        .insert({
            user_id: userId,
            course_id: courseId,
            progress: 0,
            status: 'active',
            enrolled_at: new Date().toISOString()
        });
    
    if (error) throw error;
    return true;
}

export default {
    initiatePayment,
    checkPaymentStatus,
    processCallback,
    createPaymentRecord,
    updatePaymentStatus
};
