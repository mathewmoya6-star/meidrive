const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

// Get OAuth token from Safaricom
async function getAccessToken() {
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
  
  const response = await axios.get(
    'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    { headers: { Authorization: `Basic ${auth}` } }
  );
  
  return response.data.access_token;
}

// STK Push endpoint
router.post('/stkpush', async (req, res) => {
  try {
    const { phoneNumber, amount, accountReference, transactionDesc } = req.body;

    // Format phone number to 254XXXXXXXXX format
    let formattedPhone = phoneNumber.toString().replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.slice(1);
    }
    if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.slice(1);
    }

    const token = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64');

    const stkPushRequest = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: `${process.env.CALLBACK_URL}/api/mpesa/callback`,
      AccountReference: accountReference || 'CoursePayment',
      TransactionDesc: transactionDesc || 'Boda Boda Course'
    };

    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      stkPushRequest,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Return success JSON
    res.status(200).json({
      success: true,
      message: 'STK Push sent successfully. Check your phone.',
      data: response.data
    });

  } catch (error) {
    console.error('STK Push Error:', error.response?.data || error.message);
    
    // Return JSON error (fixes the parsing error)
    res.status(500).json({
      success: false,
      error: 'Payment processing failed',
      details: error.response?.data || error.message
    });
  }
});

// Callback endpoint (M-Pesa sends payment confirmation here)
router.post('/callback', async (req, res) => {
  console.log('M-Pesa Callback received:', JSON.stringify(req.body, null, 2));
  
  // Here you can update your database with payment status
  // Check if payment was successful: req.body.Body.stkCallback.ResultCode === 0
  
  res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
});

module.exports = router;
