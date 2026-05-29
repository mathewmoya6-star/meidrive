import express from 'express';
import axios from 'axios';

const router = express.Router();

// M-Pesa Production Credentials
const MPESA_CONSUMER_KEY = 'LI2gcJZEheN8qCfXHEXV4gdYXvOBHVnv';
const MPESA_CONSUMER_SECRET = 'aGGo8AuPJVpsZLcs';
const MPESA_PASSKEY = '7eb17a031bdfd5b4251863a1ddb72c5b9cd14f3385aa6a258c1442a0116e8277';
const MPESA_SHORTCODE = '4095377';
const ENVIRONMENT = 'production'; // Changed to production

// Helper: Get M-Pesa Access Token
async function getAccessToken() {
    const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
    // Production URL
    const url = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
    
    console.log('🔑 Getting M-Pesa production access token...');
    
    try {
        const response = await axios.get(url, {
            headers: { Authorization: `Basic ${auth}` }
        });
        console.log('✅ Access token obtained successfully');
        return response.data.access_token;
    } catch (error) {
        console.error('❌ Token error:', error.response?.data || error.message);
        throw new Error(`Failed to get token: ${error.response?.data?.errorMessage || error.message}`);
    }
}

// Helper: Format phone number to 254XXXXXXXXX
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
            message: 'M-Pesa Production connection successful!',
            environment: ENVIRONMENT,
            shortcode: MPESA_SHORTCODE,
            tokenObtained: !!token
        });
    } catch (error) {
        console.error('Test endpoint error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Initiate STK Push (Lipa Na M-Pesa Online)
router.post('/mpesa/initiate', async (req, res) => {
    try {
        const { phoneNumber, amount, courseId, courseName, userId } = req.body;
        
        console.log('📱 Initiating payment:', { phoneNumber, amount, courseId, courseName });
        
        // Validate input
        if (!phoneNumber || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Phone number and amount are required'
            });
        }
        
        // Validate amount (minimum 1 KES for production)
        if (amount < 1) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be at least 1 KES'
            });
        }
        
        const formattedPhone = formatPhoneNumber(phoneNumber);
        const accountRef = `MEI-${courseId || 'COURSE'}-${Date.now()}`;
        
        console.log('Account reference:', accountRef);
        
        // Get access token
        const token = await getAccessToken();
        
        // Generate timestamp and password
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');
        
        console.log('Timestamp:', timestamp);
        console.log('Shortcode:', MPESA_SHORTCODE);
        
        // Prepare STK Push request
        const stkPushRequest = {
            BusinessShortCode: MPESA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.round(amount),
            PartyA: formattedPhone,
            PartyB: MPESA_SHORTCODE,
            PhoneNumber: formattedPhone,
            CallBackURL: `${process.env.CALLBACK_URL || 'https://your-domain.com'}/api/payments/mpesa/callback`,
            AccountReference: accountRef,
            TransactionDesc: `Payment for ${courseName || 'Course Enrollment'}`
        };
        
        console.log('STK Push Request:', JSON.stringify(stkPushRequest, null, 2));
        
        // Production URL
        const url = 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
        
        const response = await axios.post(url, stkPushRequest, {
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
            responseDescription: response.data.ResponseDescription
        });
        
    } catch (error) {
        console.error('❌ Initiate error:', error.response?.data || error.message);
        
        const errorMessage = error.response?.data?.errorMessage || 
                           error.response?.data?.ResponseDescription || 
                           'Failed to initiate payment';
        
        res.status(500).json({
            success: false,
            error: errorMessage,
            details: error.response?.data
        });
    }
});

// M-Pesa Callback URL (Safaricom sends confirmation here)
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
            
            // Extract metadata
            let metadata = {};
            if (CallbackMetadata && CallbackMetadata.Item) {
                CallbackMetadata.Item.forEach(item => {
                    metadata[item.Name] = item.Value;
                });
            }
            
            console.log('Payment Metadata:', metadata);
            
            if (ResultCode === 0) {
                console.log('✅ Payment successful!');
                console.log(`Receipt Number: ${metadata.MpesaReceiptNumber}`);
                console.log(`Amount: ${metadata.Amount}`);
                console.log(`Phone: ${metadata.PhoneNumber}`);
                // Here you would update your database
            } else {
                console.log('❌ Payment failed:', ResultDesc);
            }
        }
        
        // Always acknowledge receipt to M-Pesa
        res.json({ ResultCode: 0, ResultDesc: 'Success' });
        
    } catch (error) {
        console.error('Callback processing error:', error);
        res.json({ ResultCode: 0, ResultDesc: 'Success' });
    }
});

// Check transaction status
router.post('/mpesa/status', async (req, res) => {
    try {
        const { checkoutRequestID } = req.body;
        
        console.log('🔍 Checking status for:', checkoutRequestID);
        
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
        
        // Production URL
        const url = 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query';
        
        const response = await axios.post(url, queryRequest, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Status response:', response.data);
        
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
