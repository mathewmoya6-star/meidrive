// supabase/functions/mpesa-stkpush/index.ts
// PRODUCTION READY - M-Pesa STK Push Edge Function

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// ============================================
// PRODUCTION CONFIGURATION
// ============================================

const MPESA_CONFIG = {
  consumerKey: 'LI2gcJZEheN8qCfXHEXV4gdYXvOBHVnv',
  consumerSecret: 'aGGo8AuPJVpsZLcs',
  passkey: '7eb17a031bdfd5b4251863a1ddb72c5b9cd14f3385aa6a258c1442a0116e8277',
  shortCode: '4095377',
  environment: 'production', // CHANGE TO 'production' WHEN LIVE
}

// Update this to your actual Supabase project URL
const SUPABASE_URL = 'https://qpqkmmkrzxlhcpccefjn.supabase.co'
const CALLBACK_URL = `${SUPABASE_URL}/functions/v1/mpesa-callback`

// ============================================
// CORS Headers
// ============================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info',
  'Access-Control-Max-Age': '86400',
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatPhoneNumber(phone: string): string {
  let formatted = phone.replace(/\D/g, '')
  
  if (formatted.startsWith('0')) {
    formatted = '254' + formatted.substring(1)
  } else if (formatted.startsWith('+254')) {
    formatted = '254' + formatted.substring(4)
  } else if (formatted.length === 9) {
    formatted = '254' + formatted
  }
  
  if (!formatted.startsWith('254') || formatted.length !== 12) {
    throw new Error('Invalid phone number. Use format: 0712345678')
  }
  
  return formatted
}

function getTimestamp(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}${hours}${minutes}${seconds}`
}

function generateTransactionId(): string {
  const prefix = 'MEI'
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}_${timestamp}_${random}`
}

// ============================================
// MPESA API FUNCTIONS
// ============================================

async function getAccessToken(): Promise<string> {
  const auth = btoa(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`)
  const isProduction = MPESA_CONFIG.environment === 'production'
  const url = isProduction
    ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'

  console.log(`🔐 Getting access token from ${isProduction ? 'PRODUCTION' : 'SANDBOX'}...`)

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Token error:', errorText)
    throw new Error(`Failed to get access token: ${response.status}`)
  }

  const data = await response.json()
  
  if (!data.access_token) {
    throw new Error('No access token in response')
  }

  console.log('✅ Access token obtained')
  return data.access_token
}

async function stkPush(
  phone: string,
  amount: number,
  accountRef: string,
  transactionDesc: string
): Promise<any> {
  const token = await getAccessToken()
  const timestamp = getTimestamp()
  const password = btoa(`${MPESA_CONFIG.shortCode}${MPESA_CONFIG.passkey}${timestamp}`)
  const isProduction = MPESA_CONFIG.environment === 'production'
  const url = isProduction
    ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
    : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'

  const requestBody = {
    BusinessShortCode: MPESA_CONFIG.shortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(amount),
    PartyA: phone,
    PartyB: MPESA_CONFIG.shortCode,
    PhoneNumber: phone,
    CallBackURL: CALLBACK_URL,
    AccountReference: accountRef.slice(0, 12),
    TransactionDesc: transactionDesc.slice(0, 13),
  }

  console.log(`📱 Sending STK Push to ${phone} for KES ${amount}`)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  const data = await response.json()
  console.log('STK Response:', JSON.stringify(data, null, 2))
  
  return data
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Parse request body
    const { phoneNumber, amount, courseName, courseId, userId } = await req.json()

    console.log('📥 Payment request:', { phoneNumber, amount, courseName, courseId, userId })

    // Validate required fields
    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!amount || amount < 1) {
      return new Response(
        JSON.stringify({ error: 'Valid amount is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (amount > 150000) {
      return new Response(
        JSON.stringify({ error: 'Amount cannot exceed 150,000 KES' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format phone number
    let formattedPhone: string
    try {
      formattedPhone = formatPhoneNumber(phoneNumber)
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare transaction details
    const accountRef = courseName || 'Course Enrollment'
    const transactionDesc = courseName ? `Enroll: ${courseName}` : 'Course Enrollment'

    // Initiate STK Push
    const result = await stkPush(formattedPhone, amount, accountRef, transactionDesc)

    // Save transaction to database if userId provided
    if (userId && result.CheckoutRequestID) {
      const supabase = createClient(
        SUPABASE_URL,
        Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      
      const transactionId = generateTransactionId()
      
      await supabase.from('mpesa_transactions').insert({
        user_id: userId,
        transaction_id: transactionId,
        phone_number: formattedPhone,
        amount: amount,
        course_id: courseId,
        course_name: courseName,
        checkout_request_id: result.CheckoutRequestID,
        merchant_request_id: result.MerchantRequestID,
        status: result.ResponseCode === '0' ? 'pending' : 'failed',
        response_code: result.ResponseCode,
        response_description: result.ResponseDescription,
        created_at: new Date().toISOString(),
      })
    }

    // Check if STK Push was successful
    if (result.ResponseCode !== '0') {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.ResponseDescription || 'STK Push failed',
          responseCode: result.ResponseCode,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'STK Push sent. Check your phone.',
        checkoutRequestId: result.CheckoutRequestID,
        merchantRequestId: result.MerchantRequestID,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error:', error.message)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
