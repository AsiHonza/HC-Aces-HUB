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
} from 'lucide-react';
import { cn, formatName } from '@/lib/utils';
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

  return (
    <Card
      id={`match-${match.id}`}
      className={cn(
        'w-full transition-all border shadow-sm',
        isCardHighlighted && 'animate-highlight-card',
        className
      )}
    >
      <CardHeader className="flex-row items-start justify-between pb-2">
        <div className="space-y-1">
          {prefix && (
            <p className="text-xs font-bold text-primary uppercase">{prefix}</p>
          )}
          <CardTitle className="text-xl sm:text-2xl font-headline">
            {opponent}
          </CardTitle>
          <CardDescription className="font-semibold">
            {format(toJsDate(match.dateTime), 'EEEE, d. M. yyyy, HH:mm', {
              locale: cs,
            })}
          </CardDescription>
        </div>

        <div className="flex items-center gap-1">
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

      <CardContent className="text-sm pb-2 space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
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

      <CardFooter className="flex-col items-start gap-4 pt-2">
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
                <View className="mr-1.5 h-3.5 w-3.5" /> Sestava na ledě
              </Button>
            )}

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  <Users className="mr-1.5 h-3.5 w-3.5" /> Účast: {goingAttendees.length}
                </Button>
              </DialogTrigger>
              <DialogContent className="p-0">
                <DialogHeader className="p-6 pb-0">
                  <DialogTitle>
                    Účastníci ({goingAttendees.length} potvrzeno)
                  </DialogTitle>
                </DialogHeader>
                <div className="max-h-[40vh] overflow-y-auto space-y-2 p-6 pt-2 text-left">
                  {attendees.map((att) => {
                    const p = usersMap?.get(att.userId);
                    if (!p) return null;
                    return (
                      <div
                        key={att.userId}
                        className={cn(
                          'flex items-center gap-3 p-2 rounded-lg border',
                          att.status === 'going'
                            ? 'bg-green-500/5'
                            : 'bg-destructive/5'
                        )}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={
                              p.photoURL ||
                              `https://picsum.photos/seed/${p.email}/80/80`
                            }
                          />
                          <AvatarFallback>{p.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {formatName(p.name)}
                          </p>
                          {att.note && (
                            <p className="text-xs text-muted-foreground italic">
                              "{att.note}"
                            </p>
                          )}
                        </div>
                        {att.status === 'going' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
