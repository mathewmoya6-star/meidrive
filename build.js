// build.js - Simple build script for MEI DRIVE AFRICA
const fs = require('fs');
const path = require('path');

console.log('🚀 Building MEI DRIVE AFRICA...');

// Ensure dist directory exists
if (!fs.existsSync('./dist')) {
    fs.mkdirSync('./dist');
}

// Files to copy to dist
const filesToCopy = [
    'index.html',
    'course.html',
    'unit.html',
    'quiz-bank.html',
    'admin-login.html',
    'admin-dashboard.html',
    'reset-password.html',
    'update-password.html',
    'supabase.js',
    '404.html',
    'manifest.json',
    'robots.txt',
    'sitemap.xml',
    'sw.js'
];

// Copy each file
filesToCopy.forEach(file => {
    if (fs.existsSync(file)) {
        fs.copyFileSync(file, path.join('./dist', file));
        console.log(`✅ Copied: ${file}`);
    } else {
        console.log(`⚠️ Not found: ${file}`);
    }
});

// Create dist/_redirects for SPA routing
const redirects = `/* /index.html 200`;
fs.writeFileSync('./dist/_redirects', redirects);
console.log('✅ Created _redirects');

console.log('🎉 Build complete! Output in ./dist');
