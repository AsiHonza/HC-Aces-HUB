import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion } from '@/components/ui/accordion';
import { History, ArrowRight } from 'lucide-react';
import {
  PlayedMatchAccordionItem,
  PlayedMatchData,
} from './PlayedMatchAccordionItem';

export interface RecentMatchesSectionProps {
  matches: PlayedMatchData[];
  usersMap?: Map<string, any>;
  onViewLineup?: (match: PlayedMatchData) => void;
  historyHref?: string;
  className?: string;
}

export function RecentMatchesSection({
  matches,
  usersMap,
  onViewLineup,
  historyHref = '/dashboard/history',
  className,
}: RecentMatchesSectionProps) {
  return (
    <Card className={cn('w-full min-w-0 overflow-hidden border-border/75', className)}>
      <CardHeader className="p-4 sm:p-5 pb-3 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/25">
            <History className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base sm:text-lg font-black leading-none">
              Odehrané zápasy
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Poslední utkání s protokoly z ligy, střelami a statistikami
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-3 sm:px-4 pb-3.5 w-full min-w-0 overflow-hidden">
        {matches.length > 0 ? (
          <Accordion
            type="single"
            collapsible
            className="w-full min-w-0 space-y-2"
          >
            {matches.map((m) => (
              <PlayedMatchAccordionItem
                key={m.id}
                match={m}
                usersMap={usersMap}
                onViewLineup={onViewLineup}
              />
            ))}
          </Accordion>
        ) : (
          <p className="text-center py-8 text-muted-foreground italic text-xs">
            V této sezóně zatím nebyly odehrány žádné zápasy.
          </p>
        )}
      </CardContent>

      <CardFooter className="py-2.5 px-4 sm:px-5 border-t border-border/40 bg-muted/15 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          Kompletní kronika sezóny a play-off
        </span>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-7 px-2.5 font-bold text-primary text-xs hover:text-primary hover:bg-primary/10 rounded-lg"
        >
          <Link href={historyHref} className="flex items-center gap-1">
            Celá historie
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
