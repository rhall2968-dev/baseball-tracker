'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchData } from '@/lib/data';

interface RosterPlayer {
  id: number;
  name: string;
  slug: string;
  mlbTeam: string | null;
  position: string | null;
  draftRound: number | null;
}

interface TeamDetail {
  team: { id: number; name: string };
  roster: RosterPlayer[];
}

interface DraftPick {
  pickNumber: number;
  round: number;
  teamId: number;
  teamName: string;
  playerName: string;
  slug: string;
  position: string | null;
  mlbTeam: string | null;
}

// Team draft position: Cole picks 1st, Markus 2nd, ..., Bobby 8th
const TEAM_DRAFT_POS: Record<number, number> = {
  1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8,
};

const TEAM_NAMES = ['Cole', 'Markus', 'J Mill', 'Ryan', 'Joey', 'Jack', 'Austin', 'Bobby'];

const TEAM_COLORS: Record<number, string> = {
  1: '#1a56db',
  2: '#057a55',
  3: '#9c27b0',
  4: '#C8102E',
  5: '#f57c00',
  6: '#00838f',
  7: '#8B6914',
  8: '#b91c1c',
};

function pickNumber(round: number, teamDraftPos: number): number {
  return round % 2 === 1
    ? (round - 1) * 8 + teamDraftPos
    : (round - 1) * 8 + (9 - teamDraftPos);
}

export default function DraftPage() {
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(
      [1, 2, 3, 4, 5, 6, 7, 8].map(id => fetchData<TeamDetail>(`/api/teams/${id}`))
    ).then(teams => {
      const all: DraftPick[] = [];
      for (const t of teams) {
        const pos = TEAM_DRAFT_POS[t.team.id] ?? t.team.id;
        for (const p of t.roster) {
          if (!p.draftRound) continue;
          all.push({
            pickNumber: pickNumber(p.draftRound, pos),
            round: p.draftRound,
            teamId: t.team.id,
            teamName: t.team.name,
            playerName: p.name,
            slug: p.slug,
            position: p.position,
            mlbTeam: p.mlbTeam,
          });
        }
      }
      all.sort((a, b) => a.pickNumber - b.pickNumber);
      setPicks(all);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-36 rounded-xl animate-pulse" style={{ backgroundColor: '#041E42', opacity: 0.15 }} />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-white rounded-xl animate-pulse border border-gray-100 shadow-sm" />
        ))}
      </div>
    );
  }

  const rounds = Array.from({ length: 13 }, (_, i) =>
    picks.filter(p => p.round === i + 1)
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="rounded-xl p-5 sm:p-6 shadow-lg" style={{ backgroundColor: '#041E42' }}>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1">
          Draft Board
        </h1>
        <p className="text-sm mb-4" style={{ color: '#93b4d4' }}>
          8 teams · 13 rounds · Snake draft · Redrafts on May 31 &amp; Jul 31
        </p>
        <div className="flex flex-wrap gap-2">
          {TEAM_NAMES.map((name, i) => (
            <Link
              key={i}
              href={`/teams/${i + 1}`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-white hover:opacity-80 transition-opacity"
              style={{ backgroundColor: TEAM_COLORS[i + 1] }}
            >
              <span className="opacity-60">#{i + 1}</span>
              {name}
            </Link>
          ))}
        </div>
      </div>

      {/* Draft rounds */}
      {rounds.map((roundPicks, i) => {
        const round = i + 1;
        const isReverse = round % 2 === 0;
        return (
          <div key={round}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#041E42' }}>
                Round {round}
              </span>
              <span className="text-[10px] text-gray-400">
                {isReverse ? '← Bobby picks first' : '→ Cole picks first'}
              </span>
            </div>

            <div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
              {roundPicks.map((pick, idx) => (
                <div
                  key={pick.pickNumber}
                  className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                    idx < roundPicks.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  {/* Pick number */}
                  <span className="text-xs tabular-nums text-gray-400 w-7 shrink-0 font-mono">
                    {pick.pickNumber}
                  </span>

                  {/* Team color dot */}
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: TEAM_COLORS[pick.teamId] }}
                  />

                  {/* Team name */}
                  <Link
                    href={`/teams/${pick.teamId}`}
                    className="text-xs font-bold shrink-0 w-14 hover:underline underline-offset-2"
                    style={{ color: TEAM_COLORS[pick.teamId] }}
                  >
                    {pick.teamName}
                  </Link>

                  {/* Player name */}
                  <Link
                    href={`/players/${pick.slug}`}
                    className="text-sm font-medium text-gray-800 hover:underline underline-offset-2 flex-1 truncate"
                  >
                    {pick.playerName}
                  </Link>

                  {/* Position + MLB team */}
                  <div className="flex items-center gap-2 shrink-0">
                    {pick.position && (
                      <span className="text-[10px] text-gray-400 hidden sm:block">{pick.position}</span>
                    )}
                    {pick.mlbTeam && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">
                        {pick.mlbTeam}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
