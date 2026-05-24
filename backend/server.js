// server.js - REAL M-Pesa Integration with Your Credentials
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));

// ============================================
// M-PESA CONFIGURATION - YOUR REAL CREDENTIALS
// ============================================
const MPESA_CONFIG = {
    consumerKey: 'LI2gcJZEheN8qCfXHEXV4gdYXvOBHVnv',
    consumerSecret: 'aGGo8AuPJVpsZLcs',
    passkey: '7eb17a031bdfd5b4251863a1ddb72c5b9cd14f3385aa6a258c1442a0116e8277',
    shortCode: '4095377',
    environment: 'production', // Using production since you have real credentials
    callbackUrl: 'https://www.meidriveafrica.com/api/mpesa/callback'
};

// Store transactions in memory (use PostgreSQL in production)
const transactions = new Map();

// ============================================
// HELPER FUNCTIONS
// ============================================

// Get OAuth Token from Safaricom
async function getMpesaToken() {
    const auth = Buffer.from(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`).toString('base64');
    
    const url = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
    
    try {
        console.log('🔑 Requesting M-Pesa access token...');
        const response = await axios.get(url, {
            headers: { 
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('✅ Access token obtained successfully');
        return response.data.access_token;
    } catch (error) {
        console.error('❌ Token error:', error.response?.data || error.message);
        throw new Error(`Failed to get access token: ${error.response?.data?.errorMessage || error.message}`);
    }
}

// Generate password for STK push
function generatePassword(shortCode, passkey, timestamp) {
    const str = `${shortCode}${passkey}${timestamp}`;
    return Buffer.from(str).toString('base64');
}

// Format phone number to international format
function formatPhoneNumber(phone) {
    let formatted = phone.toString().replace(/\D/g, '');
    if (formatted.startsWith('0')) {
        formatted = '254' + formatted.slice(1);
    } else if (formatted.startsWith('+')) {
        formatted = formatted.slice(1);
    }
    return formatted;
}

// ============================================
// REAL M-PESA STK PUSH ENDPOINT
// ============================================
app.post('/api/mpesa/stkpush', async (req, res) => {
    console.log('\n📱 ========== NEW STK PUSH REQUEST ==========');
    console.log('Request body:', req.body);
    
    try {
        const { phoneNumber, amount, accountReference, transactionDesc, userId, courseId } = req.body;
        
        // Validate inputs
        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required'
            });
        }
        
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Valid amount is required'
            });
        }
        
        // Format phone number
        const formattedPhone = formatPhoneNumber(phoneNumber);
        console.log(`📞 Phone: ${phoneNumber} -> ${formattedPhone}`);
        console.log(`💰 Amount: KES ${amount}`);
        console.log(`📚 Course: ${transactionDesc}`);
        
        if (formattedPhone.length !== 12 || !formattedPhone.startsWith('254')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number. Please use format: 0712345678 or 254712345678'
            });
        }
        
        // Get access token
        const token = await getMpesaToken();
        
        // Generate timestamp and password
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = generatePassword(MPESA_CONFIG.shortCode, MPESA_CONFIG.passkey, timestamp);
        
        console.log(`⏰ Timestamp: ${timestamp}`);
        console.log(`🔐 Password generated`);
        
        // Prepare STK push request
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
            AccountReference: accountReference || `COURSE_${courseId || Date.now()}`,
            TransactionDesc: (transactionDesc || 'Course Enrollment').substring(0, 36) // Max 36 chars
        };
        
        console.log('🚀 Sending STK push to Safaricom...');
        console.log('Request:', JSON.stringify(stkPushRequest, null, 2));
        
        // Send to Safaricom API
        const url = 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
        
        const response = await axios.post(url, stkPushRequest, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Safaricom Response:', response.data);
        
        // Store transaction for tracking
        const checkoutRequestID = response.data.CheckoutRequestID;
        transactions.set(checkoutRequestID, {
            userId,
            courseId,
            amount: Math.round(amount),
            phoneNumber: formattedPhone,
            status: 'pending',
            createdAt: new Date().toISOString(),
            merchantRequestID: response.data.MerchantRequestID,
            responseCode: response.data.ResponseCode,
            responseDescription: response.data.ResponseDescription
        });
        
        console.log(`📝 Transaction stored with ID: ${checkoutRequestID}`);
        console.log('========== STK PUSH SENT SUCCESSFULLY ==========\n');
        
        // Return success to frontend
        res.json({
            success: true,
            message: 'STK Push sent successfully. Check your phone for M-Pesa prompt.',
            checkoutRequestID: checkoutRequestID,
            responseCode: response.data.ResponseCode,
            responseDescription: response.data.ResponseDescription
        });
        
    } catch (error) {
        console.error('❌ STK Push error:', error.response?.data || error.message);
        console.error('Full error:', error);
        
        res.status(500).json({
            success: false,
            error: error.response?.data?.errorMessage || error.message || 'Payment processing failed',
            details: error.response?.data
        });
    }
});

// ============================================
// M-PESA CALLBACK ENDPOINT
// ============================================
app.post('/api/mpesa/callback', async (req, res) => {
    console.log('\n📞 ========== M-PESA CALLBACK RECEIVED ==========');
    console.log('Callback body:', JSON.stringify(req.body, null, 2));
    
    try {
        const { Body } = req.body;
        
        if (!Body || !Body.stkCallback) {
            console.log('⚠️ Invalid callback structure');
            return res.json({ ResultCode: 0, ResultDesc: 'Invalid callback' });
        }
        
        const { stkCallback } = Body;
        const {
            MerchantRequestID,
            CheckoutRequestID,
            ResultCode,
            ResultDesc,
            CallbackMetadata
        } = stkCallback;
        
        console.log(`📝 CheckoutRequestID: ${CheckoutRequestID}`);
        console.log(`📊 ResultCode: ${ResultCode}`);
        console.log(`📝 ResultDesc: ${ResultDesc}`);
        
        // Find the transaction
        const transaction = transactions.get(CheckoutRequestID);
        
        if (!transaction) {
            console.log('⚠️ Transaction not found:', CheckoutRequestID);
            return res.json({ ResultCode: 0, ResultDesc: 'Transaction recorded' });
        }
        
        // Update transaction based on result
        if (ResultCode === 0) {
            // Payment successful
            let mpesaReceiptNumber = '';
            let amount = 0;
            let transactionDate = '';
            
            if (CallbackMetadata && CallbackMetadata.Item) {
                CallbackMetadata.Item.forEach(item => {
                    if (item.Name === 'MpesaReceiptNumber') mpesaReceiptNumber = item.Value;
                    if (item.Name === 'Amount') amount = item.Value;
                    if (item.Name === 'TransactionDate') transactionDate = item.Value;
                });
            }
            
            transaction.status = 'completed';
            transaction.resultCode = ResultCode;
            transaction.resultDesc = ResultDesc;
            transaction.mpesaReceiptNumber = mpesaReceiptNumber;
            transaction.amountPaid = amount;
            transaction.transactionDate = transactionDate;
            transaction.completedAt = new Date().toISOString();
            
            console.log(`✅✅✅ PAYMENT SUCCESSFUL! ✅✅✅`);
            console.log(`🧾 Receipt Number: ${mpesaReceiptNumber}`);
            console.log(`💰 Amount Paid: KES ${amount}`);
            console.log(`👤 User ID: ${transaction.userId}`);
            console.log(`📚 Course ID: ${transaction.courseId}`);
            
            // TODO: Create enrollment in Supabase
            // You would implement this based on your database structure
            // Example:
            /*
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            
            const { error } = await supabase
                .from('enrollments')
                .insert([{
                    user_id: transaction.userId,
                    course_id: transaction.courseId,
                    progress: 0,
                    status: 'active',
                    enrolled_at: new Date().toISOString(),
                    payment_receipt: mpesaReceiptNumber
                }]);
            
            if (error) {
                console.error('Failed to create enrollment:', error);
            } else {
                console.log('✅ Enrollment created successfully');
            }
            */
            
        } else {
            // Payment failed or cancelled
            transaction.status = 'failed';
            transaction.resultCode = ResultCode;
            transaction.resultDesc = ResultDesc;
            transaction.failedAt = new Date().toISOString();
            
            console.log(`❌ PAYMENT FAILED: ${ResultDesc}`);
        }
        
        transactions.set(CheckoutRequestID, transaction);
        console.log('✅ Transaction updated');
        console.log('========== CALLBACK PROCESSED ==========\n');
        
        // Respond to Safaricom
        res.json({
            ResultCode: 0,
            ResultDesc: 'Success'
        });
        
    } catch (error) {
        console.error('❌ Callback error:', error);
        res.json({ ResultCode: 0, ResultDesc: 'Error processing callback' });
    }
});

// ============================================
// CHECK PAYMENT STATUS
// ============================================
app.post('/api/mpesa/status', async (req, res) => {
    const { checkoutRequestID } = req.body;
    
    console.log(`🔍 Checking status for: ${checkoutRequestID}`);
    
    const transaction = transactions.get(checkoutRequestID);
    
    if (transaction) {
        res.json({
            success: true,
            status: transaction.status,
            resultCode: transaction.resultCode,
            resultDesc: transaction.resultDesc,
            mpesaReceiptNumber: transaction.mpesaReceiptNumber,
            amount: transaction.amount,
            completedAt: transaction.completedAt
        });
    } else {
        res.json({
            success: false,
            status: 'unknown',
            resultDesc: 'Transaction not found'
        });
    }
});

// ============================================
// GET USER TRANSACTIONS
// ============================================
app.get('/api/mpesa/transactions', async (req, res) => {
    const userTransactions = Array.from(transactions.values());
    res.json({
        success: true,
        transactions: userTransactions
    });
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'M-Pesa Integration Server',
        environment: MPESA_CONFIG.environment,
        shortCode: MPESA_CONFIG.shortCode,
        features: {
            mpesa: true,
            stkPush: true,
            timestamp: new Date().toISOString()
        }
    });
});

// ============================================
// SERVE HTML FILES
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/course.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'course.html'));
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║     🚀 MEI DRIVE AFRICA - LIVE M-PESA INTEGRATION             ║
╠═══════════════════════════════════════════════════════════════╣
║  Status: RUNNING                                              ║
║  Port: ${PORT}                                                   ║
║  Environment: ${MPESA_CONFIG.environment.toUpperCase()}                         ║
║  Shortcode: ${MPESA_CONFIG.shortCode}                            ║
║                                                                ║
║  Endpoints:                                                    ║
║  • Health:    http://localhost:${PORT}/api/health                ║
║  • STK Push:  POST http://localhost:${PORT}/api/mpesa/stkpush    ║
║  • Callback:  POST http://localhost:${PORT}/api/mpesa/callback   ║
║  • Status:    POST http://localhost:${PORT}/api/mpesa/status     ║
║  • History:   GET  http://localhost:${PORT}/api/mpesa/transactions ║
║                                                                ║
║  ⚠️  IMPORTANT: Configure your callback URL:                   ║
║  ${MPESA_CONFIG.callbackUrl}                    ║
║                                                                ║
║  💡 For local testing, use ngrok:                             ║
║  ngrok http ${PORT}                                              ║
╚═══════════════════════════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});
