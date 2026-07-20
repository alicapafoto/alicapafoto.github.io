import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const htmlFiles = fs.readdirSync(root).filter((name) => name.endsWith('.html'));
const errors = [];

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of html.matchAll(/(?:src|href)=["']([^"'#?]+)["']/g)) {
    const target = match[1];
    if (/^(?:https?:|mailto:|tel:|data:)/.test(target)) continue;
    const resolved = path.resolve(root, target);
    if (!fs.existsSync(resolved)) errors.push(`${file}: missing ${target}`);
  }
  if (!/<title>[^<]+<\/title>/i.test(html)) errors.push(`${file}: missing title`);
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) errors.push(`${file}: missing viewport`);
}


const headers = fs.readFileSync(path.join(root, '_headers'), 'utf8');
if (headers.includes("'unsafe-inline'")) errors.push('_headers: unsafe-inline remains in CSP');
for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  if (/<style(?:\s|>)/i.test(html)) errors.push(`${file}: inline style block remains`);
  if (/style=["']/i.test(html)) errors.push(`${file}: inline style attribute remains`);
  if (/<script>(?:.|\n)*?<\/script>/i.test(html)) errors.push(`${file}: inline executable script remains`);
  if (html.includes('—')) errors.push(`${file}: public em dash remains`);
}
for (const file of ['catalog/prints.js', 'storefront.js']) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  if (content.includes('—')) errors.push(`${file}: public em dash remains`);
}
for (const file of ['index-page.css', 'about-page.css', 'artworks-page.css', 'support-page.css', 'privacy-page.css', 'terms-page.css', 'index-page.js', 'artworks-page.js']) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`missing ${file}`);
}

const required = [
  'functions/api/catalog.js',
  'functions/api/quote.js',
  'functions/api/create-checkout.js',
  'functions/api/stripe-webhook.js',
  'storefront.js',
  'storefront.css',
  '_headers',
];
for (const file of required) if (!fs.existsSync(path.join(root, file))) errors.push(`missing ${file}`);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Validated ${htmlFiles.length} HTML files and storefront scaffolding.`);
