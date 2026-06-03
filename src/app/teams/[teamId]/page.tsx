'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchData } from '@/lib/data';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface PlayerScore {
  playerId: number;
  playerName: string;
  slug: string;
  totalScore: number;
  gamesPlayed: number;
  totalBases: number;
  stolenBases: number;
  walks: number;
  hbp: number;
  atBats: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  runs: number;
  rbi: number;
  strikeouts: number;
  plateAppearances: number;
  sacFlies: number;
  sacBunts: number;
  caughtStealing: number;
  intentionalWalks: number;
  groundIntoDoublePlay: number;
  leftOnBase: number;
}

interface PeriodResult {
  period: { id: number; name: string; startDate: string; endDate: string };
  bestBallScore: number;
  playerScores: PlayerScore[];
  countingPlayerIds: number[];
  benchPlayerIds: number[];
}

interface TeamDetail {
  team: { id: number; name: string };
  roster: Array<{
    id: number;
    name: string;
    slug: string;
    mlbTeam: string | null;
    position: string | null;
    draftRound: number | null;
  }>;
  periods: PeriodResult[];
  weeklyDaily: Record<string, Record<string, number>>;
}

interface CalendarGame {
  date: string;
  gamePk: number;
  away: { abbr: string | null };
  home: { abbr: string | null };
  status: string;
}
interface CalendarShape { games: CalendarGame[] }

const teamNames = ['Cole', 'Markus', 'J Mill', 'Ryan', 'Joey', 'Jack', 'Austin', 'Bobby'];
const DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Wk 1-9 = 2nd Third, Wk 10-17 = 3rd Third
const SECOND_THIRD_SLICE: [number, number] = [1, 10];
const THIRD_THIRD_SLICE: [number, number] = [10, 18];

export default function TeamDetailPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const [data, setData] = useState<TeamDetail | null>(null);
  const [calendar, setCalendar] = useState<CalendarShape | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchData<TeamDetail>(`/api/teams/${teamId}`),
      fetchData<CalendarShape>(`/api/calendar`).catch(() => ({ games: [] })),
    ]).then(([detail, cal]) => {
      setData(detail);
      setCalendar(cal);
    }).finally(() => setLoading(false));
  }, [teamId]);

  const gamesNext7ByMlbTeam = (() => {
    const map = new Map<string, number>();
    if (!calendar) return map;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    const todayYmd = now.toISOString().split('T')[0];
    const endYmd = end.toISOString().split('T')[0];
    for (const g of calendar.games) {
      if (g.date < todayYmd || g.date >= endYmd) continue;
      if (g.date === todayYmd && g.status === 'F') continue;
      for (const abbr of [g.away.abbr, g.home.abbr]) {
        if (!abbr) continue;
        map.set(abbr, (map.get(abbr) ?? 0) + 1);
      }
    }
    return map;
  })();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-5 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!data?.team) return <p className="text-muted-foreground text-sm">Team not found</p>;

  const id = parseInt(teamId);
  const today = new Date().toISOString().split('T')[0];

  // Period groupings
  const firstThirdPeriod = data.periods[0];
  const secondThirdPeriods = data.periods.slice(...SECOND_THIRD_SLICE);
  const thirdThirdPeriods = data.periods.slice(...THIRD_THIRD_SLICE);

  const firstThirdTeamScore = firstThirdPeriod?.bestBallScore ?? 0;
  const secondThirdTeamScore = secondThirdPeriods.reduce((s, p) => s + p.bestBallScore, 0);
  const thirdThirdTeamScore = thirdThirdPeriods.reduce((s, p) => s + p.bestBallScore, 0);
  const cumulativeScore = firstThirdTeamScore + secondThirdTeamScore + thirdThirdTeamScore;

  const seasonStart = data.periods[0]?.period.startDate;
  const daysSinceStart = seasonStart
    ? Math.max(1, Math.round((new Date(today).getTime() - new Date(seasonStart).getTime()) / 86400000))
    : 0;
  const avgPtsPerDay = daysSinceStart > 0 ? (cumulativeScore / daysSinceStart).toFixed(1) : null;

  // Active scoring period within the 2nd Third (the current week)
  const activeSecondThirdPeriod = secondThirdPeriods.find(
    p => p.period.startDate <= today && p.period.endDate >= today
  ) ?? null;

  // Active scoring period within the 3rd Third
  const activeThirdThirdPeriod = thirdThirdPeriods.find(
    p => p.period.startDate <= today && p.period.endDate >= today
  ) ?? null;

  // Build week date columns for a given active period
  function getWeekDates(period: PeriodResult | null): string[] {
    if (!period) return [];
    const dates: string[] = [];
    const d = new Date(period.period.startDate + 'T12:00:00Z');
    const end = new Date(period.period.endDate + 'T12:00:00Z');
    while (d <= end) {
      dates.push(d.toISOString().split('T')[0]);
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return dates;
  }

  // Per-player cross-period aggregates
  function getPlayerThirdTotal(playerId: number, periods: PeriodResult[]): number {
    return periods.reduce((sum, p) => {
      const entry = p.playerScores.find(x => x.playerId === playerId);
      return sum + (entry?.totalScore ?? 0);
    }, 0);
  }

  // Master player list from first third (includes all 13 rostered players)
  const allPlayers = (firstThirdPeriod?.playerScores ?? []).map(ps => {
    const firstThirdScore = ps.totalScore;
    const secondThirdScore = getPlayerThirdTotal(ps.playerId, secondThirdPeriods);
    const thirdThirdScore = getPlayerThirdTotal(ps.playerId, thirdThirdPeriods);
    return {
      ...ps,
      firstThirdScore,
      secondThirdScore,
      thirdThirdScore,
      seasonTotal: firstThirdScore + secondThirdScore + thirdThirdScore,
    };
  });

  // Scoreboard table shared by 2nd and 3rd Third tabs
  function ScoreboardTable({
    players,
    weekDates,
    activePeriod,
    periodLabel,
    thirdScore,
    thirdTeamTotal,
    otherThirdScore,
    otherThirdLabel,
  }: {
    players: typeof allPlayers;
    weekDates: string[];
    activePeriod: PeriodResult | null;
    periodLabel: string;
    thirdScore: (p: typeof allPlayers[0]) => number;
    thirdTeamTotal: number;
    otherThirdScore?: (p: typeof allPlayers[0]) => number;
    otherThirdLabel?: string;
  }) {
    const countingIds = new Set(activePeriod?.countingPlayerIds ?? []);
    const sorted = [...players].sort((a, b) => b.seasonTotal - a.seasonTotal);

    return (
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full" style={{ minWidth: `${380 + weekDates.length * 44}px` }}>
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-5 px-3 py-2"></th>
              <th className="text-left text-[11px] font-medium text-muted-foreground px-3 py-2">Player</th>
              {weekDates.length > 0 && (
                <th
                  colSpan={weekDates.length}
                  className="text-center text-[11px] font-medium text-muted-foreground px-3 py-1 border-l border-border/50"
                >
                  {activePeriod?.period.name ?? periodLabel}
                </th>
              )}
              <th className="text-right text-[11px] font-medium text-muted-foreground px-3 py-2 border-l border-border/50">
                1st ⅓
              </th>
              <th className="text-right text-[11px] font-medium text-muted-foreground px-3 py-2">
                {periodLabel}
              </th>
              {otherThirdLabel && (
                <th className="text-right text-[11px] font-medium text-muted-foreground px-3 py-2 text-muted-foreground/50">
                  {otherThirdLabel}
                </th>
              )}
              <th className="text-right text-[11px] font-medium text-muted-foreground px-3 py-2 border-l border-border/50">
                Total
              </th>
            </tr>
            {weekDates.length > 0 && (
              <tr className="border-b border-border/50 bg-muted/20">
                <th className="px-3 py-1"></th>
                <th className="px-3 py-1"></th>
                {weekDates.map((date, i) => {
                  const d = new Date(date + 'T12:00:00Z');
                  const isFuture = date > today;
                  return (
                    <th
                      key={date}
                      className={`text-center text-[10px] font-normal px-1 py-1 w-10 ${
                        i === 0 ? 'border-l border-border/50' : ''
                      } ${date === today ? 'text-primary font-medium' : isFuture ? 'text-muted-foreground/30' : 'text-muted-foreground'}`}
                    >
                      <div>{DAY_ABBR[d.getUTCDay()]}</div>
                      <div className="text-[9px]">{d.getUTCMonth() + 1}/{d.getUTCDate()}</div>
                    </th>
                  );
                })}
                <th className="px-3 py-1 border-l border-border/50"></th>
                <th className="px-3 py-1"></th>
                {otherThirdLabel && <th className="px-3 py-1"></th>}
                <th className="px-3 py-1 border-l border-border/50"></th>
              </tr>
            )}
          </thead>
          <tbody>
            {sorted.map((ps, idx) => {
              const counting = countingIds.has(ps.playerId);
              const dailyMap = data!.weeklyDaily[String(ps.playerId)] ?? {};
              const pts2nd = thirdScore(ps);
              const pts3rd = otherThirdScore ? otherThirdScore(ps) : null;
              return (
                <tr
                  key={ps.playerId}
                  className={`border-b border-border/50 ${counting ? '' : 'text-muted-foreground'}`}
                >
                  <td className="px-3 py-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${counting ? 'bg-primary' : 'bg-border'}`} />
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/players/${ps.slug}`}
                        className="inline-flex items-center min-h-[32px] -my-1 text-sm hover:text-primary transition-colors whitespace-nowrap"
                      >
                        {ps.playerName}
                      </Link>
                      {idx === 0 && counting && <span className="text-[10px] text-primary">MVP</span>}
                      {!counting && <span className="text-[10px] text-muted-foreground/50">bench</span>}
                    </div>
                  </td>
                  {weekDates.map((date, i) => {
                    const score = dailyMap[date];
                    const isFuture = date > today;
                    return (
                      <td
                        key={date}
                        className={`text-center text-xs tabular-nums py-1.5 w-10 ${
                          i === 0 ? 'border-l border-border/50' : ''
                        } ${isFuture ? 'text-muted-foreground/20' : score ? '' : 'text-muted-foreground/40'}`}
                      >
                        {isFuture ? '·' : (score ?? '—')}
                      </td>
                    );
                  })}
                  <td className={`text-right text-xs tabular-nums px-3 py-1.5 border-l border-border/50 ${ps.firstThirdScore === 0 ? 'text-muted-foreground/30' : ''}`}>
                    {ps.firstThirdScore || '—'}
                  </td>
                  <td className={`text-right text-xs tabular-nums px-3 py-1.5 ${pts2nd === 0 ? 'text-muted-foreground/30' : ''}`}>
                    {pts2nd || '—'}
                  </td>
                  {pts3rd !== null && (
                    <td className={`text-right text-xs tabular-nums px-3 py-1.5 text-muted-foreground/50 ${pts3rd === 0 ? 'text-muted-foreground/20' : ''}`}>
                      {pts3rd || '—'}
                    </td>
                  )}
                  <td className={`text-right text-xs tabular-nums font-semibold px-3 py-1.5 border-l border-border/50 ${counting ? '' : 'text-muted-foreground'}`}>
                    {ps.seasonTotal || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30">
              <td colSpan={2 + weekDates.length} className="px-3 py-2 text-xs font-medium">
                Best Ball Total
              </td>
              <td className={`text-right text-xs tabular-nums px-3 py-2 border-l border-border/50 ${firstThirdTeamScore > 0 ? 'font-semibold text-primary' : 'text-muted-foreground/40'}`}>
                {firstThirdTeamScore || '—'}
              </td>
              <td className={`text-right text-xs tabular-nums px-3 py-2 ${thirdTeamTotal > 0 ? 'font-semibold text-primary' : 'text-muted-foreground/40'}`}>
                {thirdTeamTotal || '—'}
              </td>
              {otherThirdLabel && (
                <td className="text-right text-xs tabular-nums px-3 py-2 text-muted-foreground/40">—</td>
              )}
              <td className="text-right text-xs tabular-nums font-semibold text-primary px-3 py-2 border-l border-border/50">
                {cumulativeScore}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Link href="/standings" className="inline-flex items-center min-h-[32px] -my-1 hover:text-foreground">
            Standings
          </Link>
          <span>/</span>
        </div>
        <h1 className="text-lg font-semibold">{data.team.name}</h1>
        {avgPtsPerDay && (
          <p className="text-xl font-bold tabular-nums mt-0.5" style={{ color: '#C8102E' }}>
            {avgPtsPerDay} <span className="text-sm font-normal text-gray-400">pts / day</span>
          </p>
        )}
        <div className="flex flex-wrap gap-1 mt-3">
          {teamNames.map((name, i) => (
            <Link
              key={i}
              href={`/teams/${i + 1}`}
              className={`inline-flex items-center justify-center min-h-[32px] min-w-[44px] px-2 py-1 text-[11px] rounded transition-colors ${
                i + 1 === id
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {name}
            </Link>
          ))}
        </div>
      </div>

      {/* Score summary — one block per third */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-lg border border-border">
          <div className="text-[11px] text-muted-foreground mb-0.5">1st Third</div>
          <div className="text-2xl font-bold tabular-nums">{firstThirdTeamScore || '—'}</div>
        </div>
        <div className="p-3 rounded-lg border border-primary/30 bg-accent/10">
          <div className="text-[11px] text-muted-foreground mb-0.5">2nd Third</div>
          <div className="text-2xl font-bold tabular-nums text-primary">{secondThirdTeamScore || '—'}</div>
        </div>
        <div className="p-3 rounded-lg border border-border opacity-50">
          <div className="text-[11px] text-muted-foreground mb-0.5">3rd Third</div>
          <div className="text-2xl font-bold tabular-nums text-muted-foreground">{thirdThirdTeamScore || '—'}</div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground -mt-4">
        {cumulativeScore} total pts &middot; 13 rostered, best 10 count
      </div>

      {/* Roster — three-thirds tabs */}
      <Tabs defaultValue="second">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-medium">Roster</h2>
          <TabsList className="h-auto">
            <TabsTrigger value="first" className="text-[11px] px-3 min-h-[32px] h-auto">1st Third</TabsTrigger>
            <TabsTrigger value="second" className="text-[11px] px-3 min-h-[32px] h-auto">2nd Third</TabsTrigger>
            <TabsTrigger value="third" className="text-[11px] px-3 min-h-[32px] h-auto">3rd Third</TabsTrigger>
          </TabsList>
        </div>

        {/* 1st Third */}
        <TabsContent value="first">
          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full min-w-[280px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="w-5 px-3 py-2"></th>
                  <th className="text-left text-[11px] font-medium text-muted-foreground px-3 py-2">Player</th>
                  <th className="text-right text-[11px] font-medium text-muted-foreground px-4 py-2">Pts</th>
                </tr>
              </thead>
              <tbody>
                {[...allPlayers]
                  .sort((a, b) => b.firstThirdScore - a.firstThirdScore)
                  .map((ps, idx) => {
                    const counting = firstThirdPeriod?.countingPlayerIds.includes(ps.playerId) ?? false;
                    return (
                      <tr
                        key={ps.playerId}
                        className={`border-b border-border/50 ${counting ? '' : 'text-muted-foreground'}`}
                      >
                        <td className="px-3 py-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${counting ? 'bg-primary' : 'bg-border'}`} />
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/players/${ps.slug}`}
                              className="inline-flex items-center min-h-[32px] -my-1 text-sm hover:text-primary transition-colors whitespace-nowrap"
                            >
                              {ps.playerName}
                            </Link>
                            {idx === 0 && counting && <span className="text-[10px] text-primary">MVP</span>}
                            {!counting && <span className="text-[10px] text-muted-foreground/50">bench</span>}
                          </div>
                        </td>
                        <td className="px-4 py-1.5 text-right text-sm tabular-nums font-semibold">
                          {ps.firstThirdScore || '—'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30">
                  <td colSpan={2} className="px-3 py-2 text-xs font-medium">Best Ball Total</td>
                  <td className="px-4 py-2 text-right text-xs tabular-nums font-semibold text-primary">
                    {firstThirdTeamScore || '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </TabsContent>

        {/* 2nd Third */}
        <TabsContent value="second">
          <ScoreboardTable
            players={allPlayers}
            weekDates={getWeekDates(activeSecondThirdPeriod)}
            activePeriod={activeSecondThirdPeriod}
            periodLabel="2nd ⅓"
            thirdScore={p => p.secondThirdScore}
            thirdTeamTotal={secondThirdTeamScore}
          />
        </TabsContent>

        {/* 3rd Third */}
        <TabsContent value="third">
          {thirdThirdTeamScore > 0 ? (
            <ScoreboardTable
              players={allPlayers}
              weekDates={getWeekDates(activeThirdThirdPeriod)}
              activePeriod={activeThirdThirdPeriod}
              periodLabel="3rd ⅓"
              thirdScore={p => p.thirdThirdScore}
              thirdTeamTotal={thirdThirdTeamScore}
            />
          ) : (
            <div className="border border-border rounded-lg p-10 text-center">
              <p className="text-sm text-muted-foreground">3rd Third scoring begins in early August</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Wk 10 · Aug 2 – Aug 8</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Draft Order */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-medium">Draft Order</h2>
          <span className="text-[10px] text-muted-foreground">games next 7d</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-0 border border-border rounded-lg overflow-hidden">
          {data.roster.map((p, i) => {
            const games7 = p.mlbTeam ? (gamesNext7ByMlbTeam.get(p.mlbTeam) ?? 0) : null;
            return (
              <div key={p.id} className="px-3 py-1 border-b border-border/50 flex items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums w-5 shrink-0">{i + 1}.</span>
                <Link
                  href={`/players/${p.slug}`}
                  className="inline-flex items-center min-h-[36px] text-xs flex-1 hover:text-primary transition-colors truncate"
                >
                  {p.name}
                </Link>
                {p.mlbTeam && (
                  <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">{p.mlbTeam}</span>
                )}
                {games7 != null && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded tabular-nums shrink-0 ${
                      games7 >= 6 ? 'bg-primary/15 text-primary font-medium'
                        : games7 >= 4 ? 'bg-muted text-foreground'
                        : games7 === 0 ? 'bg-muted/40 text-muted-foreground/60'
                        : 'bg-muted/60 text-muted-foreground'
                    }`}
                    title={`${games7} games in the next 7 days`}
                  >
                    {games7}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
