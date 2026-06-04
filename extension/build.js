import { execSync } from 'child_process';
import fs from 'fs';

console.log('Cleaning dist directory...');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}

console.log('Building content script...');
execSync('npx vite build --config vite.content.config.js', { stdio: 'inherit' });

console.log('Building popup page...');
execSync('npx vite build --config vite.popup.config.js', { stdio: 'inherit' });

console.log('Build completed successfully!');
