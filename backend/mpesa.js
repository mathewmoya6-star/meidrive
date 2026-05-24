const axios = require('axios');
const config = require('./config');

class MpesaAPI {
    constructor() {
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    // Get OAuth Token
    async getAccessToken() {
        // Check if token is still valid
        if (this.accessToken && this.tokenExpiry > Date.now()) {
            return this.accessToken;
        }

        const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');
        const url = config.apiUrls[config.environment].auth;

        try {
            const response = await axios.get(url, {
                headers: {
                    Authorization: `Basic ${auth}`
                }
            });
            
            this.accessToken = response.data.access_token;
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
            return this.accessToken;
        } catch (error) {
            console.error('Error getting access token:', error.response?.data || error.message);
            throw new Error('Failed to get access token');
        }
    }

    // Generate timestamp
    getTimestamp() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}${hours}${minutes}${seconds}`;
    }

    // Generate password
    getPassword(shortCode, passkey, timestamp) {
        const str = `${shortCode}${passkey}${timestamp}`;
        return Buffer.from(str).toString('base64');
    }

    // STK Push (Lipa Na M-Pesa)
    async stkPush(phoneNumber, amount, accountReference, transactionDesc) {
        try {
            const token = await this.getAccessToken();
            const timestamp = this.getTimestamp();
            const password = this.getPassword(config.shortCode, config.passkey, timestamp);
            
            // Format phone number: 254XXXXXXXXX
            let formattedPhone = phoneNumber.replace(/\D/g, '');
            if (formattedPhone.startsWith('0')) {
                formattedPhone = '254' + formattedPhone.substring(1);
            } else if (formattedPhone.startsWith('+')) {
                formattedPhone = formattedPhone.substring(1);
            }

            const requestBody = {
                BusinessShortCode: config.shortCode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerPayBillOnline',
                Amount: Math.round(parseFloat(amount)),
                PartyA: formattedPhone,
                PartyB: config.shortCode,
                PhoneNumber: formattedPhone,
                CallBackURL: config.callbackUrl,
                AccountReference: accountReference,
                TransactionDesc: transactionDesc
            };

            const response = await axios.post(
                config.apiUrls[config.environment].stkPush,
                requestBody,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                data: response.data,
                checkoutRequestID: response.data.CheckoutRequestID
            };
        } catch (error) {
            console.error('STK Push Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    // Query STK Push Status
    async queryStatus(checkoutRequestID) {
        try {
            const token = await this.getAccessToken();
            const timestamp = this.getTimestamp();
            const password = this.getPassword(config.shortCode, config.passkey, timestamp);

            const requestBody = {
                BusinessShortCode: config.shortCode,
                Password: password,
                Timestamp: timestamp,
                CheckoutRequestID: checkoutRequestID
            };

            const response = await axios.post(
                config.apiUrls[config.environment].stkQuery,
                requestBody,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Query Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }
}

module.exports = new MpesaAPI();
