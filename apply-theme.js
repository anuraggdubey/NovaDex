const fs = require('fs');
const path = require('path');

const clientAppPath = path.join(__dirname, 'src', 'app', 'client-app.tsx');
const layoutPath = path.join(__dirname, 'src', 'app', 'layout.tsx');
const globalsCssPath = path.join(__dirname, 'src', 'app', 'globals.css');

const replacements = [
  // Backgrounds
  { from: /bg-\[#0A0F1E\]/g, to: 'bg-slate-50' },
  { from: /bg-\[#111827\]/g, to: 'bg-white' },
  { from: /bg-\[#1F2937\]/g, to: 'bg-gray-100' },
  { from: /bg-\[#374151\]/g, to: 'bg-gray-200' },
  { from: /bg-\[#1E1B4B\]/g, to: 'bg-emerald-50' },
  { from: /bg-\[#6366F1\]/g, to: 'bg-emerald-600' },
  { from: /hover:bg-\[#4F46E5\]/g, to: 'hover:bg-emerald-700' },
  { from: /hover:bg-\[#1F2937\]/g, to: 'hover:bg-gray-100' },
  { from: /hover:bg-\[#374151\]/g, to: 'hover:bg-gray-200' },
  
  // Borders
  { from: /border-\[#1F2937\]/g, to: 'border-gray-200' },
  { from: /border-\[#374151\]/g, to: 'border-gray-300' },
  { from: /hover:border-\[#818CF8\]/g, to: 'hover:border-emerald-500' },
  { from: /hover:border-\[#374151\]/g, to: 'hover:border-gray-300' },

  // Text Colors
  { from: /text-\[#F9FAFB\]/g, to: 'text-slate-900' },
  { from: /text-\[#9CA3AF\]/g, to: 'text-slate-500' },
  { from: /text-\[#6B7280\]/g, to: 'text-slate-400' },
  { from: /text-\[#818CF8\]/g, to: 'text-emerald-600' },
  { from: /text-\[#6366F1\]/g, to: 'text-emerald-600' },
  { from: /hover:text-\[#F9FAFB\]/g, to: 'hover:text-slate-900' },
  { from: /hover:text-\[#818CF8\]/g, to: 'hover:text-emerald-600' },
  { from: /text-white/g, to: 'text-white' }, // Keep button texts white

  // Layout Specific
  { from: /text-white/g, to: 'text-slate-900' }, // For layout.tsx body
];

function applyReplacements(filePath, isLayout = false) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  replacements.forEach(r => {
    // Skip general text-white to text-slate-900 replacement in client-app as we want button text to stay white
    if (!isLayout && r.from.toString() === '/text-white/g') return;
    content = content.replace(r.from, r.to);
  });
  
  // Specific tweaks to make UI more premium
  if (!isLayout) {
    // Soften shadows on cards
    content = content.replace(/shadow-xl/g, 'shadow-sm');
    content = content.replace(/shadow-2xl/g, 'shadow-lg');
    // Increase rounding
    content = content.replace(/rounded-2xl/g, 'rounded-3xl');
    content = content.replace(/rounded-xl/g, 'rounded-2xl');
    
    // Landing page hero specific edits for bold typography
    content = content.replace(
      /text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-\[#F9FAFB\] to-\[#9CA3AF\]/g,
      'text-6xl md:text-8xl font-black tracking-tighter text-slate-900'
    );
    content = content.replace(
      /text-xl text-\[#9CA3AF\]/g,
      'text-2xl text-slate-500 font-medium tracking-tight'
    );
    
    // Gradient backgrounds
    content = content.replace(
      /absolute inset-0 bg-\[radial-gradient\(ellipse_at_top_right,_var\(--tw-gradient-stops\)\)\] from-\[#1E1B4B\]\/40 via-\[#0A0F1E\] to-\[#0A0F1E\]/g,
      'absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-emerald-50/50'
    );
    content = content.replace(
      /absolute inset-0 bg-\[radial-gradient\(circle_at_center,_var\(--tw-gradient-stops\)\)\] from-\[#6366F1\]\/10 via-transparent to-transparent/g,
      'absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent'
    );
  }

  if (isLayout) {
    content = content.replace(/bg-\[#0A0F1E\]/g, 'bg-slate-50');
    content = content.replace(/selection:bg-\[#6366F1\]\/30/g, 'selection:bg-emerald-500/30');
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${filePath}`);
}

applyReplacements(clientAppPath, false);
applyReplacements(layoutPath, true);

// Update globals.css to import Plus Jakarta Sans and set background
if (fs.existsSync(globalsCssPath)) {
  let css = fs.readFileSync(globalsCssPath, 'utf8');
  if (!css.includes('Plus+Jakarta+Sans')) {
    css = `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');\n` + css;
  }
  // Change default body background from dark to light
  css = css.replace(/body\s*{[^}]*}/, `body {
  background-color: #f8fafc; /* slate-50 */
  color: #0f172a; /* slate-900 */
  font-family: 'Plus Jakarta Sans', sans-serif;
}`);
  
  // Also apply font-family globally to Tailwind components
  css = css.replace(/@layer base {/, `@layer base {\n  html {\n    font-family: 'Plus Jakarta Sans', sans-serif;\n  }\n`);
  
  fs.writeFileSync(globalsCssPath, css, 'utf8');
  console.log(`Updated ${globalsCssPath}`);
}

console.log('UI Theme applied successfully! Check your browser.');
