'use client';

import { useEffect, useState } from 'react';
import { fetchData } from '@/lib/data';

interface UndraftedPlayer {
  id: number;
  name: string;
  mlbTeam: string | null;
  mlbId: number;
  gamesPlayed: number;
  totalScore: number;
  ppg: number;
  proj162: number;
  singles: number;
  doubles: number;
  triples: number;
  stolenBases: number;
}

type SortKey = 'totalScore' | 'ppg' | 'proj162' | 'singles' | 'doubles' | 'triples' | 'stolenBases';

const COLUMNS: { key: SortKey; label: string; abbr?: string }[] = [
  { key: 'totalScore', label: 'Total Pts', abbr: 'Pts' },
  { key: 'ppg', label: 'Avg Pts/Game', abbr: 'PPG' },
  { key: 'proj162', label: 'Proj. Total (162G)', abbr: 'Proj' },
  { key: 'singles', label: 'Singles', abbr: '1B' },
  { key: 'doubles', label: 'Doubles', abbr: '2B' },
  { key: 'triples', label: 'Triples', abbr: '3B' },
  { key: 'stolenBases', label: 'Stolen Bases', abbr: 'SB' },
];

const MLB_NAVY = '#041E42';

export default function UndraftedPage() {
  const [players, setPlayers] = useState<UndraftedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('totalScore');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    fetchData<UndraftedPlayer[]>('/api/undrafted')
      .then(data => { setPlayers(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sorted = [...players].sort((a, b) => {
    const av = a[sortKey] as number;
    const bv = b[sortKey] as number;
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Top 70 Undrafted Players</h1>
        <p className="text-sm text-gray-500 mt-1">Click any column header to sort. Proj based on current pts/game × 162.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ backgroundColor: MLB_NAVY }}>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-300 w-8">#</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-300">Player</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-300">Team</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-300">GP</th>
                {COLUMNS.map(col => {
                  const active = col.key === sortKey;
                  return (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="px-3 py-2.5 text-xs font-semibold text-right cursor-pointer select-none whitespace-nowrap"
                      style={{ color: active ? '#fbbf24' : '#93b4d4' }}
                      title={col.label}
                    >
                      <span className="inline-flex items-center gap-1 justify-end">
                        {col.abbr ?? col.label}
                        {active ? (
                          <span className="text-yellow-400">{sortDir === 'desc' ? '↓' : '↑'}</span>
                        ) : (
                          <span className="opacity-30">↕</span>
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => {
                const isEven = i % 2 === 0;
                return (
                  <tr
                    key={p.id}
                    className="transition-colors hover:bg-blue-50"
                    style={{ backgroundColor: isEven ? 'white' : '#f8fafc' }}
                  >
                    <td className="px-3 py-2 text-gray-400 text-xs w-8">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{p.name}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{p.mlbTeam ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{p.gamesPlayed}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: sortKey === 'totalScore' ? '#1d4ed8' : '#374151', fontWeight: sortKey === 'totalScore' ? 600 : 400 }}>{p.totalScore}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: sortKey === 'ppg' ? '#1d4ed8' : '#374151', fontWeight: sortKey === 'ppg' ? 600 : 400 }}>{p.ppg.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: sortKey === 'proj162' ? '#1d4ed8' : '#374151', fontWeight: sortKey === 'proj162' ? 600 : 400 }}>{p.proj162}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: sortKey === 'singles' ? '#1d4ed8' : '#374151', fontWeight: sortKey === 'singles' ? 600 : 400 }}>{p.singles}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: sortKey === 'doubles' ? '#1d4ed8' : '#374151', fontWeight: sortKey === 'doubles' ? 600 : 400 }}>{p.doubles}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: sortKey === 'triples' ? '#1d4ed8' : '#374151', fontWeight: sortKey === 'triples' ? 600 : 400 }}>{p.triples}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: sortKey === 'stolenBases' ? '#1d4ed8' : '#374151', fontWeight: sortKey === 'stolenBases' ? 600 : 400 }}>{p.stolenBases}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
