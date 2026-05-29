const API_URL = 'http://localhost:3000';

let pollingInterval = null;

// Load transactions on page load
async function loadTransactions() {
    try {
        const response = await fetch(`${API_URL}/api/transactions`);
        const data = await response.json();
        
        if (data.success && data.transactions.length > 0) {
            renderTransactions(data.transactions.reverse());
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

function renderTransactions(transactions) {
    const container = document.getElementById('transactions');
    if (transactions.length === 0) {
        container.innerHTML = '<p style="color:#999;">No transactions yet</p>';
        return;
    }
    
    container.innerHTML = transactions.map(tx => `
        <div class="transaction-item">
            <div><strong>${tx.accountReference}</strong></div>
            <div class="transaction-amount">KES ${tx.amount}</div>
            <div>${tx.phoneNumber}</div>
            <div class="transaction-status ${tx.status}">${tx.status.toUpperCase()}</div>
            <div style="font-size:11px; color:#999;">${new Date(tx.timestamp).toLocaleString()}</div>
        </div>
    `).join('');
}

function updateStatus(message, type = 'waiting') {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status-box ${type}`;
}

async function checkPaymentStatus(checkoutRequestID) {
    try {
        const response = await fetch(`${API_URL}/api/payment/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ checkoutRequestID })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (data.status === 'completed') {
                updateStatus('✅ Payment completed successfully!', 'success');
                if (pollingInterval) {
                    clearInterval(pollingInterval);
                    pollingInterval = null;
                }
                loadTransactions();
                return true;
            } else if (data.status === 'failed') {
                updateStatus(`❌ Payment failed: ${data.message}`, 'error');
                if (pollingInterval) {
                    clearInterval(pollingInterval);
                    pollingInterval = null;
                }
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Status check error:', error);
        return false;
    }
}

document.getElementById('paymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const phone = document.getElementById('phone').value;
    const amount = document.getElementById('amount').value;
    const accountRef = document.getElementById('accountRef').value;
    const description = document.getElementById('description').value || 'Payment';
    
    // Format phone number
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '254' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('254')) {
        formattedPhone = '254' + formattedPhone;
    }
    
    const payBtn = document.getElementById('payBtn');
    payBtn.disabled = true;
    payBtn.textContent = 'Processing...';
    updateStatus('⏳ Sending STK Push... Please check your phone.', 'pending');
    
    try {
        const response = await fetch(`${API_URL}/api/payment/stkpush`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phoneNumber: formattedPhone,
                amount: parseFloat(amount),
                accountReference: accountRef,
                transactionDesc: description
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateStatus('📱 STK Push sent! Enter your PIN on the phone.', 'pending');
            
            // Poll for status every 3 seconds for 30 seconds
            let attempts = 0;
            if (pollingInterval) clearInterval(pollingInterval);
            
            pollingInterval = setInterval(async () => {
                attempts++;
                const completed = await checkPaymentStatus(data.checkoutRequestID);
                if (completed || attempts > 15) {
                    if (attempts > 15 && !completed) {
                        updateStatus('⏰ Payment timeout. Please check transaction status.', 'error');
                    }
                    clearInterval(pollingInterval);
                    pollingInterval = null;
                }
            }, 3000);
            
            // Load updated transactions
            setTimeout(() => loadTransactions(), 2000);
        } else {
            updateStatus(`❌ Error: ${data.error?.errorMessage || data.error}`, 'error');
        }
    } catch (error) {
        console.error('Payment error:', error);
        updateStatus('❌ Network error. Please try again.', 'error');
    } finally {
        payBtn.disabled = false;
        payBtn.textContent = '💳 Pay with M-Pesa';
    }
});

// Load config and transactions on start
loadTransactions();
