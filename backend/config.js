// config/mpesa.js
// REAL PRODUCTION CONFIGURATION - MEI DRIVE AFRICA
// LIVE MONEY - DO NOT USE FOR TESTING

require('dotenv').config();

module.exports = {
    // =====================================================
    // REAL PRODUCTION CREDENTIALS - MEI DRIVE AFRICA
    // From Safaricom Developer Portal Screenshot
    // =====================================================
    
    // PRODUCTION Consumer Key (Copy exactly from your portal)
    consumerKey: 'LI2gcJZEheN8qCfXHEXV4gdYxVOBHVNv',
    
    // PRODUCTION Consumer Secret (Copy exactly from your portal)
    consumerSecret: 'aGG0s8AuPJVpsZLcs',
    
    // PRODUCTION Paybill Shortcode
    shortCode: '4095377',
    
    // PRODUCTION Passkey (Copy exactly from your portal)
    passkey: '7eb17a031bdfd5b4251863a1ddb72c5b9cd14f3385aa6a258c1442a0116e8277',
    
    // =====================================================
    // PRODUCTION CALLBACK URLs - Your Render.com Backend
    // =====================================================
    
    // Main callback URL where Safaricom sends payment confirmation
    callbackUrl: 'https://meidriveafrica-backend.onrender.com/api/payments/mpesa/callback',
    
    // Timeout URL for when the transaction times out
    timeoutUrl: 'https://meidriveafrica-backend.onrender.com/api/payments/mpesa/timeout',
    
    // Result URL for transaction results
    resultUrl: 'https://meidriveafrica-backend.onrender.com/api/payments/mpesa/result',
    
    // Confirmation URL for C2B payments
    confirmationUrl: 'https://meidriveafrica-backend.onrender.com/api/payments/mpesa/confirmation',
    
    // Validation URL for C2B payments
    validationUrl: 'https://meidriveafrica-backend.onrender.com/api/payments/mpesa/validation',
    
    // =====================================================
    // ENVIRONMENT - PRODUCTION (LIVE MONEY)
    // =====================================================
    environment: 'production',
    
    // =====================================================
    // API URLs - REAL PRODUCTION ENDPOINTS
    // =====================================================
    apiUrls: {
        production: {
            auth: 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
            stkPush: 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            stkQuery: 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query',
            registerUrl: 'https://api.safaricom.co.ke/mpesa/c2b/v1/registerurl',
            simulateC2B: 'https://api.safaricom.co.ke/mpesa/c2b/v1/simulate',
            accountBalance: 'https://api.safaricom.co.ke/mpesa/accountbalance/v1/query',
            transactionStatus: 'https://api.safaricom.co.ke/mpesa/transactionstatus/v1/query',
            reversal: 'https://api.safaricom.co.ke/mpesa/reversal/v1/request'
        }
    },
    
    // =====================================================
    // PAYMENT SETTINGS
    // =====================================================
    paymentSettings: {
        minimumAmount: 49,
        maximumAmount: 500000,
        currency: 'KES',
        transactionType: 'CustomerPayBillOnline'
    },
    
    // =====================================================
    // BUSINESS INFORMATION
    // =====================================================
    business: {
        name: 'MEI DRIVE AFRICA',
        shortcode: '4095377',
        description: 'Professional Driver Training Courses'
    },
    
    // =====================================================
    // WARNING FLAG - REAL MONEY
    // =====================================================
    warning: '⚠️ THIS IS PRODUCTION MODE - REAL MONEY WILL BE DEDUCTED ⚠️'
};
