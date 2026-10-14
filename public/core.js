/* Core logic: parse a Baseball Savant game feed and compute hit luck. */
var HIT_BASES = { 'Single': 1, 'Double': 2, 'Triple': 3, 'Home Run': 4 };
var HARD_HIT = 95;

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  var n = parseFloat(v);
  return isFinite(n) ? n : null;
}

/* Turn a raw Savant gf JSON object into the compact game object the page uses. */
function parseSavant(gf) {
  if (!gf || typeof gf !== 'object' || !Array.isArray(gf.exit_velocity)) {
    throw new Error('not-savant');
  }
  var sb = gf.scoreboard || {};
  var ls = sb.linescore || {};
  function team(d, side) {
    d = d || {};
    var r = (ls.teams && ls.teams[side]) || {};
    return {
      id: d.id || null,
      abbr: d.abbreviation || '',
      name: d.teamName || d.name || '',
      city: d.locationName || '',
      runs: r.runs == null ? null : r.runs,
      hits: r.hits == null ? null : r.hits,
      errors: r.errors == null ? null : r.errors
    };
  }
  var away = team(gf.away_team_data, 'away');
  var home = team(gf.home_team_data, 'home');
  var seen = {};
  var bip = [];
  gf.exit_velocity.forEach(function (r) {
    var ev = num(r.hit_speed != null ? r.hit_speed : r.launch_speed);
    if (ev === null) return;
    var id = r.play_id || (r.inning + '-' + r.half_inning + '-' + r.ab_number);
    if (seen[id]) return;
    seen[id] = 1;
    var side = r.half_inning === 'top' ? 'away' : 'home';
    if (side === 'away' && !away.abbr) away.abbr = r.team_batting || 'AWAY';
    if (side === 'home' && !home.abbr) home.abbr = r.team_batting || 'HOME';
    var ev_name = r.events || r.result || '';
    bip.push({
      id: id,
      inn: r.inning,
      half: r.half_inning,
      ab: r.ab_number,
      side: side,
      team: r.team_batting || (side === 'away' ? away.abbr : home.abbr),
      batter: r.batter_name || '',
      pitcher: r.pitcher_name || '',
      event: ev_name,
      des: r.des || '',
      ev: ev,
      la: num(r.hit_angle != null ? r.hit_angle : r.launch_angle),
      dist: num(r.hit_distance),
      xba: num(r.xba),
      barrel: !!(r.is_barrel && r.is_barrel !== '0'),
      hit: !!HIT_BASES[ev_name]
    });
  });
  bip.sort(function (a, b) {
    return (a.inn - b.inn) || ((a.half === 'top' ? 0 : 1) - (b.half === 'top' ? 0 : 1)) || (a.ab - b.ab);
  });
  var innings = (ls.innings || []).map(function (i) {
    return {
      n: i.num,
      a: i.away && i.away.runs != null ? i.away.runs : null,
      h: i.home && i.home.runs != null ? i.home.runs : null
    };
  });
  return {
    pk: String(sb.gamePk || gf.game_pk || (gf.exit_velocity[0] && gf.exit_velocity[0].game_pk) || Date.now()),
    date: gf.game_date || '',
    status: gf.game_status_code === 'F' ? 'Final' : (gf.game_status || ''),
    venue: (gf.home_team_data && gf.home_team_data.venue && gf.home_team_data.venue.name) || '',
    away: away,
    home: home,
    innings: innings,
    bip: bip
  };
}

/* Luck only counts batted balls that have a hit probability. Sacrifice bunts are
   left out because the batter was not trying to get a hit. */
function countable(b) {
  return b.xba !== null && b.event !== 'Sac Bunt';
}

/* Chance of every possible hit total (Poisson-binomial distribution). */
function hitDistribution(ps) {
  var dp = [1];
  ps.forEach(function (p) {
    var nx = new Array(dp.length + 1).fill(0);
    for (var k = 0; k < dp.length; k++) {
      nx[k] += dp[k] * (1 - p);
      nx[k + 1] += dp[k] * p;
    }
    dp = nx;
  });
  return dp;
}

/* Team luck for one game. */
function teamLuck(bipOfTeam) {
  var rows = bipOfTeam.filter(countable);
  var ps = rows.map(function (b) { return b.xba; });
  var dist = hitDistribution(ps);
  var E = ps.reduce(function (s, p) { return s + p; }, 0);
  var H = rows.filter(function (b) { return b.hit; }).length;
  var below = 0;
  for (var k = 0; k < H; k++) below += dist[k];
  var pct = rows.length ? (below + 0.5 * dist[H]) * 100 : null;
  var variance = ps.reduce(function (s, p) { return s + p * (1 - p); }, 0);
  var evs = bipOfTeam.map(function (b) { return b.ev; });
  return {
    n: rows.length,
    hits: H,
    expected: E,
    net: H - E,
    pct: pct,
    sd: Math.sqrt(variance),
    dist: dist,
    avgEV: evs.length ? evs.reduce(function (s, v) { return s + v; }, 0) / evs.length : null,
    hardHit: bipOfTeam.filter(function (b) { return b.ev >= HARD_HIT; }).length,
    total: bipOfTeam.length
  };
}

function luckBand(p) {
  if (p === null) return 'No data';
  if (p >= 90) return 'Very lucky';
  if (p >= 70) return 'Lucky';
  if (p > 30) return 'About what the contact earned';
  if (p > 10) return 'Unlucky';
  return 'Very unlucky';
}

if (typeof module !== 'undefined') {
  module.exports = { parseSavant: parseSavant, teamLuck: teamLuck, hitDistribution: hitDistribution, luckBand: luckBand, countable: countable };
}
