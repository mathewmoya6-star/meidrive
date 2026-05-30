import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();

// Use Render.com PORT or default to 10000
const PORT = process.env.PORT || 10000;

// CORRECT BACKEND URL - Using your live API URL
const BACKEND_URL = process.env.BACKEND_URL || 'https://mei-drive-api.onrender.com';

// M-Pesa Credentials - PRODUCTION (REAL MONEY)
const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || 'LI2gcJZEheN8qCfXHEXV4gdYXvOBHVnv';
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || 'aGGo8AuPJVpsZLcs';
const MPESA_PASSKEY = process.env.MPESA_PASSKEY || '7eb17a031bdfd5b4251863a1ddb72c5b9cd14f3385aa6a258c1442a0116e8277';
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE || '4095377';
const MPESA_CALLBACK_URL = process.env.MPESA_CALLBACK_URL || `${BACKEND_URL}/api/payments/mpesa/callback`;

// CORS configuration
app.use(cors({
    origin: '*', // Allow all origins for testing
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// HELPER FUNCTIONS
// ============================================

function getTimestamp() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

async function getMpesaAccessToken() {
    const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
    try {
        const response = await axios.get(
            'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
            {
                headers: {
                    Authorization: `Basic ${auth}`
                },
                timeout: 30000
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error('Error getting M-Pesa token:', error.response?.data || error.message);
        throw error;
    }
}

// ============================================
// HEALTH CHECK ENDPOINTS
// ============================================

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: 'production',
        api_url: BACKEND_URL
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'OK',
        message: 'MEI DRIVE AFRICA API is running - PRODUCTION MODE',
        environment: 'PRODUCTION',
        mpesa: 'LIVE - REAL MONEY',
        paybill: MPESA_SHORTCODE,
        backend_url: BACKEND_URL,
        port: PORT,
        timestamp: new Date().toISOString(),
        endpoints: {
            health: 'GET /api/health',
            mpesaTest: 'GET /api/payments/mpesa/test',
            mpesaInitiate: 'POST /api/payments/mpesa/initiate',
            mpesaStatus: 'POST /api/payments/mpesa/status',
            mpesaCallback: 'POST /api/payments/mpesa/callback'
        },
        warning: '⚠️ REAL MONEY - Production mode active'
    });
});

app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'Backend is working in PRODUCTION mode!',
        environment: 'PRODUCTION',
        mpesa: 'LIVE - Real transactions will deduct money',
        paybill: MPESA_SHORTCODE,
        backend_url: BACKEND_URL,
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'MEI DRIVE AFRICA API',
        version: '2.0.0',
        status: 'running',
        environment: 'production',
        paybill: MPESA_SHORTCODE,
        endpoints: '/api/health, /api/payments/mpesa/test'
    });
});

// ============================================
// M-PESA PAYMENT ROUTES
// ============================================

// Test M-Pesa connection
app.get('/api/payments/mpesa/test', async (req, res) => {
    try {
        const token = await getMpesaAccessToken();
        res.json({
            success: true,
            message: 'M-Pesa API connection successful',
            mode: 'PRODUCTION - REAL MONEY',
            paybill: MPESA_SHORTCODE,
            token_preview: token.substring(0, 20) + '...',
            warning: '⚠️ Real money will be deducted from customers'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.response?.data,
            message: 'M-Pesa connection failed. Check your credentials.'
        });
    }
});

// Initiate STK Push (REAL MONEY)
app.post('/api/payments/mpesa/initiate', async (req, res) => {
    try {
        const { phoneNumber, amount, courseId, userId, email, accountReference, transactionDesc } = req.body;

        console.log('===== STK PUSH REQUEST RECEIVED =====');
        console.log('Phone:', phoneNumber);
        console.log('Amount:', amount);
        console.log('Course ID:', courseId);
        console.log('User ID:', userId);

        if (!phoneNumber || !amount || amount < 1) {
            return res.status(400).json({
                success: false,
                error: 'Valid phone number and amount (min 1 KES) required'
            });
        }

        // Format phone number (remove 0 or +254)
        let formattedPhone = phoneNumber.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.slice(1);
        }
        if (!formattedPhone.startsWith('254')) {
            formattedPhone = '254' + formattedPhone;
        }

        console.log(`💰 Initiating REAL M-Pesa payment:`);
        console.log(`   Phone: ${formattedPhone}`);
        console.log(`   Amount: KES ${amount}`);
        console.log(`   Course: ${courseId}`);
        console.log(`   ⚠️ REAL MONEY WILL BE DEDUCTED!`);

        // Get Access Token
        const accessToken = await getMpesaAccessToken();
        console.log('✅ Access token obtained');

        const timestamp = getTimestamp();
        const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');

        const stkRequestBody = {
            BusinessShortCode: MPESA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.round(amount),
            PartyA: formattedPhone,
            PartyB: MPESA_SHORTCODE,
            PhoneNumber: formattedPhone,
            CallBackURL: MPESA_CALLBACK_URL,
            AccountReference: accountReference || `COURSE_${courseId}`,
            TransactionDesc: transactionDesc || `MEI DRIVE Course - ${courseId}`
        };

        console.log('📤 Sending STK Push request to Safaricom...');
        
        const response = await axios.post(
            'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            stkRequestBody,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        console.log('✅ STK Push sent successfully:', response.data.CheckoutRequestID);

        res.json({
            success: true,
            checkoutRequestID: response.data.CheckoutRequestID,
            message: 'STK push sent. Check your phone for M-Pesa prompt.',
            warning: '⚠️ Real money will be deducted from your M-Pesa account'
        });
        
    } catch (error) {
        console.error('❌ STK Push Error Details:');
        console.error('Error message:', error.message);
        console.error('Response data:', error.response?.data);
        console.error('Status code:', error.response?.status);
        
        // Send detailed error to client
        res.status(500).json({
            success: false,
            error: error.response?.data?.errorMessage || error.message,
            details: error.response?.data,
            message: 'Payment initiation failed. Please try again or use Paybill method.'
        });
    }
});

// Check payment status
app.post('/api/payments/mpesa/status', async (req, res) => {
    try {
        const { checkoutRequestID } = req.body;

        if (!checkoutRequestID) {
            return res.status(400).json({
                success: false,
                error: 'CheckoutRequestID required'
            });
        }

        console.log(`🔍 Checking payment status for: ${checkoutRequestID}`);

        const accessToken = await getMpesaAccessToken();
        const timestamp = getTimestamp();
        const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');

        const response = await axios.post(
            'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query',
            {
                BusinessShortCode: MPESA_SHORTCODE,
                Password: password,
                Timestamp: timestamp,
                CheckoutRequestID: checkoutRequestID
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        const resultCode = response.data.ResultCode;
        const isCompleted = resultCode === '0';

        console.log(`📊 Payment status: ${isCompleted ? 'COMPLETED' : 'PENDING'} - ${response.data.ResultDesc}`);

        res.json({
            success: true,
            status: isCompleted ? 'completed' : 'pending',
            message: response.data.ResultDesc,
            resultCode: resultCode,
            checkoutRequestID: checkoutRequestID
        });
    } catch (error) {
        console.error('Status check error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            status: 'failed',
            error: error.response?.data?.errorMessage || error.message
        });
    }
});

// M-Pesa Callback endpoint
app.post('/api/payments/mpesa/callback', async (req, res) => {
    console.log('📞 M-Pesa Callback received:', JSON.stringify(req.body, null, 2));

    const { Body } = req.body;
    if (Body && Body.stkCallback) {
        const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = Body.stkCallback;

        if (ResultCode === 0) {
            const items = CallbackMetadata?.Item || [];
            const receiptNumber = items.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
            const amount = items.find(item => item.Name === 'Amount')?.Value;
            const phoneNumber = items.find(item => item.Name === 'PhoneNumber')?.Value;

            console.log(`✅ Payment successful: Receipt ${receiptNumber}, Amount KES ${amount}, Phone ${phoneNumber}`);
            
            // Here you would update your Supabase database
            // await supabase.from('payments').insert({...})
        } else {
            console.log(`❌ Payment failed: ${ResultDesc}`);
        }
    }

    res.json({ ResultCode: 0, ResultDesc: 'Success' });
});

// ============================================
// 404 HANDLER
// ============================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        message: `Cannot ${req.method} ${req.url}`,
        available_endpoints: [
            'GET /',
            'GET /health',
            'GET /api/health',
            'GET /api/test',
            'GET /api/payments/mpesa/test',
            'POST /api/payments/mpesa/initiate',
            'POST /api/payments/mpesa/status',
            'POST /api/payments/mpesa/callback'
        ]
    });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║     🚗 MEI DRIVE AFRICA - PRODUCTION BACKEND API                 ║
║                                                                   ║
║     Status: ✅ RUNNING                                            ║
║     Port: ${PORT}                                                   ║
║     Environment: PRODUCTION                                       ║
║     M-Pesa Mode: LIVE - REAL MONEY                                ║
║     Paybill Number: ${MPESA_SHORTCODE}                              ║
║     Backend URL: ${BACKEND_URL}                                     ║
║                                                                   ║
║     ⚠️  WARNING: REAL MONEY WILL BE DEDUCTED!                     ║
║                                                                   ║
║     API Endpoints:                                                ║
║     • Health:      GET  ${BACKEND_URL}/api/health                   ║
║     • Test:        GET  ${BACKEND_URL}/api/test                     ║
║     • M-Pesa Test: GET  ${BACKEND_URL}/api/payments/mpesa/test      ║
║     • Initiate:    POST ${BACKEND_URL}/api/payments/mpesa/initiate  ║
║     • Status:      POST ${BACKEND_URL}/api/payments/mpesa/status    ║
║     • Callback:    POST ${BACKEND_URL}/api/payments/mpesa/callback  ║
║                                                                   ║
║     Real M-Pesa Production Settings:                              ║
║     • Paybill: ${MPESA_SHORTCODE}                                          ║
║     • Real customer phone numbers only                            ║
║     • Real money will be deducted                                 ║
║     • Minimum payment: 1 KES                                      ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
    `);
});

export default app;
