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
