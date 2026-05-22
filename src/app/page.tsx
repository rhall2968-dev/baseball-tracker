'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchData } from '@/lib/data';

interface Standing {
  team: { id: number; name: string };
  periods: Array<{ periodId: number; periodName: string; bestBallScore: number }>;
  cumulativeScore: number;
}

interface StandingsResponse {
  standings: Standing[];
  periods: Array<{ id: number; name: string; startDate: string; endDate: string }>;
}

const MLB_NAVY = '#041E42';
const MLB_RED = '#C8102E';

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg p-3 sm:p-4" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
      <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#93b4d4' }}>
        {label}
      </div>
      <div className="text-white font-bold text-lg sm:text-xl leading-tight">{value}</div>
      {sub && <div className="text-[11px] mt-0.5" style={{ color: '#93b4d4' }}>{sub}</div>}
    </div>
  );
}

function TrophyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<StandingsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData<StandingsResponse>('/api/standings')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-40 rounded-xl animate-pulse" style={{ backgroundColor: MLB_NAVY, opacity: 0.15 }} />
        <div className="h-72 bg-white rounded-xl animate-pulse border border-gray-100 shadow-sm" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-24 bg-white rounded-xl animate-pulse border border-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  const standings = data?.standings || [];
  const periods = data?.periods || [];
  const today = new Date().toISOString().split('T')[0];
  const currentPeriod = periods.find(p => p.startDate <= today && p.endDate >= today);
  const leader = standings[0];

  const fmtMD = (ymd?: string) => {
    if (!ymd) return '';
    const [, m, d] = ymd.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[m - 1]} ${d}`;
  };

  const daysBetween = (a: string, b: string) =>
    Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

  const currentDaysLeft = currentPeriod ? daysBetween(today, currentPeriod.endDate) : 0;

  const shortPeriod = (name: string) => {
    if (name.includes('First')) return '1st';
    if (name.includes('Second')) return '2nd';
    if (name.includes('Third')) return '3rd';
    return name;
  };

  return (
    <div className="space-y-6">

      {/* Hero banner */}
      <div className="rounded-xl p-5 sm:p-6 shadow-lg" style={{ backgroundColor: MLB_NAVY }}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              League Overview
            </h1>
            <p className="text-sm mt-1" style={{ color: '#93b4d4' }}>
              {currentPeriod
                ? <>{currentPeriod.name} · {fmtMD(currentPeriod.startDate)} – {fmtMD(currentPeriod.endDate)}</>
                : 'Preseason'
              }
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-white font-bold text-sm">Best Ball</div>
            <div className="text-[11px]" style={{ color: '#93b4d4' }}>Top 10 of 13 · TB + SB + BB + HBP</div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Teams" value="8" sub="Active" />
          <StatCard
            label="Current Period"
            value={currentPeriod ? shortPeriod(currentPeriod.name) : '—'}
            sub={currentPeriod ? `${fmtMD(currentPeriod.startDate)} – ${fmtMD(currentPeriod.endDate)}` : undefined}
          />
          <StatCard
            label="Days Left"
            value={currentPeriod ? `${currentDaysLeft}` : '—'}
            sub={currentPeriod ? 'in period' : undefined}
          />
          <StatCard
            label="League Leader"
            value={leader?.team.name ?? '—'}
            sub={leader ? `${leader.cumulativeScore} pts` : undefined}
          />
        </div>
      </div>

      {/* Standings table */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span style={{ color: '#D4A017' }}><TrophyIcon /></span>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700">Standings</h2>
          <span className="text-xs text-gray-400">· TB + SB + BB + HBP</span>
        </div>

        <div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: MLB_NAVY }}>
                <th className="text-left px-3 sm:px-4 py-3 w-10">
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#93b4d4' }}>#</span>
                </th>
                <th className="text-left px-3 sm:px-4 py-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#93b4d4' }}>Team</span>
                </th>
                {periods.map(p => (
                  <th key={p.id} className="hidden sm:table-cell text-right px-4 py-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#93b4d4' }}>
                      {shortPeriod(p.name)}
                    </span>
                  </th>
                ))}
                <th className="text-right px-3 sm:px-4 py-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#93b4d4' }}>Total</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, idx) => (
                <tr
                  key={s.team.id}
                  className="border-b border-gray-100 transition-colors hover:bg-blue-50/50 last:border-0"
                  style={idx === 0 ? { backgroundColor: '#fff5f5' } : {}}
                >
                  <td className="px-3 sm:px-4 py-3.5">
                    <span
                      className="text-sm font-bold tabular-nums"
                      style={{ color: idx === 0 ? MLB_RED : '#9ca3af' }}
                    >
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 py-3.5">
                    <Link href={`/teams/${s.team.id}`} className="flex items-center gap-2 group">
                      <span
                        className="text-sm font-semibold group-hover:underline underline-offset-2"
                        style={{ color: idx === 0 ? MLB_NAVY : '#1f2937' }}
                      >
                        {s.team.name}
                      </span>
                      {idx === 0 && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-bold text-white uppercase tracking-wide hidden xs:inline"
                          style={{ backgroundColor: MLB_RED }}
                        >
                          Leader
                        </span>
                      )}
                    </Link>
                  </td>
                  {s.periods.map(p => (
                    <td key={p.periodId} className="hidden sm:table-cell px-4 py-3.5 text-right">
                      <span className="text-sm tabular-nums text-gray-600">
                        {p.bestBallScore || <span className="text-gray-300">—</span>}
                      </span>
                    </td>
                  ))}
                  <td className="px-3 sm:px-4 py-3.5 text-right">
                    <span
                      className="text-sm tabular-nums font-bold"
                      style={{ color: idx === 0 ? MLB_RED : '#1f2937' }}
                    >
                      {s.cumulativeScore}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Period cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {periods.map((p, i) => {
          const isCurrent = p.startDate <= today && p.endDate >= today;
          const isPast = p.endDate < today;
          const periodLeader = [...standings].sort(
            (a, b) => (b.periods[i]?.bestBallScore ?? 0) - (a.periods[i]?.bestBallScore ?? 0)
          )[0];
          const hasData = periodLeader && (periodLeader.periods[i]?.bestBallScore ?? 0) > 0;

          return (
            <div
              key={p.id}
              className="p-4 rounded-xl bg-white shadow-sm"
              style={{
                border: isCurrent ? `2px solid ${MLB_RED}` : '2px solid #e5e7eb',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: MLB_NAVY }}>
                  {shortPeriod(p.name)} Period
                </span>
                {isCurrent && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white uppercase tracking-wide"
                    style={{ backgroundColor: MLB_RED }}
                  >
                    Active
                  </span>
                )}
                {isPast && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-500 uppercase">
                    Final
                  </span>
                )}
                {!isCurrent && !isPast && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-600 uppercase">
                    Upcoming
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-400 mb-3">
                {fmtMD(p.startDate)} – {fmtMD(p.endDate)}
              </p>

              {hasData ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Leader</span>
                  <div className="text-right">
                    <span className="text-sm font-bold" style={{ color: MLB_NAVY }}>
                      {periodLeader.team.name}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">
                      ({periodLeader.periods[i].bestBallScore} pts)
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-300">No data yet</p>
              )}

              {isCurrent && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Days remaining</span>
                    <span className="text-sm font-bold" style={{ color: MLB_RED }}>{currentDaysLeft}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
