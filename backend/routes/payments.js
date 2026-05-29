import express from 'express';
import axios from 'axios';

const router = express.Router();

// M-Pesa Production Credentials
const MPESA_CONSUMER_KEY = 'LI2gcJZEheN8qCfXHEXV4gdYXvOBHVnv';
const MPESA_CONSUMER_SECRET = 'aGGo8AuPJVpsZLcs';
const MPESA_PASSKEY = '7eb17a031bdfd5b4251863a1ddb72c5b9cd14f3385aa6a258c1442a0116e8277';
const MPESA_SHORTCODE = '4095377';
const ENVIRONMENT = 'production'; // Changed to production for live money

// Helper: Get M-Pesa Access Token
async function getAccessToken() {
    const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
    const url = ENVIRONMENT === 'production'
        ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
        : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
    
    console.log(`🔑 Getting M-Pesa ${ENVIRONMENT} access token...`);
    
    try {
        const response = await axios.get(url, {
            headers: { Authorization: `Basic ${auth}` }
        });
        console.log('✅ Access token obtained');
        return response.data.access_token;
    } catch (error) {
        console.error('❌ Token error:', error.response?.data || error.message);
        throw new Error(`Failed to get token: ${error.response?.data?.errorMessage || error.message}`);
    }
}

// Helper: Format phone number
function formatPhoneNumber(phone) {
    let cleaned = phone.toString().replace(/\s/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('+')) {
        cleaned = cleaned.substring(1);
    } else if (!cleaned.startsWith('254')) {
        cleaned = '254' + cleaned;
    }
    return cleaned;
}

// Test endpoint
router.get('/mpesa/test', async (req, res) => {
    try {
        const token = await getAccessToken();
        res.json({
            success: true,
            message: `M-Pesa ${ENVIRONMENT} connection successful!`,
            environment: ENVIRONMENT,
            shortcode: MPESA_SHORTCODE,
            minimumPayment: 49
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Initiate STK Push
router.post('/mpesa/initiate', async (req, res) => {
    try {
        const { phoneNumber, amount, courseId, courseName, userId } = req.body;
        
        console.log('💰 PRODUCTION Payment initiated:', { phoneNumber, amount, courseId, courseName });
        
        // Validate minimum payment (49 KES)
        const MINIMUM_PAYMENT = 49;
        if (amount < MINIMUM_PAYMENT) {
            return res.status(400).json({
                success: false,
                error: `Minimum payment amount is ${MINIMUM_PAYMENT} KES`
            });
        }
        
        if (!phoneNumber || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Phone number and amount are required'
            });
        }
        
        const formattedPhone = formatPhoneNumber(phoneNumber);
        const accountRef = `MEI-${courseId || 'COURSE'}-${Date.now()}`;
        
        const token = await getAccessToken();
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');
        
        const stkPushRequest = {
            BusinessShortCode: MPESA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.round(amount),
            PartyA: formattedPhone,
            PartyB: MPESA_SHORTCODE,
            PhoneNumber: formattedPhone,
            CallBackURL: `https://mei-drive-api.onrender.com/api/payments/mpesa/callback`,
            AccountReference: accountRef,
            TransactionDesc: `Payment for ${courseName || 'Course Enrollment'}`
        };
        
        const url = ENVIRONMENT === 'production'
            ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
            : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
        
        const response = await axios.post(url, stkPushRequest, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ STK Push Response:', response.data);
        
        res.json({
            success: true,
            message: 'STK Push initiated. Check your phone.',
            checkoutRequestID: response.data.CheckoutRequestID,
            merchantRequestID: response.data.MerchantRequestID,
            responseCode: response.data.ResponseCode,
            responseDescription: response.data.ResponseDescription
        });
        
    } catch (error) {
        console.error('❌ Initiate error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: error.response?.data?.errorMessage || 'Failed to initiate payment'
        });
    }
});

// M-Pesa Callback
router.post('/mpesa/callback', async (req, res) => {
    console.log('📞 Callback received:', new Date().toISOString());
    console.log('Body:', JSON.stringify(req.body, null, 2));
    res.json({ ResultCode: 0, ResultDesc: 'Success' });
});

// Check transaction status
router.post('/mpesa/status', async (req, res) => {
    try {
        const { checkoutRequestID } = req.body;
        
        if (!checkoutRequestID) {
            return res.status(400).json({
                success: false,
                error: 'Missing checkoutRequestID'
            });
        }
        
        const token = await getAccessToken();
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');
        
        const queryRequest = {
            BusinessShortCode: MPESA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestID
        };
        
        const url = ENVIRONMENT === 'production'
            ? 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query'
            : 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query';
        
        const response = await axios.post(url, queryRequest, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const isCompleted = response.data.ResultCode === '0';
        const isPending = response.data.ResultCode === '1037';
        
        res.json({
            success: true,
            status: isCompleted ? 'completed' : (isPending ? 'pending' : 'failed'),
            resultCode: response.data.ResultCode,
            resultDesc: response.data.ResultDesc
        });
        
    } catch (error) {
        console.error('Status error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to check payment status'
        });
    }
});

export default router;
