require('dotenv').config();

module.exports = {
    // PRODUCTION CREDENTIALS - MEI DRIVE AFRICA
    consumerKey: 'LI2gcJZEheN8qCfXHEXV4gdYXvOBHVnv',
    consumerSecret: 'aGGo8AuPJVpsZLcs',
    
    // Paybill
    shortCode: '4095377',
    
    // PRODUCTION Passkey
    passkey: '7eb17a031bdfd5b4251863a1ddb72c5b9cd14f3385aa6a258c1442a0116e8277',
    
    // Callback URLs (use ngrok for local testing, or Supabase Edge Function for production)
    callbackUrl: process.env.CALLBACK_URL || 'https://your-project-ref.supabase.co/functions/v1/mpesa-callback',
    timeoutUrl: process.env.TIMEOUT_URL || 'https://your-project-ref.supabase.co/functions/v1/mpesa-timeout',
    
    // Environment: 'production' for live, 'sandbox' for testing
    environment: process.env.NODE_ENV || 'production',
    
    // API URLs
    apiUrls: {
        sandbox: {
            auth: 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
            stkPush: 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            stkQuery: 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query'
        },
        production: {
            auth: 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
            stkPush: 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            stkQuery: 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query'
        }
    }
};
