import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import paymentRoutes from './routes/payments.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration - Allow frontend to access backend
app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000', 'https://meidriveafrica.com', 'https://www.meidriveafrica.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware to parse JSON requests
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'OK',
        message: 'MEI DRIVE AFRICA API is running - PRODUCTION MODE',
        environment: 'PRODUCTION',
        mpesa: 'LIVE - REAL MONEY',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: 'GET /api/health',
            mpesaTest: 'GET /api/payments/mpesa/test',
            mpesaInitiate: 'POST /api/payments/mpesa/initiate',
            mpesaStatus: 'POST /api/payments/mpesa/status',
            mpesaCallback: 'POST /api/payments/mpesa/callback'
        },
        warning: '⚠️ REAL MONEY - Production mode active'
    });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'Backend is working in PRODUCTION mode!',
        environment: 'PRODUCTION',
        mpesa: 'LIVE - Real transactions will deduct money',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// M-PESA PAYMENT ROUTES (LIVE PRODUCTION)
// ============================================
app.use('/api/payments', paymentRoutes);

// ============================================
// 404 HANDLER - Route not found
// ============================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        message: `Cannot ${req.method} ${req.url}`
    });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║     🚗 MEI DRIVE AFRICA - PRODUCTION BACKEND API                 ║
║                                                                   ║
║     Status: ✅ RUNNING                                            ║
║     Port: ${PORT}                                                   ║
║     Environment: PRODUCTION                                       ║
║     M-Pesa Mode: LIVE - REAL MONEY                                ║
║                                                                   ║
║     ⚠️  WARNING: Real money will be deducted!                     ║
║                                                                   ║
║     API Endpoints:                                                ║
║     • Health:      GET  http://localhost:${PORT}/api/health         ║
║     • Test:        GET  http://localhost:${PORT}/api/test           ║
║     • M-Pesa Test: GET  http://localhost:${PORT}/api/payments/mpesa/test ║
║     • Initiate:    POST http://localhost:${PORT}/api/payments/mpesa/initiate ║
║                                                                   ║
║     Real M-Pesa Production:                                       ║
║     • Paybill: 4095377                                            ║
║     • Real customer phone numbers only                            ║
║     • Real money will be deducted                                 ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
    `);
});

export default app;
