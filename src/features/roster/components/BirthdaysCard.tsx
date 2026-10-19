import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Cake } from 'lucide-react';
import { formatName } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

export interface BirthdayPlayer {
  id: string;
  name: string;
  dob?: string;
}

interface BirthdaysCardProps {
  birthdays: BirthdayPlayer[];
  className?: string;
}

export function BirthdaysCard({ birthdays, className }: BirthdaysCardProps) {
  if (!birthdays || birthdays.length === 0) return null;

  return (
    <Card className={`border-l-4 border-l-amber-600 dark:border-l-amber-500 bg-amber-500/10 shadow-xs ${className || ''}`}>
      <CardContent className="flex items-center gap-4 py-3 px-4">
        <Cake className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
        <div className="flex-1 text-sm">
          <span className="font-bold text-amber-950 dark:text-amber-200">Narozeniny: </span>
          {birthdays.map((u, i) => {
            const dateStr = u.dob ? format(parseISO(u.dob), 'd. M.') : '';
            return (
              <span key={u.id} className="font-semibold text-foreground">
                {formatName(u.name)} {dateStr && <span className="text-muted-foreground font-normal">({dateStr})</span>}
                {i < birthdays.length - 1 ? ', ' : ''}
              </span>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
