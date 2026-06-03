'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchData } from '@/lib/data';
import { BumpChart } from '@/components/bump-chart';

interface PeriodResult {
  periodId: number;
  periodName: string;
  bestBallScore: number;
  locked: boolean;
}

interface Standing {
  team: { id: number; name: string };
  periods: PeriodResult[];
  firstThirdScore: number;
  weeklyTotal: number;
  cumulativeScore: number;
}

type StandingsData = {
  standings: Standing[];
  periods: Array<{ id: number; name: string; startDate: string; endDate: string }>;
  lockedPeriodIds: number[];
};

interface RankingsData {
  teamRankings: Array<{
    teamId: number;
    teamName: string;
    weeks: Array<{ week: string; score: number; rank: number }>;
  }>;
  weeks: string[];
}

export default function StandingsPage() {
  const [data, setData] = useState<StandingsData | null>(null);
  const [rankings, setRankings] = useState<RankingsData | null>(null);
  const [loading, setLoading] = useState(true);
  // 'cumulative' | periodId (number)
  const [view, setView] = useState<'cumulative' | number>('cumulative');

  useEffect(() => {
    Promise.all([
      fetchData<StandingsData>('/api/standings'),
      fetchData<RankingsData>('/api/rankings'),
    ]).then(([standingsData, rankingsData]) => {
      setData(standingsData);
      setRankings(rankingsData);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-5 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  const standings = data?.standings || [];
  const periods = data?.periods || [];
  const lockedPeriodIds = new Set(data?.lockedPeriodIds ?? []);

  // For period-specific view: sort by that period's score
  const selectedPeriod = typeof view === 'number' ? periods.find(p => p.id === view) : null;
  const displayStandings = selectedPeriod
    ? [...standings].sort((a, b) => {
        const aScore = a.periods.find(p => p.periodId === selectedPeriod.id)?.bestBallScore ?? 0;
        const bScore = b.periods.find(p => p.periodId === selectedPeriod.id)?.bestBallScore ?? 0;
        return bScore - aScore;
      })
    : standings;

  const weekPeriods = periods.filter(p => !lockedPeriodIds.has(p.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Standings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">First third locked · weekly best-ball scoring</p>
      </div>

      {/* Bump Chart */}
      {rankings && rankings.weeks.length > 1 && (
        <BumpChart
          entries={rankings.teamRankings.map(t => ({
            id: t.teamId,
            name: t.teamName,
            weeks: t.weeks,
          }))}
          weeks={rankings.weeks}
          maxRank={rankings.teamRankings.length}
          title="Rankings Race"
          subtitle="Cumulative best-ball score rankings by week"
        />
      )}

      {/* View toggles */}
      <div className="flex gap-1 flex-wrap" role="tablist" aria-label="Period filter">
        <button
          onClick={() => setView('cumulative')}
          role="tab"
          aria-selected={view === 'cumulative'}
          className={`min-h-[38px] px-3.5 py-2 sm:py-1.5 text-xs rounded-md transition-colors ${
            view === 'cumulative'
              ? 'bg-accent text-accent-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Overall
        </button>
        {/* First Third locked period */}
        {periods.filter(p => lockedPeriodIds.has(p.id)).map(p => (
          <button
            key={p.id}
            onClick={() => setView(p.id)}
            role="tab"
            aria-selected={view === p.id}
            className={`min-h-[38px] px-3.5 py-2 sm:py-1.5 text-xs rounded-md transition-colors ${
              view === p.id
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            1st Third
          </button>
        ))}
        {/* Weekly periods */}
        {weekPeriods.map(p => (
          <button
            key={p.id}
            onClick={() => setView(p.id)}
            role="tab"
            aria-selected={view === p.id}
            className={`min-h-[38px] px-3.5 py-2 sm:py-1.5 text-xs rounded-md transition-colors ${
              view === p.id
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5 w-10"></th>
              <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5">Team</th>
              {view === 'cumulative' ? (
                <>
                  <th className="text-right text-[11px] font-medium text-muted-foreground px-4 py-2.5">1st Third</th>
                  <th className="text-right text-[11px] font-medium text-muted-foreground px-4 py-2.5">Weekly</th>
                  <th className="text-right text-[11px] font-medium text-muted-foreground px-4 py-2.5">Total</th>
                </>
              ) : (
                <th className="text-right text-[11px] font-medium text-muted-foreground px-4 py-2.5">Score</th>
              )}
            </tr>
          </thead>
          <tbody>
            {displayStandings.map((s, idx) => (
              <tr key={s.team.id} className={`border-b border-border/50 hover:bg-muted/30 ${idx === 0 ? 'bg-accent/20' : ''}`}>
                <td className="px-4 py-2.5">
                  <span className={`text-xs tabular-nums ${idx === 0 ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                    {idx + 1}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <Link href={`/teams/${s.team.id}`} className="inline-flex items-center min-h-[36px] -my-2 text-sm font-medium hover:text-primary">
                    {s.team.name}
                  </Link>
                </td>
                {view === 'cumulative' ? (
                  <>
                    <td className="px-4 py-2.5 text-right text-sm tabular-nums text-muted-foreground">
                      {s.firstThirdScore || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm tabular-nums text-muted-foreground">
                      {s.weeklyTotal || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm tabular-nums font-semibold">
                      {s.cumulativeScore}
                    </td>
                  </>
                ) : (
                  <td className="px-4 py-2.5 text-right text-sm tabular-nums font-semibold">
                    {s.periods.find(p => p.periodId === (view as number))?.bestBallScore ?? '—'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
