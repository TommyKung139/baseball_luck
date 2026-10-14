/* Shrinks a full Baseball Savant game file (about 2.6 MB) to the few fields the site uses (about 20 KB).
   parseSavant() gives the same result for the full file and the slim one. */
const KEEP = ['play_id', 'inning', 'half_inning', 'ab_number', 'team_batting', 'batter_name', 'pitcher_name',
  'events', 'result', 'des', 'hit_speed', 'launch_speed', 'hit_angle', 'launch_angle', 'hit_distance',
  'xba', 'is_barrel', 'game_pk'];

function pick(o, keys) {
  const r = {};
  keys.forEach((k) => { if (o && o[k] !== undefined) r[k] = o[k]; });
  return r;
}
function slimTeam(t) {
  t = t || {};
  return {
    id: t.id, name: t.name, teamName: t.teamName, locationName: t.locationName, abbreviation: t.abbreviation,
    venue: t.venue ? { name: t.venue.name } : undefined
  };
}
function slim(gf) {
  const sb = gf.scoreboard || {};
  const ls = sb.linescore || {};
  return {
    game_pk: gf.game_pk,
    game_date: gf.game_date,
    game_status: gf.game_status,
    game_status_code: gf.game_status_code,
    scoreboard: {
      gamePk: sb.gamePk,
      linescore: {
        innings: (ls.innings || []).map((i) => ({
          num: i.num,
          home: { runs: i.home && i.home.runs },
          away: { runs: i.away && i.away.runs }
        })),
        teams: ls.teams
      }
    },
    home_team_data: slimTeam(gf.home_team_data),
    away_team_data: slimTeam(gf.away_team_data),
    exit_velocity: (gf.exit_velocity || []).map((r) => pick(r, KEEP))
  };
}
module.exports = { slim };
