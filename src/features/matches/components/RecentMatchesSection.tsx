import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion } from '@/components/ui/accordion';
import { History } from 'lucide-react';
import {
  PlayedMatchAccordionItem,
  PlayedMatchData,
} from './PlayedMatchAccordionItem';
import type { UserProfile } from '@/types';

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
    <Card className={cn("w-full min-w-0 overflow-hidden", className)}>
      <CardHeader className="py-3 px-3.5 sm:px-5">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <History className="text-primary h-4 w-4 sm:h-5 sm:w-5" />
          Odehrané zápasy
        </CardTitle>
        <CardDescription className="text-xs">
          Poslední odehraná utkání s podrobnými zápisy z ligy, střelami a statistikami.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-4 pb-3.5 w-full min-w-0 overflow-hidden">
        {matches.length > 0 ? (
          <Accordion type="single" collapsible className="w-full min-w-0 space-y-2.5">
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
          <p className="text-center py-8 text-muted-foreground italic">
            V této sezóně zatím nebyly odehrány žádné zápasy.
          </p>
        )}
      </CardContent>
      <CardFooter className="pt-2 px-4 sm:px-6">
        <Button
          variant="link"
          asChild
          className="p-0 h-auto font-bold text-primary text-xs hover:text-primary/80 transition-colors"
        >
          <Link href={historyHref}>Zobrazit celou historii →</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
