// server.js - ES Module version (works with "type": "module")
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ============================================
// M-PESA CONFIGURATION
// ============================================
const MPESA_CONFIG = {
    consumerKey: 'LI2gcJZEheN8qCfXHEXV4gdYXvOBHVnv',
    consumerSecret: 'aGGo8AuPJVpsZLcs',
    passkey: '7eb17a031bdfd5b4251863a1ddb72c5b9cd14f3385aa6a258c1442a0116e8277',
    shortCode: '4095377',
    environment: 'production',
    callbackUrl: 'https://www.meidriveafrica.com/api/mpesa/callback'
};

const transactions = new Map();

// Helper Functions
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
        console.log('✅ Access token obtained');
        return response.data.access_token;
    } catch (error) {
        console.error('❌ Token error:', error.response?.data || error.message);
        throw new Error('Failed to get access token');
    }
}

function generatePassword(shortCode, passkey, timestamp) {
    const str = `${shortCode}${passkey}${timestamp}`;
    return Buffer.from(str).toString('base64');
}

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
// M-PESA STK PUSH ENDPOINT
// ============================================
app.post('/api/mpesa/stkpush', async (req, res) => {
    console.log('\n📱 STK Push Request:', req.body);
    
    try {
        const { phoneNumber, amount, accountReference, transactionDesc, userId, courseId } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ success: false, error: 'Phone number required' });
        }
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Valid amount required' });
        }
        
        const formattedPhone = formatPhoneNumber(phoneNumber);
        console.log(`📞 Phone: ${formattedPhone}, 💰 Amount: KES ${amount}`);
        
        if (formattedPhone.length !== 12 || !formattedPhone.startsWith('254')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number. Use format: 0712345678'
            });
        }
        
        const token = await getMpesaToken();
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = generatePassword(MPESA_CONFIG.shortCode, MPESA_CONFIG.passkey, timestamp);
        
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
            TransactionDesc: (transactionDesc || 'Course Enrollment').substring(0, 36)
        };
        
        const url = 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
        const response = await axios.post(url, stkPushRequest, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const checkoutRequestID = response.data.CheckoutRequestID;
        transactions.set(checkoutRequestID, {
            userId, courseId, amount: Math.round(amount),
            phoneNumber: formattedPhone, status: 'pending',
            createdAt: new Date().toISOString()
        });
        
        res.json({
            success: true,
            message: 'STK Push sent. Check your phone.',
            checkoutRequestID: checkoutRequestID,
            responseCode: response.data.ResponseCode
        });
        
    } catch (error) {
        console.error('❌ STK Push error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: error.response?.data?.errorMessage || error.message || 'Payment processing failed'
        });
    }
});

// ============================================
// M-PESA CALLBACK ENDPOINT
// ============================================
app.post('/api/mpesa/callback', async (req, res) => {
    console.log('\n📞 M-Pesa Callback received');
    
    try {
        const { Body } = req.body;
        if (!Body || !Body.stkCallback) {
            return res.json({ ResultCode: 0, ResultDesc: 'Invalid callback' });
        }
        
        const { stkCallback } = Body;
        const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;
        
        const transaction = transactions.get(CheckoutRequestID);
        if (!transaction) {
            return res.json({ ResultCode: 0, ResultDesc: 'Transaction recorded' });
        }
        
        if (ResultCode === 0) {
            let mpesaReceiptNumber = '';
            if (CallbackMetadata?.Item) {
                const receiptItem = CallbackMetadata.Item.find(item => item.Name === 'MpesaReceiptNumber');
                if (receiptItem) mpesaReceiptNumber = receiptItem.Value;
            }
            
            transaction.status = 'completed';
            transaction.mpesaReceiptNumber = mpesaReceiptNumber;
            transaction.completedAt = new Date().toISOString();
            console.log(`✅ PAYMENT SUCCESSFUL! Receipt: ${mpesaReceiptNumber}`);
        } else {
            transaction.status = 'failed';
            transaction.resultDesc = ResultDesc;
            console.log(`❌ PAYMENT FAILED: ${ResultDesc}`);
        }
        
        transactions.set(CheckoutRequestID, transaction);
        res.json({ ResultCode: 0, ResultDesc: 'Success' });
        
    } catch (error) {
        console.error('Callback error:', error);
        res.json({ ResultCode: 0, ResultDesc: 'Error' });
    }
});

// ============================================
// CHECK PAYMENT STATUS
// ============================================
app.post('/api/mpesa/status', (req, res) => {
    const { checkoutRequestID } = req.body;
    const transaction = transactions.get(checkoutRequestID);
    
    if (transaction) {
        res.json({
            success: true,
            status: transaction.status,
            mpesaReceiptNumber: transaction.mpesaReceiptNumber
        });
    } else {
        res.json({ success: false, status: 'unknown' });
    }
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'MEI DRIVE AFRICA',
        environment: MPESA_CONFIG.environment,
        shortCode: MPESA_CONFIG.shortCode,
        timestamp: new Date().toISOString()
    });
});

// ============================================
// SERVE FILES
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/supabase.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'supabase.js'));
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║     🚀 MEI DRIVE AFRICA - SERVER RUNNING                      ║
╠═══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                   ║
║  URL: http://localhost:${PORT}                                  ║
║  Health: http://localhost:${PORT}/api/health                    ║
╚═══════════════════════════════════════════════════════════════╝
    `);
});
