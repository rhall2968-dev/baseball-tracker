/**
 * One-time setup script:
 *  1. Creates the period_scores table for locked period totals.
 *  2. Fixes the First Third end date to 2026-05-31.
 *  3. Computes and locks the First Third best-ball score per team.
 *  4. Replaces periods 2 & 3 with Sunday-Saturday weekly periods.
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'baseball.db');
const sqlite = new Database(DB_PATH);

// --- 1. Create period_scores table ---
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS period_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL REFERENCES teams(id),
    period_id INTEGER NOT NULL REFERENCES season_periods(id),
    score INTEGER NOT NULL DEFAULT 0,
    UNIQUE(team_id, period_id)
  );
`);
console.log('period_scores table ready.');

// --- 2. Fix First Third end date ---
sqlite.prepare(`UPDATE season_periods SET end_date = '2026-05-31' WHERE id = 1`).run();
console.log('First Third end date updated to 2026-05-31.');

// --- 3. Compute and lock First Third best-ball scores ---

const FIRST_THIRD_PERIOD_ID = 1;
const FIRST_THIRD_START = '2026-03-26';
const FIRST_THIRD_END = '2026-05-31';

const teams = sqlite.prepare('SELECT id FROM teams').all() as { id: number }[];

// For each team: sum each rostered player's fantasy score over the first third,
// sort desc, take top 10, sum → best-ball score.
const playerRows = sqlite.prepare(`
  SELECT p.id AS player_id, p.team_id, COALESCE(SUM(ds.fantasy_score), 0) AS total_score
  FROM players p
  LEFT JOIN daily_stats ds
    ON ds.player_id = p.id
    AND ds.game_date >= ?
    AND ds.game_date <= ?
  WHERE p.team_id IS NOT NULL
  GROUP BY p.id
`).all(FIRST_THIRD_START, FIRST_THIRD_END) as { player_id: number; team_id: number; total_score: number }[];

const byTeam = new Map<number, number[]>();
for (const row of playerRows) {
  if (!byTeam.has(row.team_id)) byTeam.set(row.team_id, []);
  byTeam.get(row.team_id)!.push(row.total_score);
}

const insertScore = sqlite.prepare(`
  INSERT INTO period_scores (team_id, period_id, score) VALUES (?, ?, ?)
  ON CONFLICT(team_id, period_id) DO UPDATE SET score = excluded.score
`);

const lockTx = sqlite.transaction(() => {
  for (const team of teams) {
    const scores = (byTeam.get(team.id) ?? []).sort((a, b) => b - a);
    const bestBall = scores.slice(0, 10).reduce((s, v) => s + v, 0);
    insertScore.run(team.id, FIRST_THIRD_PERIOD_ID, bestBall);
  }
});
lockTx();

const locked = sqlite.prepare('SELECT t.name, ps.score FROM period_scores ps JOIN teams t ON t.id = ps.team_id ORDER BY ps.score DESC').all() as { name: string; score: number }[];
console.log('First Third locked scores:');
for (const row of locked) console.log(`  ${row.name}: ${row.score}`);

// --- 4. Replace periods 2 & 3 with weekly periods ---

sqlite.prepare('DELETE FROM season_periods WHERE id IN (2, 3)').run();

const weeks = [
  // Short first week — starts Monday June 1 since May 31 belongs to first third
  { name: 'Wk 1',  start: '2026-06-01', end: '2026-06-06' },
  { name: 'Wk 2',  start: '2026-06-07', end: '2026-06-13' },
  { name: 'Wk 3',  start: '2026-06-14', end: '2026-06-20' },
  { name: 'Wk 4',  start: '2026-06-21', end: '2026-06-27' },
  { name: 'Wk 5',  start: '2026-06-28', end: '2026-07-04' },
  { name: 'Wk 6',  start: '2026-07-05', end: '2026-07-11' },
  { name: 'Wk 7',  start: '2026-07-12', end: '2026-07-18' },
  { name: 'Wk 8',  start: '2026-07-19', end: '2026-07-25' },
  { name: 'Wk 9',  start: '2026-07-26', end: '2026-08-01' },
  { name: 'Wk 10', start: '2026-08-02', end: '2026-08-08' },
  { name: 'Wk 11', start: '2026-08-09', end: '2026-08-15' },
  { name: 'Wk 12', start: '2026-08-16', end: '2026-08-22' },
  { name: 'Wk 13', start: '2026-08-23', end: '2026-08-29' },
  { name: 'Wk 14', start: '2026-08-30', end: '2026-09-05' },
  { name: 'Wk 15', start: '2026-09-06', end: '2026-09-12' },
  { name: 'Wk 16', start: '2026-09-13', end: '2026-09-19' },
  { name: 'Wk 17', start: '2026-09-20', end: '2026-09-27' },
];

const insertPeriod = sqlite.prepare(`INSERT INTO season_periods (name, start_date, end_date) VALUES (?, ?, ?)`);
const weekTx = sqlite.transaction(() => {
  for (const w of weeks) insertPeriod.run(w.name, w.start, w.end);
});
weekTx();

console.log(`Inserted ${weeks.length} weekly periods.`);

const allPeriods = sqlite.prepare('SELECT * FROM season_periods ORDER BY id').all() as any[];
console.log('All periods:');
for (const p of allPeriods) console.log(`  [${p.id}] ${p.name}: ${p.start_date} – ${p.end_date}`);

sqlite.close();
