// supabase/functions/mpesa-stkpush/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// ---------- CORS headers ----------
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// ---------- In‑memory token cache ----------
let cachedToken: string | null = null
let tokenExpiry: number | null = null

// ---------- Helper: Get access token with caching ----------
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && tokenExpiry && tokenExpiry > Date.now()) {
    return cachedToken
  }

  const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY')
  const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET')
  if (!consumerKey || !consumerSecret) {
    throw new Error('MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET are required')
  }

  const auth = btoa(`${consumerKey}:${consumerSecret}`)
  const isProduction = Deno.env.get('MPESA_ENV') === 'production'
  const url = isProduction
    ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'

  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Basic ${auth}` },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to get access token: ${errorText}`)
  }

  const data = await response.json()
  cachedToken = data.access_token
  // Expire 1 minute before actual expiry to be safe
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000
  return cachedToken
}

// ---------- Helper: Generate timestamp (YYYYMMDDHHmmss) ----------
function getTimestamp(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}${hours}${minutes}${seconds}`
}

// ---------- Helper: Format phone number to 254XXXXXXXXX ----------
function formatPhoneNumber(raw: string): string {
  let cleaned = raw.replace(/\D/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1)
  } else if (cleaned.startsWith('+254')) {
    cleaned = '254' + cleaned.substring(4)
  } else if (cleaned.length === 9) {
    cleaned = '254' + cleaned
  }
  return cleaned
}

// ---------- STK Push Request ----------
async function stkPush(
  phone: string,
  amount: number,
  accountRef: string,
  desc: string
): Promise<any> {
  const token = await getAccessToken()
  const shortCode = Deno.env.get('MPESA_SHORTCODE')
  const passkey = Deno.env.get('MPESA_PASSKEY')
  const callbackUrl = Deno.env.get('MPESA_CALLBACK_URL')

  if (!shortCode || !passkey || !callbackUrl) {
    throw new Error('MPESA_SHORTCODE, MPESA_PASSKEY, and MPESA_CALLBACK_URL are required')
  }

  const timestamp = getTimestamp()
  const password = btoa(`${shortCode}${passkey}${timestamp}`)

  const isProduction = Deno.env.get('MPESA_ENV') === 'production'
  const url = isProduction
    ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
    : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'

  const requestBody = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(amount),
    PartyA: phone,
    PartyB: shortCode,
    PhoneNumber: phone,
    CallBackURL: callbackUrl,
    AccountReference: accountRef.slice(0, 12),
    TransactionDesc: desc.slice(0, 13),
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  const data = await response.json()
  return data
}

// ---------- Main handler ----------
serve(async (req: Request) => {
  // Handle preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phoneNumber, amount, courseName, userId } = await req.json()

    // Validation
    if (!phoneNumber || !amount) {
      return new Response(
        JSON.stringify({ error: 'Phone number and amount are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const numericAmount = Number(amount)
    if (isNaN(numericAmount) || numericAmount < 1 || numericAmount > 150000) {
      return new Response(
        JSON.stringify({ error: 'Amount must be between 1 and 150,000 KES' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const formattedPhone = formatPhoneNumber(phoneNumber)
    const result = await stkPush(
      formattedPhone,
      numericAmount,
      courseName || 'Course',
      `Payment for ${courseName || 'Course'}`
    )

    // If a userId is provided, store the transaction in Supabase
    if (userId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!
      )
      await supabase.from('mpesa_transactions').insert({
        user_id: userId,
        phone_number: formattedPhone,
        amount: numericAmount,
        account_reference: courseName,
        checkout_request_id: result.CheckoutRequestID,
        merchant_request_id: result.MerchantRequestID,
        status: 'pending',
        response_code: result.ResponseCode,
        response_desc: result.ResponseDescription,
        created_at: new Date().toISOString(),
      })
    }

    // Check if STK Push was successfully initiated
    if (result.ResponseCode !== '0') {
      return new Response(
        JSON.stringify({ success: false, error: result.ResponseDescription }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'STK Push sent. Check your phone.',
        checkoutRequestId: result.CheckoutRequestID,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Unhandled error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
