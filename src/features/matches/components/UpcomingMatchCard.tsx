import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  MapPin,
  Users,
  Share2,
  MoreHorizontal,
  FileText,
  ClipboardEdit,
  Pencil,
  Trash2,
  View,
  Check,
  X,
  CalendarPlus,
  Shield,
} from 'lucide-react';
import { cn, formatName, isGoaliePlayer } from '@/lib/utils';
import { toJsDate } from '@/lib/dates';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { QuickRsvpButtons } from '@/features/attendance';
import { getMatchDetails, MatchLike } from '../utils/match-details';
import { downloadMatchIcs } from '../utils/calendarIcs';
import { HeadToHeadSection } from './HeadToHeadSection';
import type { Match, UserProfile } from '@/types';

export interface UpcomingMatchAttendee {
  userId: string;
  matchId: string;
  status: 'going' | 'not-going' | 'unknown';
  note?: string;
  isGoalie?: boolean;
}

export interface UpcomingMatchItem extends MatchLike {
  id: string;
  dateTime: any;
  location: string;
  team1?: string;
  team2?: string;
  lineup?: any;
  scorers?: any;
}

export interface UpcomingMatchCardProps {
  match: UpcomingMatchItem;
  allMatches?: Match[];
  archivedSeasons?: any[];
  leagueSkaters?: Array<{ name: string; club: string; goals: number; assists: number; points: number; gamesPlayed?: number }>;
  attendanceStatus?: 'going' | 'not-going' | null;
  attendanceNote?: string;
  attendees?: UpcomingMatchAttendee[];
  usersMap?: Map<string, UserProfile>;
  isAdmin?: boolean;
  isCardHighlighted?: boolean;
  isLineupHighlighted?: boolean;
  onRsvp: (status: 'going' | 'not-going') => void;
  onOpenNoteDialog: () => void;
  onShareMatch?: (matchId: string) => void;
  onOpenLineupView?: (match: UpcomingMatchItem) => void;
  onOpenLineupBuilder?: (match: UpcomingMatchItem) => void;
  onRecordResult?: (match: UpcomingMatchItem) => void;
  onEditMatch?: (match: UpcomingMatchItem) => void;
  onDeleteMatch?: (match: UpcomingMatchItem) => void;
  className?: string;
}

export function UpcomingMatchCard({
  match,
  allMatches = [],
  archivedSeasons = [],
  leagueSkaters = [],
  attendanceStatus,
  attendanceNote,
  attendees = [],
  usersMap,
  isAdmin = false,
  isCardHighlighted = false,
  isLineupHighlighted = false,
  onRsvp,
  onOpenNoteDialog,
  onShareMatch,
  onOpenLineupView,
  onOpenLineupBuilder,
  onRecordResult,
  onEditMatch,
  onDeleteMatch,
  className,
}: UpcomingMatchCardProps) {
  const { prefix, opponent } = getMatchDetails(match);
  const goingAttendees = attendees.filter((a) => a.status === 'going');
  const goingGoalies = goingAttendees.filter((a) => {
    const p = usersMap?.get(a.userId);
    return Boolean(a.isGoalie || isGoaliePlayer(p));
  });

  const sortedAttendees = [...attendees].sort((a, b) => {
    const pA = usersMap?.get(a.userId);
    const pB = usersMap?.get(b.userId);
    const isGoalieA = Boolean(a.isGoalie || isGoaliePlayer(pA));
    const isGoalieB = Boolean(b.isGoalie || isGoaliePlayer(pB));

    if (a.status !== b.status) {
      return a.status === 'going' ? -1 : 1;
    }
    if (isGoalieA !== isGoalieB) {
      return isGoalieA ? -1 : 1;
    }
    const nameA = pA?.name || '';
    const nameB = pB?.name || '';
    return nameA.localeCompare(nameB, 'cs');
  });

  return (
    <Card
      id={`match-${match.id}`}
      className={cn(
        'w-full transition-all border shadow-sm',
        isCardHighlighted && 'animate-highlight-card',
        className
      )}
    >
      <CardHeader className="flex-row items-start justify-between pb-2 pt-4 px-4 sm:px-6">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {prefix && (
              <Badge variant="outline" className="text-[10px] font-bold text-primary uppercase border-primary/30 bg-primary/10">
                {prefix}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
              {format(toJsDate(match.dateTime), 'EEEE d. M. yyyy, HH:mm', { locale: cs })}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl sm:text-2xl font-bold font-headline tracking-tight text-primary">
              HC Aces
            </span>
            <span className="text-xs sm:text-sm text-muted-foreground font-semibold uppercase">
              vs
            </span>
            <span className="text-xl sm:text-2xl font-bold font-headline tracking-tight text-foreground">
              {opponent}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            title="Exportovat utkání do kalendáře (.ics)"
            onClick={() => downloadMatchIcs(match as Match)}
          >
            <CalendarPlus className="h-4 w-4" />
          </Button>

          {onShareMatch && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onShareMatch(match.id)}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}

          {isAdmin && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onOpenLineupBuilder && (
                  <DropdownMenuItem onClick={() => onOpenLineupBuilder(match)}>
                    <FileText className="mr-2 h-4 w-4" /> Sestava
                  </DropdownMenuItem>
                )}
                {onRecordResult && (
                  <DropdownMenuItem onClick={() => onRecordResult(match)}>
                    <ClipboardEdit className="mr-2 h-4 w-4" /> Výsledek
                  </DropdownMenuItem>
                )}
                {onEditMatch && (
                  <DropdownMenuItem onClick={() => onEditMatch(match)}>
                    <Pencil className="mr-2 h-4 w-4" /> Upravit
                  </DropdownMenuItem>
                )}
                {onDeleteMatch && (
                  <DropdownMenuItem
                    onClick={() => onDeleteMatch(match)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Smazat
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="text-sm pb-2 px-4 sm:px-6 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>{match.location}</span>
        </div>

        <HeadToHeadSection
          match={match as Match}
          allMatches={allMatches}
          archivedSeasons={archivedSeasons}
          usersMap={usersMap}
          leagueSkaters={leagueSkaters}
        />
      </CardContent>

      <CardFooter className="flex-col items-start gap-3 pt-2 pb-4 px-4 sm:px-6">
        <div className="flex w-full flex-wrap justify-between gap-3">
          {/* 1-Click RSVP with Quick Note Option */}
          <QuickRsvpButtons
            currentStatus={attendanceStatus}
            hasNote={Boolean(attendanceNote)}
            onRsvp={onRsvp}
            onOpenNoteDialog={onOpenNoteDialog}
            className="w-full sm:w-auto"
          />

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {match.lineup && onOpenLineupView && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenLineupView(match)}
                className={cn(
                  'text-xs font-bold border-primary/40 text-primary hover:bg-primary/10 hover:text-primary',
                  isLineupHighlighted &&
                    'animate-highlight-button border-primary border-2 shadow-primary/50'
                )}
              >
                <View className="mr-1.5 h-3.5 w-3.5" /> Sestava
              </Button>
            )}

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  <Users className="mr-1.5 h-3.5 w-3.5" /> Účast: {goingAttendees.length}
                  {goingGoalies.length > 0 && (
                    <span className="ml-1 text-amber-500 font-bold">
                      ({goingGoalies.length}G)
                    </span>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="p-0 sm:max-w-md">
                <DialogHeader className="p-5 pb-2">
                  <DialogTitle className="flex items-center justify-between text-base">
                    <span>Soupis přihlášených</span>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {goingAttendees.length} potvrzeno
                      {goingGoalies.length > 0 && (
                        <span className="ml-1 text-amber-500 font-bold">
                          ({goingGoalies.length} {goingGoalies.length === 1 ? 'brankář' : goingGoalies.length <= 4 ? 'brankáři' : 'brankářů'})
                        </span>
                      )}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>
                <div className="max-h-[55vh] overflow-y-auto space-y-2 p-5 pt-2 text-left">
                  {sortedAttendees.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-4">
                      Zatím se na tento zápas nikdo nepřihlásil.
                    </p>
                  ) : (
                    sortedAttendees.map((att) => {
                      const p = usersMap?.get(att.userId);
                      if (!p) return null;
                      const isG = Boolean(att.isGoalie || isGoaliePlayer(p));
                      const isGoing = att.status === 'going';

                      return (
                        <div
                          key={att.userId}
                          className={cn(
                            'flex items-center gap-3 p-2.5 rounded-lg border transition-all',
                            isGoing
                              ? isG
                                ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                                : 'bg-green-500/5 border-green-500/20'
                              : 'bg-destructive/5 border-destructive/20 opacity-70'
                          )}
                        >
                          <Avatar className={cn("h-8 w-8 shrink-0", isG && isGoing && "ring-2 ring-amber-500/50")}>
                            <AvatarImage
                              src={
                                p.photoURL ||
                                `https://picsum.photos/seed/${p.email}/80/80`
                              }
                            />
                            <AvatarFallback className="font-bold text-xs">{p.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-semibold truncate leading-tight">
                                {formatName(p.name)}
                              </p>
                              {p.jerseyNumber && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  #{p.jerseyNumber}
                                </span>
                              )}
                              {isG && (
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-[10px] font-bold px-1.5 py-0 flex items-center gap-1 shrink-0",
                                    isGoing
                                      ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40"
                                      : "bg-muted text-muted-foreground"
                                  )}
                                >
                                  <Shield className="h-2.5 w-2.5 text-amber-500" />
                                  Brankář
                                </Badge>
                              )}
                            </div>
                            {att.note && (
                              <p className="text-xs text-muted-foreground italic mt-0.5 break-words">
                                "{att.note}"
                              </p>
                            )}
                          </div>
                          {isGoing ? (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-bold text-xs shrink-0">
                              <Check className="h-4 w-4" />
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-destructive font-semibold text-xs shrink-0">
                              <X className="h-4 w-4" />
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
