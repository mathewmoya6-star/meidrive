// supabase/functions/mpesa-stkpush/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function formatPhoneNumber(phone: string): string {
  let formatted = phone.replace(/\D/g, '')
  if (formatted.startsWith('0')) {
    formatted = '254' + formatted.substring(1)
  } else if (formatted.startsWith('+254')) {
    formatted = '254' + formatted.substring(4)
  } else if (formatted.length === 9) {
    formatted = '254' + formatted
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

async function getAccessToken(): Promise<string> {
  const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY')
  const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET')
  
  if (!consumerKey || !consumerSecret) {
    throw new Error('MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET are required')
  }
  
  const auth = btoa(`${consumerKey}:${consumerSecret}`)
  const url = Deno.env.get('MPESA_ENV') === 'production'
    ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'

  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Basic ${auth}` },
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get access token: ${error}`)
  }
  
  const data = await response.json()
  return data.access_token
}

async function stkPush(phone: string, amount: number, accountRef: string, desc: string) {
  const token = await getAccessToken()
  const shortCode = Deno.env.get('MPESA_SHORTCODE')
  const passkey = Deno.env.get('MPESA_PASSKEY')
  const callbackUrl = Deno.env.get('MPESA_CALLBACK_URL')
  
  if (!shortCode || !passkey || !callbackUrl) {
    throw new Error('MPESA_SHORTCODE, MPESA_PASSKEY, and MPESA_CALLBACK_URL are required')
  }

  const timestamp = getTimestamp()
  const password = btoa(`${shortCode}${passkey}${timestamp}`)

  const url = Deno.env.get('MPESA_ENV') === 'production'
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phoneNumber, amount, courseName, userId } = await req.json()

    if (!phoneNumber || !amount) {
      return new Response(
        JSON.stringify({ error: 'Phone number and amount are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (amount < 1 || amount > 150000) {
      return new Response(
        JSON.stringify({ error: 'Amount must be between 1 and 150,000 KES' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const formattedPhone = formatPhoneNumber(phoneNumber)
    const result = await stkPush(formattedPhone, amount, courseName || 'Course', `Payment for ${courseName || 'Course'}`)

    if (userId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!
      )
      
      await supabase.from('mpesa_transactions').insert({
        user_id: userId,
        phone_number: formattedPhone,
        amount: amount,
        account_reference: courseName,
        checkout_request_id: result.CheckoutRequestID,
        merchant_request_id: result.MerchantRequestID,
        status: 'pending',
        response_code: result.ResponseCode,
        response_desc: result.ResponseDescription,
        created_at: new Date().toISOString(),
      })
    }

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
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
