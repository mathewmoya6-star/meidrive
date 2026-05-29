import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import paymentRoutes from './routes/payments.js';

dotenv.config();

const app = express();

// Render.com uses PORT environment variable (defaults to 10000)
const PORT = process.env.PORT || 10000;

// Production Backend URL - CORRECT Render.com URL
const BACKEND_URL = process.env.BACKEND_URL || 'https://meidriveafrica-backend.onrender.com';

// CORS configuration - Allow frontend to access backend
app.use(cors({
    origin: [
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:3000',
        'https://meidriveafrica.com',
        'https://www.meidriveafrica.com',
        'https://meidriveafrica-backend.onrender.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware to parse JSON requests
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// HEALTH CHECK ENDPOINT (For Render.com)
// ============================================
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: 'production'
    });
});

// ============================================
// MAIN HEALTH CHECK ENDPOINT
// ============================================
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'OK',
        message: 'MEI DRIVE AFRICA API is running - PRODUCTION MODE',
        environment: 'PRODUCTION',
        mpesa: 'LIVE - REAL MONEY',
        backend_url: BACKEND_URL,
        port: PORT,
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
        backend_url: BACKEND_URL,
        timestamp: new Date().toISOString()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'MEI DRIVE AFRICA API',
        version: '2.0.0',
        status: 'running',
        environment: 'production',
        endpoints: '/api/health, /api/payments/mpesa/test'
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
        message: `Cannot ${req.method} ${req.url}`,
        available_endpoints: [
            'GET /',
            'GET /health',
            'GET /api/health',
            'GET /api/test',
            'GET /api/payments/mpesa/test',
            'POST /api/payments/mpesa/initiate',
            'POST /api/payments/mpesa/status',
            'POST /api/payments/mpesa/callback'
        ]
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
// START SERVER - Bind to all interfaces for Render
// ============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║     🚗 MEI DRIVE AFRICA - PRODUCTION BACKEND API                 ║
║                                                                   ║
║     Status: ✅ RUNNING                                            ║
║     Port: ${PORT}                                                   ║
║     Environment: PRODUCTION                                       ║
║     M-Pesa Mode: LIVE - REAL MONEY                                ║
║     Backend URL: ${BACKEND_URL}                                     ║
║                                                                   ║
║     ⚠️  WARNING: Real money will be deducted!                     ║
║                                                                   ║
║     API Endpoints:                                                ║
║     • Health:      GET  ${BACKEND_URL}/api/health                   ║
║     • Test:        GET  ${BACKEND_URL}/api/test                     ║
║     • M-Pesa Test: GET  ${BACKEND_URL}/api/payments/mpesa/test      ║
║     • Initiate:    POST ${BACKEND_URL}/api/payments/mpesa/initiate  ║
║                                                                   ║
║     Real M-Pesa Production:                                       ║
║     • Paybill: 4095377                                            ║
║     • Real customer phone numbers only                            ║
║     • Real money will be deducted                                 ║
║     • Minimum payment: 49 KES                                     ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
    `);
});

export default app;
