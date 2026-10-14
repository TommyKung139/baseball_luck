/* Downloads every finished 2026 postseason game that is not in games-raw/ yet.
   It reads MLB's schedule, then each game's Baseball Savant file, and saves a slim copy.
   It also writes a name for each game (like "NLCS Game 3") into games-raw/labels.json.
   Run by GitHub every few hours (see .github/workflows/sync-games.yml), or by hand: node scripts/sync-postseason.js
   Needs Node 18 or newer. */
const fs = require('fs');
const path = require('path');
const { slim } = require('./slim.js');

const SEASON = 2026;
const rawDir = path.join(__dirname, '..', 'games-raw');
const labelsPath = path.join(rawDir, 'labels.json');
const HEADERS = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(res.status + ' from ' + url);
  return res.json();
}

function seriesName(g) {
  const d = (g.seriesDescription || '').toLowerCase();
  const lg = g.teams && g.teams.away && g.teams.away.team && g.teams.away.team.league && g.teams.away.team.league.id;
  const side = lg === 104 || /national/.test(d) ? 'N' : lg === 103 || /american/.test(d) ? 'A' : '';
  if (g.gameType === 'W' || /world series/.test(d)) return 'World Series';
  if (g.gameType === 'L' || /championship/.test(d)) return side ? side + 'LCS' : 'LCS';
  if (g.gameType === 'D' || /division/.test(d)) return side ? side + 'LDS' : 'Division Series';
  if (g.gameType === 'F' || /wild/.test(d)) return side ? side + 'LWC' : 'Wild Card';
  return g.seriesDescription || 'Postseason';
}
function labelFor(g) {
  const n = g.seriesGameNumber || g.gameNumber;
  return seriesName(g) + (n ? ' Game ' + n : '');
}

(async () => {
  fs.mkdirSync(rawDir, { recursive: true });
  let labels = {};
  try { labels = JSON.parse(fs.readFileSync(labelsPath, 'utf8')); } catch (e) { /* none yet */ }

  const url = 'https://statsapi.mlb.com/api/v1/schedule?sportId=1&season=' + SEASON +
    '&gameType=F,D,L,W&startDate=' + SEASON + '-09-15&endDate=' + SEASON + '-11-20&hydrate=team,seriesStatus';
  const sched = await getJson(url);
  const games = [];
  (sched.dates || []).forEach((d) => (d.games || []).forEach((g) => games.push(g)));
  console.log('Schedule lists ' + games.length + ' postseason games.');

  let added = 0, failed = 0, have = 0, waiting = 0;
  for (const g of games) {
    const code = g.status && g.status.codedGameState;
    if (code !== 'F' && code !== 'O') { waiting++; continue; }   // not finished (or postponed)
    const pk = String(g.gamePk);
    if (!labels[pk]) labels[pk] = labelFor(g);
    const file = path.join(rawDir, pk + '.json');
    if (fs.existsSync(file)) { have++; continue; }
    try {
      const gf = await getJson('https://baseballsavant.mlb.com/gf?game_pk=' + pk);
      if (!gf || !Array.isArray(gf.exit_velocity) || !gf.exit_velocity.length) throw new Error('no batted balls in the feed');
      fs.writeFileSync(file, JSON.stringify(slim(gf)));
      added++;
      console.log('added ' + pk + ' ' + labels[pk] + ' (' + gf.exit_velocity.length + ' batted balls)');
    } catch (e) {
      failed++;
      console.warn('FAILED ' + pk + ' ' + labels[pk] + ': ' + e.message);
    }
    await sleep(800);
  }
  const sorted = {};
  Object.keys(labels).sort().forEach((k) => { sorted[k] = labels[k]; });
  fs.writeFileSync(labelsPath, JSON.stringify(sorted, null, 2) + '\n');
  console.log('Done. Added ' + added + ', already had ' + have + ', failed ' + failed + ', not finished yet ' + waiting + '.');
})().catch((e) => { console.error('Sync failed: ' + e.message); process.exit(1); });
