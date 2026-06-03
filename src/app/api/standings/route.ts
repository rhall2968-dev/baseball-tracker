import { NextResponse } from 'next/server';
import { db } from '@/db';
import { teams, players, dailyStats, seasonPeriods, periodScores } from '@/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { computeBestBall, type PlayerPeriodScore } from '@/lib/scoring';

export async function GET() {
  try {
    const allTeams = await db.select().from(teams);
    const allPeriods = await db.select().from(seasonPeriods).orderBy(seasonPeriods.id);

    // Load any pre-locked period scores (e.g. First Third)
    const allLocked = await db.select().from(periodScores);
    const lockedMap = new Map<string, number>();
    const lockedPeriodIds = new Set<number>();
    for (const ls of allLocked) {
      lockedMap.set(`${ls.periodId}-${ls.teamId}`, ls.score);
      lockedPeriodIds.add(ls.periodId);
    }

    // Only compute dynamically for periods that have no locked scores
    const dynamicPeriods = allPeriods.filter(p => !lockedPeriodIds.has(p.id));

    const periodPlayerStats = new Map<number, Map<number, PlayerPeriodScore>>();
    for (const period of dynamicPeriods) {
      const stats = await db.select({
        playerId: dailyStats.playerId,
        playerName: players.name,
        teamId: players.teamId,
        totalScore: sql<number>`COALESCE(SUM(${dailyStats.fantasyScore}), 0)`,
        gamesPlayed: sql<number>`COUNT(${dailyStats.id})`,
        totalBases: sql<number>`COALESCE(SUM(${dailyStats.totalBases}), 0)`,
        stolenBases: sql<number>`COALESCE(SUM(${dailyStats.stolenBases}), 0)`,
        walks: sql<number>`COALESCE(SUM(${dailyStats.walks}), 0)`,
        hbp: sql<number>`COALESCE(SUM(${dailyStats.hbp}), 0)`,
      })
        .from(dailyStats)
        .innerJoin(players, eq(dailyStats.playerId, players.id))
        .where(and(
          eq(players.isActive, 1),
          gte(dailyStats.gameDate, period.startDate),
          lte(dailyStats.gameDate, period.endDate),
        ))
        .groupBy(dailyStats.playerId);

      const map = new Map<number, PlayerPeriodScore>();
      for (const s of stats) map.set(s.playerId, s);
      periodPlayerStats.set(period.id, map);
    }

    const allPlayers = await db.select().from(players).where(eq(players.isActive, 1));
    const teamPlayersMap = new Map<number, typeof allPlayers>();
    for (const p of allPlayers) {
      const tid = p.teamId ?? 0;
      if (!teamPlayersMap.has(tid)) teamPlayersMap.set(tid, []);
      teamPlayersMap.get(tid)!.push(p);
    }

    const standings = allTeams.map(team => {
      const teamPlayers = teamPlayersMap.get(team.id) || [];
      let firstThirdScore = 0;
      let weeklyTotal = 0;

      const periodResults = allPeriods.map(period => {
        const locked = lockedMap.get(`${period.id}-${team.id}`);

        if (locked !== undefined) {
          firstThirdScore = locked;
          return {
            periodId: period.id,
            periodName: period.name,
            bestBallScore: locked,
            locked: true,
            countingPlayerIds: [] as number[],
            benchPlayerIds: [] as number[],
          };
        }

        const periodStats = periodPlayerStats.get(period.id) || new Map();
        const playerScores: PlayerPeriodScore[] = teamPlayers.map(player => {
          const s = periodStats.get(player.id);
          return {
            playerId: player.id, playerName: player.name,
            totalScore: s?.totalScore ?? 0, gamesPlayed: s?.gamesPlayed ?? 0,
            totalBases: s?.totalBases ?? 0, stolenBases: s?.stolenBases ?? 0,
            walks: s?.walks ?? 0, hbp: s?.hbp ?? 0,
          };
        });
        const bestBall = computeBestBall(playerScores);
        weeklyTotal += bestBall.bestBallScore;
        return {
          periodId: period.id,
          periodName: period.name,
          bestBallScore: bestBall.bestBallScore,
          locked: false,
          countingPlayerIds: bestBall.countingPlayerIds,
          benchPlayerIds: bestBall.benchPlayerIds,
        };
      });

      return {
        team: { id: team.id, name: team.name },
        periods: periodResults,
        firstThirdScore,
        weeklyTotal,
        cumulativeScore: firstThirdScore + weeklyTotal,
      };
    }).sort((a, b) => b.cumulativeScore - a.cumulativeScore);

    return NextResponse.json({
      standings,
      periods: allPeriods,
      lockedPeriodIds: [...lockedPeriodIds],
    });
  } catch (error) {
    console.error('Standings error:', error);
    return NextResponse.json({ error: 'Failed to fetch standings' }, { status: 500 });
  }
}
