/* Reads every Baseball Savant game file in games-raw/ and writes the small files the site loads:
     public/games/<game number>.json   one compact file per game
     public/games/manifest.json        the list shown in the game picker
   Vercel runs this on every deploy (see vercel.json). It never stops the deploy for one bad file. */
const fs = require('fs');
const path = require('path');
const { parseSavant } = require('../public/core.js');

const root = path.join(__dirname, '..');
const rawDir = path.join(root, 'games-raw');
const outDir = path.join(root, 'public', 'games');

function parseLoose(text) {
  try { return JSON.parse(text); } catch (e) {
    const a = text.indexOf('{'), b = text.lastIndexOf('}');
    if (a >= 0 && b > a) return JSON.parse(text.slice(a, b + 1));
    throw e;
  }
}

let labels = {};
try { labels = JSON.parse(fs.readFileSync(path.join(rawDir, 'labels.json'), 'utf8')); } catch (e) { /* labels are optional */ }

fs.mkdirSync(outDir, { recursive: true });
fs.readdirSync(outDir).forEach((f) => { if (/\.json$/.test(f)) fs.unlinkSync(path.join(outDir, f)); });

const games = {};
const files = fs.existsSync(rawDir) ? fs.readdirSync(rawDir).sort() : [];
files.forEach((f) => {
  if (f === 'labels.json' || !/\.(json|html|txt)$/i.test(f)) return;
  try {
    const g = parseSavant(parseLoose(fs.readFileSync(path.join(rawDir, f), 'utf8')));
    if (!g.bip.length) throw new Error('no batted balls in this file');
    g.note = labels[g.pk] || '';
    games[g.pk] = g;
    console.log('ok   ' + f + ' -> game ' + g.pk + ' (' + g.away.abbr + ' at ' + g.home.abbr + ', ' + g.bip.length + ' batted balls)');
  } catch (e) {
    console.warn('SKIP ' + f + ': ' + e.message);
  }
});

const manifest = Object.keys(games).map((pk) => {
  const g = games[pk];
  fs.writeFileSync(path.join(outDir, pk + '.json'), JSON.stringify(g));
  const side = (t) => ({ abbr: t.abbr, name: t.name, runs: t.runs, hits: t.hits, errors: t.errors });
  return { pk: g.pk, date: g.date, status: g.status, venue: g.venue, note: g.note, away: side(g.away), home: side(g.home) };
}).sort((a, b) => (b.date || '').localeCompare(a.date || '') || Number(b.pk) - Number(a.pk));

fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest));
console.log('Wrote ' + manifest.length + ' game(s) to public/games');
