import React from 'react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Trophy, Plus, History } from 'lucide-react';
import { UpcomingMatchCard, type UpcomingMatchItem } from '@/features/matches';
import type {
  Match,
  UserProfile,
  LeagueStanding,
  LeagueMatchItem,
  LeagueSkaterItem,
  LeagueGoalieItem,
  LeagueFairPlayItem,
} from '@/types';

interface UpcomingMatchesSectionProps {
  selectedSeasonId: string;
  activeSeasonName: string;
  onSelectCurrentSeason: () => void;
  isAdmin: boolean;
  upcomingMatches: Match[];
  allMatches: Match[];
  archivedSeasons: any[];
  userAttendances: Map<string, any>;
  attendancesByMatch: Map<string, any[]>;
  usersMap: Map<string, UserProfile>;
  currentUserId?: string;
  playerFormMap?: Map<string, any>;
  leagueStandings?: LeagueStanding[];
  leagueMatches?: LeagueMatchItem[];
  leagueSkaters?: LeagueSkaterItem[];
  leagueGoalies?: LeagueGoalieItem[];
  leagueFairPlay?: LeagueFairPlayItem[];
  highlightedMatchId: string | null;
  highlightReason: string | null;
  openAccordionValue: string;
  onOpenAccordionChange: (val: string) => void;
  onAddMatchClick: () => void;
  onRsvp: (matchId: string, status: 'going' | 'not-going') => void;
  onOpenNoteDialog: (matchId: string, status: 'going' | 'not-going', currentNote?: string) => void;
  onShareMatch: (matchId: string) => void;
  onOpenLineupView: (match: UpcomingMatchItem) => void;
  onOpenLineupBuilder: (match: UpcomingMatchItem) => void;
  onRecordResult: (match: UpcomingMatchItem) => void;
  onEditMatch: (match: UpcomingMatchItem) => void;
  onDeleteMatch: (match: UpcomingMatchItem) => void;
}

export const UpcomingMatchesSection = React.memo(function UpcomingMatchesSection({
  selectedSeasonId,
  activeSeasonName,
  onSelectCurrentSeason,
  isAdmin,
  upcomingMatches,
  allMatches,
  archivedSeasons,
  userAttendances,
  attendancesByMatch,
  usersMap,
  currentUserId,
  playerFormMap,
  leagueStandings,
  leagueMatches,
  leagueSkaters,
  leagueGoalies,
  leagueFairPlay,
  highlightedMatchId,
  highlightReason,
  openAccordionValue,
  onOpenAccordionChange,
  onAddMatchClick,
  onRsvp,
  onOpenNoteDialog,
  onShareMatch,
  onOpenLineupView,
  onOpenLineupBuilder,
  onRecordResult,
  onEditMatch,
  onDeleteMatch,
}: UpcomingMatchesSectionProps) {
  if (selectedSeasonId !== 'current') {
    return (
      <div className="p-3.5 sm:p-4 rounded-xl border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left w-full min-w-0 overflow-hidden">
        <div className="flex items-center gap-3">
          <History className="h-5 w-5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Prohlížíte uzavřený ročník <span className="font-semibold text-foreground">{activeSeasonName}</span>. Nadcházející zápasy a docházka jsou aktivní pouze v aktuální sezóně.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onSelectCurrentSeason} className="text-xs h-7 shrink-0">
          Přejít na aktuální sezónu
        </Button>
      </div>
    );
  }

  const nextMatch = upcomingMatches[0];
  const otherMatches = upcomingMatches.slice(1);

  const renderCard = (m: Match) => {
    const attStatus = userAttendances.get(m.id)?.status;
    const matchAttendees = attendancesByMatch.get(m.id) || [];
    const isLineupHighlighted = highlightedMatchId === m.id && highlightReason === 'lineup';

    return (
      <UpcomingMatchCard
        key={m.id}
        match={m as any}
        allMatches={allMatches}
        archivedSeasons={archivedSeasons}
        leagueStandings={leagueStandings}
        leagueMatches={leagueMatches}
        leagueSkaters={leagueSkaters}
        leagueGoalies={leagueGoalies}
        leagueFairPlay={leagueFairPlay}
        attendanceStatus={attStatus as any}
        attendanceNote={userAttendances.get(m.id)?.note}
        attendees={matchAttendees as any}
        usersMap={usersMap}
        currentUserId={currentUserId}
        playerFormMap={playerFormMap}
        isAdmin={isAdmin}
        isCardHighlighted={highlightedMatchId === m.id}
        isLineupHighlighted={isLineupHighlighted}
        onRsvp={(status) => onRsvp(m.id, status)}
        onOpenNoteDialog={() => {
          onOpenNoteDialog(
            m.id,
            attStatus === 'not-going' ? 'not-going' : 'going',
            userAttendances.get(m.id)?.note || ''
          );
        }}
        onShareMatch={onShareMatch}
        onOpenLineupView={onOpenLineupView}
        onOpenLineupBuilder={onOpenLineupBuilder}
        onRecordResult={onRecordResult}
        onEditMatch={onEditMatch}
        onDeleteMatch={onDeleteMatch}
      />
    );
  };

  return (
    <div className="space-y-3 w-full min-w-0 overflow-hidden">
      <div className="flex items-center justify-between px-1 sm:px-0">
        <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
          <Trophy className="text-primary h-4.5 w-4.5" />
          Příští zápasy
        </h2>
        {isAdmin && (
          <Button size="sm" onClick={onAddMatchClick} className="h-7 text-xs font-semibold">
            <Plus className="h-3 w-3 mr-1" />
            Přidat zápas
          </Button>
        )}
      </div>

      {nextMatch ? (
        renderCard(nextMatch)
      ) : (
        <p className="text-center py-6 text-muted-foreground text-xs sm:text-sm">
          Žádné blížící se zápasy.
        </p>
      )}

      {otherMatches.length > 0 && (
        <Accordion
          type="single"
          collapsible
          className="w-full"
          value={openAccordionValue}
          onValueChange={onOpenAccordionChange}
        >
          <AccordionItem value="item-1" className="border-none">
            <AccordionTrigger className="rounded-lg border px-3.5 py-2 bg-card hover:bg-card/80 text-xs font-semibold">
              Další zápasy ({otherMatches.length})
            </AccordionTrigger>
            <AccordionContent className="pt-2.5 space-y-3">
              {otherMatches.map((m) => renderCard(m))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
});
