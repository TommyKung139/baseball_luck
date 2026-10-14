/* Optional shortcut: downloads games from Baseball Savant into games-raw/.
   Usage:  node scripts/add-game.js 849809 849820
   Needs Node 18 or newer and an internet connection. */
const fs = require('fs');
const path = require('path');

const pks = process.argv.slice(2).filter((a) => /^\d+$/.test(a));
if (!pks.length) {
  console.log('Usage: node scripts/add-game.js <game number> [<game number> ...]');
  process.exit(1);
}
const rawDir = path.join(__dirname, '..', 'games-raw');
fs.mkdirSync(rawDir, { recursive: true });

(async () => {
  let failed = 0;
  for (const pk of pks) {
    try {
      const res = await fetch('https://baseballsavant.mlb.com/gf?game_pk=' + pk, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error('Savant answered ' + res.status);
      const gf = await res.json();
      if (!gf || !Array.isArray(gf.exit_velocity)) throw new Error('that does not look like a game feed');
      if (!gf.exit_velocity.length) throw new Error('no batted balls yet (has the game been played?)');
      fs.writeFileSync(path.join(rawDir, pk + '.json'), JSON.stringify(gf));
      console.log('saved games-raw/' + pk + '.json (' + gf.exit_velocity.length + ' batted balls)');
    } catch (e) {
      failed++;
      console.warn('FAILED ' + pk + ': ' + e.message);
      console.warn('  Open https://baseballsavant.mlb.com/gf?game_pk=' + pk + ' in your browser, save the page, and put the file in games-raw/ by hand.');
    }
  }
  console.log(failed ? 'Done with ' + failed + ' failure(s).' : 'Done. Now commit and push, and Vercel will publish the new game(s).');
})();
