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
    <Card className={`border-l-4 border-l-amber-500 bg-amber-500/5 ${className || ''}`}>
      <CardContent className="flex items-center gap-4 py-4">
        <Cake className="h-6 w-6 text-amber-500 shrink-0" />
        <div className="flex-1 text-sm">
          <span className="font-bold">Narozeniny: </span>
          {birthdays.map((u, i) => {
            const dateStr = u.dob ? format(parseISO(u.dob), 'd. M.') : '';
            return (
              <span key={u.id} className="font-medium">
                {formatName(u.name)} {dateStr && `(${dateStr})`}
                {i < birthdays.length - 1 ? ', ' : ''}
              </span>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
