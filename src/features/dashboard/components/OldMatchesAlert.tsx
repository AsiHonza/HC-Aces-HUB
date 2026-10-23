import React from 'react';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Archive, Trash2, Loader2 } from 'lucide-react';
import type { Match } from '@/types';

interface OldMatchesAlertProps {
  isAdmin: boolean;
  oldMatches: Match[];
  isCurrentSeason: boolean;
  isProcessing: boolean;
  onArchive: () => void;
  onDelete: () => void;
}

export const OldMatchesAlert = React.memo(function OldMatchesAlert({
  isAdmin,
  oldMatches,
  isCurrentSeason,
  isProcessing,
  onArchive,
  onDelete,
}: OldMatchesAlertProps) {
  if (!isAdmin || oldMatches.length === 0 || !isCurrentSeason) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm w-full min-w-0 overflow-hidden">
      <div className="space-y-1">
        <p className="text-sm font-bold text-amber-500 flex items-center gap-1.5">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          Nalezeno {oldMatches.length} starých zápasů z předchozího období (před 16. 9. 2026)
        </p>
        <p className="text-xs text-muted-foreground">
          Tyto zápasy proběhly před zahájením aktuální sezóny. Chcete je zapsat a archivovat do minulého ročníku, nebo smazat testovací data?
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={onArchive}
          disabled={isProcessing}
          className="text-xs font-semibold border-amber-500/50 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 h-7"
        >
          {isProcessing ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Archive className="mr-1.5 h-3 w-3" />}
          Zapsat a archivovat
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          disabled={isProcessing}
          className="text-xs text-destructive hover:bg-destructive/10 h-7"
        >
          <Trash2 className="mr-1.5 h-3 w-3" />
          Smazat staré zápasy
        </Button>
      </div>
    </div>
  );
});
