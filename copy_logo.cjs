const fs = require('fs');
const path = require('path');

const src = 'C:\\Users\\dandidce\\.gemini\\antigravity-ide\\brain\\2b20c9ed-69c4-41db-8212-cc82f8885e99\\chat_bubble_wa_green_1783419178677.png';
const destDir = path.join(__dirname, 'public');
const dest = path.join(destDir, 'logo.png');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.copyFileSync(src, dest);
console.log('New WA-themed logo copied to public/logo.png');
