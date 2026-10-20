import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface StandingsTeam {
  id?: string;
  name: string;
  gf: number;
  ga: number;
  points: number;
  gp?: number;
  gamesPlayed?: number;
  matches?: number;
  w?: number;
  d?: number;
  l?: number;
}

interface LeagueStandingsTableProps {
  standings?: StandingsTeam[];
  className?: string;
}

export function LeagueStandingsTable({ standings, className }: LeagueStandingsTableProps) {
  const sorted = (standings || []).slice().sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga));

  return (
    <div className={cn("rounded-md border overflow-x-auto w-full min-w-0 max-w-full", className)}>
      <Table className="w-full min-w-[280px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 px-2 text-center">#</TableHead>
            <TableHead className="px-2">Tým</TableHead>
            <TableHead className="text-center px-1 font-bold">Z</TableHead>
            <TableHead className="text-center px-1">GF</TableHead>
            <TableHead className="text-center px-1">GA</TableHead>
            <TableHead className="text-right px-2">B</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((team, idx) => {
            const isAces = team.name.toLowerCase().includes('aces');
            const gamesPlayed =
              team.gp ??
              team.gamesPlayed ??
              team.matches ??
              (team.w != null && team.l != null ? team.w + (team.d || 0) + team.l : null);

            return (
              <TableRow
                key={team.id || team.name}
                className={cn(isAces && 'bg-primary/10 font-bold border-l-2 border-l-primary')}
              >
                <TableCell className="px-2 text-center tabular-nums">{idx + 1}.</TableCell>
                <TableCell className="px-2">
                  <span className={cn(isAces && 'text-primary')}>{team.name}</span>
                </TableCell>
                <TableCell className="text-center px-1 tabular-nums font-semibold text-foreground/80">
                  {gamesPlayed !== null ? gamesPlayed : '-'}
                </TableCell>
                <TableCell className="text-center px-1 tabular-nums">{team.gf}</TableCell>
                <TableCell className="text-center px-1 tabular-nums">{team.ga}</TableCell>
                <TableCell className="text-right px-2 font-bold tabular-nums text-foreground">
                  {team.points}
                </TableCell>
              </TableRow>
            );
          })}
          {sorted.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-6 text-muted-foreground italic">
                Tabulka zatím není vyplněna.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
