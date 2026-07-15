import fs from 'node:fs';
import path from 'node:path';

const domain = process.argv[2]?.replace(/\/$/, '');
if (!domain || !/^https:\/\//.test(domain)) {
  console.error('Usage: npm run set-domain -- https://your-domain.example');
  process.exit(1);
}
const root = process.cwd();
const files = fs.readdirSync(root).filter((name) => /\.(?:html|xml|txt)$/.test(name));
let changed = 0;
for (const name of files) {
  const file = path.join(root, name);
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replaceAll('https://alicapafoto.github.io', domain);
  if (after !== before) { fs.writeFileSync(file, after); changed += 1; }
}
console.log(`Updated ${changed} files to ${domain}`);
