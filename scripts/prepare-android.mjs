import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const clientDir = path.join(rootDir, 'dist', 'client');
const cssDir = path.join(clientDir, '_next', 'static', 'css');
const indexPath = path.join(clientDir, 'index.html');

console.log('--- Preparing Android Web Assets ---');

if (!fs.existsSync(indexPath)) {
  console.error('Error: dist/client/index.html not found. Run "npm run build" first.');
  process.exit(1);
}

// 1. Find CSS files in dist/client/_next/static/css
let combinedCss = '';
if (fs.existsSync(cssDir)) {
  const cssFiles = fs.readdirSync(cssDir).filter(file => file.endsWith('.css'));
  for (const file of cssFiles) {
    const filePath = path.join(cssDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    combinedCss += `\n/* Inlined from ${file} */\n` + content;
    console.log(`Found CSS file: ${file} (${(content.length / 1024).toFixed(1)} KB)`);
  }
}

if (!combinedCss) {
  console.warn('Warning: No CSS files found in _next/static/css');
}

// 2. Also copy to root level dist/client/app.css (no underscore in path)
if (combinedCss) {
  const fallbackCssPath = path.join(clientDir, 'app.css');
  fs.writeFileSync(fallbackCssPath, combinedCss, 'utf8');
  console.log(`Created root CSS fallback at dist/client/app.css`);
}

// 3. Inject inlined style block into index.html head
let html = fs.readFileSync(indexPath, 'utf8');

// Remove any existing injected block if re-running
html = html.replace(/<style id="oduu-inlined-styles">[\s\S]*?<\/style>/g, '');
html = html.replace(/<link rel="stylesheet" href="app\.css"[\s\S]*?>/g, '');

const injection = `
<style id="oduu-inlined-styles">
${combinedCss}
</style>
<link rel="stylesheet" href="app.css" />
`;

if (html.includes('</head>')) {
  html = html.replace('</head>', `${injection}\n</head>`);
} else if (html.includes('<body')) {
  html = html.replace('<body', `${injection}\n<body`);
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log(`Successfully injected ${((combinedCss.length) / 1024).toFixed(1)} KB of inlined CSS into index.html!`);

// 4. Also handle 404.html if it exists
const notFoundPath = path.join(clientDir, '404.html');
if (fs.existsSync(notFoundPath)) {
  let notFoundHtml = fs.readFileSync(notFoundPath, 'utf8');
  notFoundHtml = notFoundHtml.replace(/<style id="oduu-inlined-styles">[\s\S]*?<\/style>/g, '');
  notFoundHtml = notFoundHtml.replace(/<link rel="stylesheet" href="app\.css"[\s\S]*?>/g, '');
  if (notFoundHtml.includes('</head>')) {
    notFoundHtml = notFoundHtml.replace('</head>', `${injection}\n</head>`);
  }
  fs.writeFileSync(notFoundPath, notFoundHtml, 'utf8');
  console.log('Successfully injected inlined CSS into 404.html!');
}

console.log('Android web assets prepared successfully!');
