import express from 'express';
import axios from 'axios';

const router = express.Router();

// M-Pesa Sandbox Credentials (for testing)
// Change to 'production' when you have live credentials
const MPESA_CONSUMER_KEY = 'LI2gcJZEheN8qCfXHEXV4gdYXvOBHVnv';
const MPESA_CONSUMER_SECRET = 'aGGo8AuPJVpsZLcs';
const MPESA_PASSKEY = '7eb17a031bdfd5b4251863a1ddb72c5b9cd14f3385aa6a258c1442a0116e8277';
const MPESA_SHORTCODE = '4095377';
const ENVIRONMENT = 'sandbox'; // CHANGE THIS to 'production' ONLY when you have live credentials

// Helper: Get M-Pesa Access Token
async function getAccessToken() {
    // Use sandbox URL for testing
    const url = ENVIRONMENT === 'production' 
        ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
        : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
    
    const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
    
    console.log(`🔑 Getting M-Pesa ${ENVIRONMENT} access token...`);
    console.log(`URL: ${url}`);
    
    try {
        const response = await axios.get(url, {
            headers: { 
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('✅ Access token obtained successfully');
        return response.data.access_token;
    } catch (error) {
        console.error('❌ Token error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
        });
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
    console.log(`📱 Formatted phone: ${cleaned}`);
    return cleaned;
}

// Test endpoint - Check if M-Pesa is connected
router.get('/mpesa/test', async (req, res) => {
    try {
        const token = await getAccessToken();
        res.json({
            success: true,
            message: `M-Pesa ${ENVIRONMENT} connection successful!`,
            environment: ENVIRONMENT,
            shortcode: MPESA_SHORTCODE,
            tokenObtained: !!token
        });
    } catch (error) {
        console.error('Test endpoint error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            environment: ENVIRONMENT
        });
    }
});

// Initiate STK Push
router.post('/mpesa/initiate', async (req, res) => {
    try {
        const { phoneNumber, amount, courseId, courseName, userId } = req.body;
        
        console.log('💰 Payment initiated:', { phoneNumber, amount, courseId, courseName, environment: ENVIRONMENT });
        
        if (!phoneNumber || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Phone number and amount are required'
            });
        }
        
        if (amount < 1) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be at least 1 KES'
            });
        }
        
        const formattedPhone = formatPhoneNumber(phoneNumber);
        const accountRef = `MEI-${courseId || 'COURSE'}-${Date.now()}`;
        
        const token = await getAccessToken();
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');
        
        // Use sandbox or production URL based on environment
        const apiUrl = ENVIRONMENT === 'production'
            ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
            : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
        
        const stkPushRequest = {
            BusinessShortCode: MPESA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.round(amount),
            PartyA: formattedPhone,
            PartyB: MPESA_SHORTCODE,
            PhoneNumber: formattedPhone,
            CallBackURL: `${process.env.CALLBACK_URL || 'http://localhost:3000'}/api/payments/mpesa/callback`,
            AccountReference: accountRef,
            TransactionDesc: `Payment for ${courseName || 'Course Enrollment'}`
        };
        
        console.log('STK Push Request:', JSON.stringify(stkPushRequest, null, 2));
        
        const response = await axios.post(apiUrl, stkPushRequest, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ STK Push Response:', response.data);
        
        res.json({
            success: true,
            message: 'STK Push initiated. Check your phone for M-Pesa prompt.',
            checkoutRequestID: response.data.CheckoutRequestID,
            merchantRequestID: response.data.MerchantRequestID,
            responseCode: response.data.ResponseCode,
            responseDescription: response.data.ResponseDescription,
            environment: ENVIRONMENT
        });
        
    } catch (error) {
        console.error('❌ Initiate error:', error.response?.data || error.message);
        
        const errorMessage = error.response?.data?.errorMessage || 
                           error.response?.data?.ResponseDescription || 
                           error.message ||
                           'Failed to initiate payment';
        
        res.status(500).json({
            success: false,
            error: errorMessage,
            environment: ENVIRONMENT,
            details: error.response?.data
        });
    }
});

// M-Pesa Callback URL
router.post('/mpesa/callback', async (req, res) => {
    console.log('📞 Callback received at:', new Date().toISOString());
    console.log('Callback body:', JSON.stringify(req.body, null, 2));
    
    try {
        const { Body } = req.body;
        
        if (Body && Body.stkCallback) {
            const {
                ResultCode,
                ResultDesc,
                CheckoutRequestID,
                CallbackMetadata
            } = Body.stkCallback;
            
            console.log(`Callback Result: ${ResultCode} - ${ResultDesc}`);
            
            if (CallbackMetadata && CallbackMetadata.Item) {
                const metadata = {};
                CallbackMetadata.Item.forEach(item => {
                    metadata[item.Name] = item.Value;
                });
                console.log('Payment Metadata:', metadata);
                
                if (ResultCode === 0) {
                    console.log('✅ PAYMENT SUCCESSFUL!');
                    console.log(`Receipt: ${metadata.MpesaReceiptNumber}`);
                    console.log(`Amount: ${metadata.Amount}`);
                    console.log(`Phone: ${metadata.PhoneNumber}`);
                }
            }
        }
        
        res.json({ ResultCode: 0, ResultDesc: 'Success' });
        
    } catch (error) {
        console.error('Callback error:', error);
        res.json({ ResultCode: 0, ResultDesc: 'Success' });
    }
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
        
        const apiUrl = ENVIRONMENT === 'production'
            ? 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query'
            : 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query';
        
        const queryRequest = {
            BusinessShortCode: MPESA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestID
        };
        
        const response = await axios.post(apiUrl, queryRequest, {
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
            resultDesc: response.data.ResultDesc,
            environment: ENVIRONMENT
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
