const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// MIDDLEWARE
// =====================================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from project root
app.use(express.static(__dirname));

// =====================================================
// API ROUTES (Optional - for additional backend endpoints)
// =====================================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'MEI DRIVE AFRICA API is running',
    timestamp: new Date().toISOString()
  });
});

// Environment info endpoint (useful for debugging)
app.get('/api/config', (req, res) => {
  res.json({
    appName: 'MEI DRIVE AFRICA',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    supabaseConfigured: !!process.env.SUPABASE_URL || true // Note: supabase.js has hardcoded credentials
  });
});

// =====================================================
// SPA ROUTING - Handle all frontend routes
// =====================================================

// List of valid HTML files (without .html extension)
const routes = [
  '',                    // index
  'index',
  'course',
  'unit',
  'quiz-bank',
  'admin-login',
  'admin-dashboard',
  'reset-password',
  'update-password'
];

// Handle route requests
app.get('*', (req, res) => {
  let requestPath = req.path.slice(1); // Remove leading slash
  
  // Remove query parameters if any
  requestPath = requestPath.split('?')[0];
  
  // If empty path or requestPath is in routes, serve the corresponding HTML
  if (!requestPath || routes.includes(requestPath)) {
    const fileName = !requestPath || requestPath === 'index' ? 'index.html' : `${requestPath}.html`;
    const filePath = path.join(__dirname, fileName);
    
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
      return;
    }
  }
  
  // Check if the requested file exists
  const fullPath = path.join(__dirname, requestPath);
  
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    res.sendFile(fullPath);
  } else {
    // For API routes that aren't handled, return 404
    if (requestPath.startsWith('api/')) {
      res.status(404).json({ error: 'API endpoint not found' });
    } else {
      // For frontend routes not found, serve 404.html or fallback
      const notFoundPath = path.join(__dirname, '404.html');
      if (fs.existsSync(notFoundPath)) {
        res.status(404).sendFile(notFoundPath);
      } else {
        res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head><title>404 - Page Not Found</title></head>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1>404 - Page Not Found</h1>
            <p>The page you're looking for doesn't exist.</p>
            <a href="/">Go back to MEI DRIVE AFRICA</a>
          </body>
          </html>
        `);
      }
    }
  }
});

// =====================================================
// ERROR HANDLING MIDDLEWARE
// =====================================================
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// =====================================================
// START SERVER
// =====================================================
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
    🚀 MEI DRIVE AFRICA Server Running
    =================================
    📡 URL: http://localhost:${PORT}
    🌍 Environment: ${process.env.NODE_ENV || 'development'}
    📁 Static files: ${__dirname}
    
    ✅ Frontend: http://localhost:${PORT}
    ✅ Health Check: http://localhost:${PORT}/api/health
    ✅ Config: http://localhost:${PORT}/api/config
    `);
  });
}

// Export for Vercel or other serverless platforms
module.exports = app;
