// services/mpesaService.js
// REAL PRODUCTION - NO DEMO, NO SANDBOX

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// =====================================================
// SUPABASE CONFIGURATION - DIRECT CONNECTION
// =====================================================
const supabase = createClient(
    process.env.SUPABASE_URL || 'https://qpqkmmkrzxlhcpccefjn.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwcWttbWtyenhsaGNwY2NlZmpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTUyNTQ3MiwiZXhwIjoyMDk1MTAxNDcyfQ.8xHkQ3W5jZR2gZmDvVXq7jKyB5tQnC2ySmY9aBcfVpA'
);

// =====================================================
// REAL PRODUCTION M-PESA CREDENTIALS
// From Safaricom Developer Portal screenshot
// =====================================================
const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || 'LI2gcJZEheN8qCfXHEXV4gdYxVOBHVNv';
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || 'aGG0s8AuPJVpsZLcs';
const MPESA_PASSKEY = process.env.MPESA_PASSKEY || '7eb17a031bdfd5b4251863a1ddb72c5b9cd14f3385aa6a258c1442a0116e8277';
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE || '4095377';
const ENVIRONMENT = 'production'; // REAL PRODUCTION - LIVE MONEY

// Your actual Render.com backend URL
const BACKEND_URL = process.env.BACKEND_URL || 'https://meidriveafrica-backend.onrender.com';

// Store transactions in memory (fallback only - database is primary)
const transactionStore = new Map();

// =====================================================
// HELPER: Get M-Pesa Access Token (REAL PRODUCTION)
// =====================================================
async function getMpesaAccessToken() {
    const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
    const url = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
    
    console.log('🔑 Getting REAL PRODUCTION M-Pesa access token...');
    console.log('⚠️ This will use LIVE M-Pesa - Real money will be deducted');
    
    try {
        const response = await axios.get(url, {
            headers: { Authorization: `Basic ${auth}` }
        });
        console.log('✅ PRODUCTION access token obtained successfully');
        return response.data.access_token;
    } catch (error) {
        console.error('❌ Token error:', error.response?.data || error.message);
        throw new Error(`Failed to get token: ${error.response?.data?.errorMessage || error.message}`);
    }
}

// =====================================================
// HELPER: Format phone number to 254XXXXXXXXX
// =====================================================
function formatPhoneNumber(phone) {
    let cleaned = phone.toString().replace(/\s/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('+')) {
        cleaned = cleaned.substring(1);
    } else if (!cleaned.startsWith('254')) {
        cleaned = '254' + cleaned;
    }
    console.log(`📱 Formatted phone for PRODUCTION: ${cleaned}`);
    return cleaned;
}

// =====================================================
// HELPER: Generate password for STK push
// =====================================================
function generatePassword() {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');
    return { timestamp, password };
}

// =====================================================
// INITIATE STK PUSH (REAL PRODUCTION)
// =====================================================
export async function initiateStkPush(phoneNumber, amount, accountReference, transactionDesc, userId, courseId) {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const { timestamp, password } = generatePassword();
    const token = await getMpesaAccessToken();
    
    const stkPushRequest = {
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: MPESA_SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: `${BACKEND_URL}/api/payments/mpesa/callback`,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc.substring(0, 36)
    };
    
    console.log('📤 Sending STK Push Request to Safaricom...');
    
    const url = 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
    
    const response = await axios.post(url, stkPushRequest, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    return response.data;
}

// =====================================================
// QUERY TRANSACTION STATUS (REAL PRODUCTION)
// =====================================================
export async function queryTransactionStatus(checkoutRequestId) {
    const { timestamp, password } = generatePassword();
    const token = await getMpesaAccessToken();
    
    const queryRequest = {
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
    };
    
    const url = 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query';
    
    const response = await axios.post(url, queryRequest, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    return response.data;
}

// =====================================================
// CREATE PAYMENT RECORD IN DATABASE
// =====================================================
export async function createPaymentRecord(userId, courseId, amount, phoneNumber, checkoutRequestId) {
    const { data, error } = await supabase
        .from('transactions')
        .insert({
            user_id: userId,
            course_id: courseId,
            amount: amount,
            phone_number: phoneNumber,
            checkout_request_id: checkoutRequestId,
            status: 'pending',
            account_reference: `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            environment: 'PRODUCTION'
        })
        .select()
        .single();
    
    if (error) throw error;
    console.log(`✅ Payment record created: ${data.id}`);
    return data;
}

// =====================================================
// UPDATE PAYMENT STATUS
// =====================================================
export async function updatePaymentStatus(checkoutRequestId, status, receiptNumber = null) {
    const { data, error } = await supabase
        .from('transactions')
        .update({
            status: status,
            mpesa_receipt_number: receiptNumber,
            result_desc: status === 'completed' ? 'Payment successful' : 'Payment failed',
            updated_at: new Date().toISOString()
        })
        .eq('checkout_request_id', checkoutRequestId)
        .select()
        .single();
    
    if (error) throw error;
    console.log(`✅ Payment status updated: ${status}`);
    return data;
}

// =====================================================
// INITIATE PAYMENT (MAIN FUNCTION)
// =====================================================
export async function initiatePayment(userId, courseId, courseTitle, amount, phoneNumber) {
    try {
        const accountReference = `MEI-${courseId}-${Date.now()}`;
        const transactionDesc = `${courseTitle.substring(0, 35)}`;
        
        console.log('💰💰💰 REAL PRODUCTION PAYMENT INITIATED 💰💰💰');
        console.log('⚠️ REAL MONEY WILL BE DEDUCTED FROM CUSTOMER');
        console.log(`📱 Phone: ${phoneNumber}`);
        console.log(`💰 Amount: ${amount}`);
        console.log(`📚 Course: ${courseTitle}`);
        
        const result = await initiateStkPush(phoneNumber, amount, accountReference, transactionDesc, userId, courseId);
        
        if (result.ResponseCode === '0') {
            const paymentRecord = await createPaymentRecord(
                userId, courseId, amount, formatPhoneNumber(phoneNumber), result.CheckoutRequestID
            );
            
            transactionStore.set(result.CheckoutRequestID, {
                userId,
                courseId,
                amount,
                status: 'pending',
                createdAt: new Date().toISOString()
            });
            
            console.log('✅ STK Push initiated successfully');
            console.log(`Checkout Request ID: ${result.CheckoutRequestID}`);
            
            return {
                success: true,
                checkoutRequestID: result.CheckoutRequestID,
                merchantRequestID: result.MerchantRequestID,
                responseCode: result.ResponseCode,
                responseDescription: result.ResponseDescription,
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

// =====================================================
// CHECK PAYMENT STATUS
// =====================================================
export async function checkPaymentStatus(checkoutRequestId) {
    // First check database
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('checkout_request_id', checkoutRequestId)
        .single();
    
    if (!error && data) {
        return data;
    }
    
    // Fallback to memory store
    const transaction = transactionStore.get(checkoutRequestId);
    if (transaction) return transaction;
    
    throw new Error('Transaction not found');
}

// =====================================================
// PROCESS M-PESA CALLBACK
// =====================================================
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
    
    if (status === 'completed') {
        console.log('✅✅✅ PRODUCTION PAYMENT SUCCESSFUL! ✅✅✅');
        console.log(`Receipt Number: ${mpesaReceiptNumber}`);
        console.log(`Amount Paid: ${amount}`);
        console.log(`Checkout ID: ${CheckoutRequestID}`);
    } else {
        console.log('❌ PRODUCTION PAYMENT FAILED:', ResultDesc);
    }
    
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
        const { data: payment, error } = await supabase
            .from('transactions')
            .select('user_id, course_id')
            .eq('checkout_request_id', CheckoutRequestID)
            .single();
        
        if (payment && !error) {
            await createEnrollment(payment.user_id, payment.course_id, mpesaReceiptNumber);
        }
    }
    
    return { success: true, status, receiptNumber: mpesaReceiptNumber };
}

// =====================================================
// CREATE ENROLLMENT AFTER SUCCESSFUL PAYMENT
// =====================================================
async function createEnrollment(userId, courseId, mpesaCode) {
    const { error } = await supabase
        .from('enrollments')
        .insert({
            user_id: userId,
            course_id: courseId,
            payment_status: 'completed',
            payment_method: 'mpesa',
            mpesa_code: mpesaCode,
            enrolled_at: new Date().toISOString()
        });
    
    if (error) throw error;
    console.log(`✅ Enrollment created for user ${userId}, course ${courseId}`);
    return true;
}

// =====================================================
// GET USER PAYMENT HISTORY
// =====================================================
export async function getUserPaymentHistory(userId) {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
}

// =====================================================
// EXPORTS
// =====================================================
export default {
    initiatePayment,
    checkPaymentStatus,
    processCallback,
    createPaymentRecord,
    updatePaymentStatus,
    getUserPaymentHistory,
    initiateStkPush,
    queryTransactionStatus
};
