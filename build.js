import esbuild from 'esbuild';
import fs from 'fs';

// Clean dist
if (fs.existsSync('public')) {
    fs.rmSync('public', { recursive: true, force: true });
}
fs.mkdirSync('public', { recursive: true });

// Copy HTML files
const htmlFiles = ['index.html', 'login.html', 'register.html', 'dashboard.html', 'admin-login.html', 'admin-dashboard.html'];
htmlFiles.forEach(file => {
    if (fs.existsSync(file)) {
        fs.copyFileSync(file, `public/${file}`);
        console.log(`✅ Copied: ${file}`);
    }
});

console.log('✅ Build complete!');
