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
        COALESCE(SUM(ds.home_runs), 0) as homeRuns,
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

    // Build slug map matching generate-static.ts logic
    function slugify(name: string) {
      return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    const rosteredSlugs = new Set(
      (db.prepare(`SELECT name FROM players WHERE team_id IS NOT NULL AND is_active = 1`).all() as { name: string }[])
        .map(p => slugify(p.name))
    );
    const usedSlugs = new Set<string>();
    for (const s of rosteredSlugs) usedSlugs.add(s);

    const result = (rows as { name: string; mlbId: number; gamesPlayed: number; totalScore: number; [key: string]: unknown }[]).map(r => {
      const bare = slugify(r.name);
      const slug = (rosteredSlugs.has(bare) || usedSlugs.has(bare)) ? `${bare}-${r.mlbId}` : bare;
      usedSlugs.add(slug);
      return {
        ...r,
        slug,
        ppg: r.gamesPlayed > 0 ? Math.round((r.totalScore / r.gamesPlayed) * 100) / 100 : 0,
        proj162: r.gamesPlayed > 0 ? Math.round((r.totalScore / r.gamesPlayed) * 162) : 0,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Undrafted error:', err);
    return NextResponse.json({ error: 'Failed to fetch undrafted players' }, { status: 500 });
  }
}
