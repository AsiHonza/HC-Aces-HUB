import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickRsvpButtonsProps {
  currentStatus?: 'going' | 'not-going' | null;
  hasNote?: boolean;
  isLoading?: boolean;
  onRsvp: (status: 'going' | 'not-going') => void;
  onOpenNoteDialog: () => void;
  className?: string;
}

export function QuickRsvpButtons({
  currentStatus,
  hasNote,
  isLoading,
  onRsvp,
  onOpenNoteDialog,
  className,
}: QuickRsvpButtonsProps) {
  const isGoing = currentStatus === 'going';
  const isNotGoing = currentStatus === 'not-going';

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button"
        size="sm"
        disabled={isLoading}
        onClick={() => onRsvp('going')}
        className={cn(
          "h-9 font-bold px-4 transition-all duration-200",
          isGoing
            ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
            : "bg-card border border-border/80 text-foreground hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/40"
        )}
      >
        {isLoading && isGoing ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="mr-1.5 h-3.5 w-3.5" />
        )}
        Jdu
      </Button>

      <Button
        type="button"
        size="sm"
        disabled={isLoading}
        onClick={() => onRsvp('not-going')}
        className={cn(
          "h-9 font-bold px-4 transition-all duration-200",
          isNotGoing
            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md shadow-destructive/20"
            : "bg-card border border-border/80 text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"
        )}
      >
        {isLoading && isNotGoing ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <X className="mr-1.5 h-3.5 w-3.5" />
        )}
        Nejdu
      </Button>

      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onOpenNoteDialog}
        className={cn(
          "h-9 w-9 shrink-0 relative transition-colors",
          hasNote
            ? "border-primary/50 text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
        title={hasNote ? "Zobrazit nebo upravit poznámku" : "Přidat poznámku k účasti"}
        aria-label={hasNote ? "Zobrazit nebo upravit poznámku" : "Přidat poznámku k účasti"}
      >
        <FileText className="h-4 w-4" />
        {hasNote && (
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
        )}
      </Button>
    </div>
  );
}
