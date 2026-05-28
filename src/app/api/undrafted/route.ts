import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

export async function GET() {
  try {
    const db = new Database(path.join(process.cwd(), 'baseball.db'), { readonly: true });

    const rows = db.prepare(`
      SELECT
        p.id,
        p.name,
        p.mlb_team as mlbTeam,
        p.mlb_id as mlbId,
        COUNT(DISTINCT ds.game_date) as gamesPlayed,
        COALESCE(SUM(ds.fantasy_score), 0) as totalScore,
        COALESCE(SUM(ds.hits - ds.doubles - ds.triples - ds.home_runs), 0) as singles,
        COALESCE(SUM(ds.doubles), 0) as doubles,
        COALESCE(SUM(ds.triples), 0) as triples,
        COALESCE(SUM(ds.stolen_bases), 0) as stolenBases
      FROM players p
      JOIN daily_stats ds ON ds.player_id = p.id
      WHERE p.team_id IS NULL AND p.is_active = 1
      GROUP BY p.id
      HAVING gamesPlayed >= 5
      ORDER BY totalScore DESC
      LIMIT 70
    `).all();

    db.close();

    const result = (rows as any[]).map(r => ({
      ...r,
      ppg: r.gamesPlayed > 0 ? Math.round((r.totalScore / r.gamesPlayed) * 100) / 100 : 0,
      proj162: r.gamesPlayed > 0 ? Math.round((r.totalScore / r.gamesPlayed) * 162) : 0,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error('Undrafted error:', err);
    return NextResponse.json({ error: 'Failed to fetch undrafted players' }, { status: 500 });
  }
}
