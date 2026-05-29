// config/mpesa.js
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

export const MPESA_CONFIG = {
    consumerKey: process.env.MPESA_CONSUMER_KEY,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET,
    passkey: process.env.MPESA_PASSKEY,
    shortCode: process.env.MPESA_SHORTCODE,
    environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
    callbackUrl: process.env.MPESA_CALLBACK_URL
};

const API_URLS = {
    sandbox: 'https://sandbox.safaricom.co.ke',
    production: 'https://api.safaricom.co.ke'
};

const baseUrl = API_URLS[MPESA_CONFIG.environment] || API_URLS.sandbox;

// Get OAuth Token
export async function getMpesaToken() {
    const auth = Buffer.from(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`).toString('base64');
    
    try {
        const response = await axios.get(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.access_token;
    } catch (error) {
        console.error('M-Pesa Token Error:', error.response?.data || error.message);
        throw new Error('Failed to get M-Pesa access token');
    }
}

// Generate password for STK push
export function generatePassword(timestamp) {
    const str = `${MPESA_CONFIG.shortCode}${MPESA_CONFIG.passkey}${timestamp}`;
    return Buffer.from(str).toString('base64');
}

// Format phone number to international format
export function formatPhoneNumber(phone) {
    let formatted = phone.toString().replace(/\D/g, '');
    if (formatted.startsWith('0')) {
        formatted = '254' + formatted.slice(1);
    } else if (formatted.startsWith('+')) {
        formatted = formatted.slice(1);
    }
    return formatted;
}

// Initiate STK Push
export async function initiateStkPush(phoneNumber, amount, accountReference, transactionDesc, userId, courseId) {
    const token = await getMpesaToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = generatePassword(timestamp);
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    const stkPushRequest = {
        BusinessShortCode: MPESA_CONFIG.shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: MPESA_CONFIG.shortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: MPESA_CONFIG.callbackUrl,
        AccountReference: accountReference || `COURSE_${courseId}_${Date.now()}`,
        TransactionDesc: transactionDesc?.substring(0, 36) || 'Course Enrollment'
    };
    
    const response = await axios.post(`${baseUrl}/mpesa/stkpush/v1/processrequest`, stkPushRequest, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    return response.data;
}

// Query transaction status
export async function queryTransactionStatus(checkoutRequestId) {
    const token = await getMpesaToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = generatePassword(timestamp);
    
    const queryRequest = {
        BusinessShortCode: MPESA_CONFIG.shortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
    };
    
    const response = await axios.post(`${baseUrl}/mpesa/stkpushquery/v1/query`, queryRequest, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    return response.data;
}

export default {
    MPESA_CONFIG,
    getMpesaToken,
    generatePassword,
    formatPhoneNumber,
    initiateStkPush,
    queryTransactionStatus
};
