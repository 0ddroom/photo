import { access, readFile } from 'node:fs/promises';

const requiredFiles = [
  'index.html',
  'admin/index.html',
  'app/config.js',
  'app/main.js',
  'app/admin.js',
  'app/styles.css',
  'supabase/migrations/20260528000000_photo_gallery.sql',
  'supabase/functions/admin-photos/index.ts',
];

for (const file of requiredFiles) {
  await access(file);
}

const indexHtml = await readFile('index.html', 'utf8');
const adminHtml = await readFile('admin/index.html', 'utf8');

if (!indexHtml.includes('./app/main.js')) {
  throw new Error('index.html does not load app/main.js');
}

if (!adminHtml.includes('../app/admin.js')) {
  throw new Error('admin/index.html does not load app/admin.js');
}

console.log(`Static verification passed (${requiredFiles.length} files checked).`);
