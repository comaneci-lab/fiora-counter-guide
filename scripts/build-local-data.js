// data/matchups/*.json を data/matchups.json と data/guide-data.js にまとめる
// guide-data.js は file:// で index.html を直接開くときに使う
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const matchupsDir = path.join(dataDir, 'matchups');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const matchups = {};
const sources = {};
for (const name of fs.readdirSync(matchupsDir).filter((file) => file.endsWith('.json')).sort()) {
  const entries = readJson(path.join(matchupsDir, name));
  if (!isObject(entries)) throw new Error(`${name}: 最上位がオブジェクトではありません`);
  for (const [key, value] of Object.entries(entries)) {
    if (!isObject(value)) throw new Error(`${name}: "${key}" の値がオブジェクトではありません`);
    if (key in matchups) throw new Error(`"${key}" が ${sources[key]} と ${name} で重複しています`);
    matchups[key] = value;
    sources[key] = name;
  }
}

const categories = readJson(path.join(dataDir, 'categories.json'));
fs.writeFileSync(path.join(dataDir, 'matchups.json'), `${JSON.stringify(matchups, null, 2)}\n`);
fs.writeFileSync(
  path.join(dataDir, 'guide-data.js'),
  `window.FIORA_GUIDE_DATA = ${JSON.stringify({ categories, matchups }, null, 2)};\n`
);
console.log(`${Object.keys(matchups).length}件のガイドを data/matchups.json と data/guide-data.js に出力しました`);
