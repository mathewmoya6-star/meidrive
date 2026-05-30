import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const BACKEND_URL = process.env.BACKEND_URL || 'https://mei-drive-api.onrender.com';

// M-Pesa Credentials - PRODUCTION (REAL MONEY)
const MPESA_CONSUMER_KEY = 'LI2gcJZEheN8qCfXHEXV4gdYXvOBHVnv';
const MPESA_CONSUMER_SECRET = 'aGGo8AuPJVpsZLcs';
const MPESA_PASSKEY = '7eb17a031bdfd5b4251863a1ddb72c5b9cd14f3385aa6a258c1442a0116e8277';
const MPESA_SHORTCODE = '4095377';
const MPESA_CALLBACK_URL = `${BACKEND_URL}/api/payments/mpesa/callback`;

// CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

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
            { headers: { Authorization: `Basic ${auth}` }, timeout: 30000 }
        );
        return response.data.access_token;
    } catch (error) {
        console.error('Error getting M-Pesa token:', error.response?.data || error.message);
        throw error;
    }
}

// Format phone number for Safaricom (254XXXXXXXXX format)
function formatPhoneNumber(phoneNumber) {
    let cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('254')) {
        cleaned = cleaned;
    } else if (cleaned.length === 9) {
        cleaned = '254' + cleaned;
    } else {
        cleaned = '254' + cleaned;
    }
    return cleaned;
}

// ============================================
// HEALTH CHECK ENDPOINTS
// ============================================

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/payments/mpesa/test', async (req, res) => {
    try {
        const token = await getMpesaAccessToken();
        res.json({ 
            success: true, 
            message: 'M-Pesa API connection successful',
            paybill: MPESA_SHORTCODE,
            mode: 'PRODUCTION - REAL MONEY'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// STK PUSH INITIATE - REAL MONEY
// ============================================
app.post('/api/payments/mpesa/initiate', async (req, res) => {
    try {
        let { phoneNumber, amount, courseId, userId, email } = req.body;

        console.log('========================================');
        console.log('📱 STK PUSH INITIATION');
        console.log('========================================');
        console.log('Raw Phone:', phoneNumber);
        console.log('Amount:', amount);
        console.log('Course ID:', courseId);
        console.log('User ID:', userId);

        // Validate inputs
        if (!phoneNumber || !amount || amount < 1) {
            return res.status(400).json({
                success: false,
                error: 'Valid phone number and amount (min 1 KES) required'
            });
        }

        // Format phone number correctly
        const formattedPhone = formatPhoneNumber(phoneNumber);
        console.log('Formatted Phone:', formattedPhone);

        // Get Access Token
        console.log('🔑 Getting access token...');
        const accessToken = await getMpesaAccessToken();
        console.log('✅ Access token obtained');

        // Generate timestamp and password
        const timestamp = getTimestamp();
        const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');
        console.log('Timestamp:', timestamp);

        // Prepare STK Push request
        const stkRequest = {
            BusinessShortCode: MPESA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.round(amount),
            PartyA: formattedPhone,
            PartyB: MPESA_SHORTCODE,
            PhoneNumber: formattedPhone,
            CallBackURL: MPESA_CALLBACK_URL,
            AccountReference: `C${courseId}`,
            TransactionDesc: `MEI DRIVE COURSE`
        };

        console.log('📤 Sending STK Push to Safaricom...');
        console.log('Request:', JSON.stringify(stkRequest, null, 2));

        // Send STK Push
        const stkResponse = await axios.post(
            'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            stkRequest,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        console.log('✅ STK Push Response:', stkResponse.data);
        console.log('========================================');

        res.json({
            success: true,
            checkoutRequestID: stkResponse.data.CheckoutRequestID,
            message: 'STK push sent. Check your phone for M-Pesa prompt.',
            warning: '⚠️ Real money will be deducted from your M-Pesa account'
        });

    } catch (error) {
        console.error('❌ STK PUSH ERROR:');
        console.error('Error message:', error.message);
        console.error('Response data:', error.response?.data);
        console.error('Response status:', error.response?.status);
        console.error('========================================');

        res.status(500).json({
            success: false,
            error: error.response?.data?.errorMessage || error.message,
            details: error.response?.data,
            message: 'Payment initiation failed. Please try again.'
        });
    }
});

// ============================================
// CHECK PAYMENT STATUS
// ============================================
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

        const statusResponse = await axios.post(
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

        const resultCode = statusResponse.data.ResultCode;
        const isCompleted = resultCode === '0';

        console.log(`📊 Status: ${isCompleted ? 'COMPLETED' : 'PENDING'} - ${statusResponse.data.ResultDesc}`);

        res.json({
            success: true,
            status: isCompleted ? 'completed' : 'pending',
            message: statusResponse.data.ResultDesc,
            resultCode: resultCode
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

// ============================================
// M-PESA CALLBACK
// ============================================
app.post('/api/payments/mpesa/callback', (req, res) => {
    console.log('📞 M-Pesa Callback received:', JSON.stringify(req.body, null, 2));
    
    const { Body } = req.body;
    if (Body && Body.stkCallback) {
        const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = Body.stkCallback;

        if (ResultCode === 0) {
            const items = CallbackMetadata?.Item || [];
            const receiptNumber = items.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
            const amount = items.find(item => item.Name === 'Amount')?.Value;
            const phoneNumber = items.find(item => item.Name === 'PhoneNumber')?.Value;

            console.log(`✅ PAYMENT SUCCESSFUL!`);
            console.log(`   Receipt: ${receiptNumber}`);
            console.log(`   Amount: KES ${amount}`);
            console.log(`   Phone: ${phoneNumber}`);
            console.log(`   CheckoutID: ${CheckoutRequestID}`);
        } else {
            console.log(`❌ PAYMENT FAILED: ${ResultDesc}`);
        }
    }

    res.json({ ResultCode: 0, ResultDesc: 'Success' });
});

// ============================================
// ROOT ENDPOINTS
// ============================================
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'MEI DRIVE AFRICA API',
        version: '2.0.0',
        status: 'running',
        paybill: MPESA_SHORTCODE,
        endpoints: ['/api/health', '/api/payments/mpesa/test', '/api/payments/mpesa/initiate', '/api/payments/mpesa/status']
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        message: `Cannot ${req.method} ${req.url}`
    });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║     🚗 MEI DRIVE AFRICA - M-PESA API SERVER                       ║
║                                                                   ║
║     Status: ✅ RUNNING                                            ║
║     Port: ${PORT}                                                   ║
║     Paybill Number: ${MPESA_SHORTCODE}                              ║
║     Backend URL: ${BACKEND_URL}                                     ║
║                                                                   ║
║     ⚠️  WARNING: REAL MONEY WILL BE DEDUCTED!                     ║
║                                                                   ║
║     Endpoints:                                                    ║
║     • GET  /api/health                                            ║
║     • GET  /api/payments/mpesa/test                               ║
║     • POST /api/payments/mpesa/initiate                           ║
║     • POST /api/payments/mpesa/status                             ║
║     • POST /api/payments/mpesa/callback                           ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
    `);
});

export default app;
