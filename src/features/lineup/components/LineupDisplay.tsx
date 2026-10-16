import React, { useState, useMemo } from 'react';
import { Lineup, PlayerStats } from '../types';
import { FORMATION_CONFIGS, formatLineupClipboardText } from '../utils/lineup-config';
import { FormationSlideRow } from './FormationSlideRow';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Eye, Users, Shield } from 'lucide-react';
import { formatName } from '@/lib/utils';

interface LineupDisplayProps {
  lineup: Lineup;
  scorers?: { goal: string; assist: string | null }[];
}

/**
 * Compact Lineup Display (HC Aces HUB Design System)
 * Clean, compact formation sheet optimized for mobile and desktop locker room use.
 */
export function LineupDisplay({
  lineup,
  scorers,
}: LineupDisplayProps) {
  const { toast } = useToast();
  const [showAllLines, setShowAllLines] = useState(false);

  const statsMap = useMemo(() => {
    const map = new Map<string, PlayerStats>();
    if (scorers) {
      for (const scorer of scorers) {
        if (scorer.goal) {
          const currentStats = map.get(scorer.goal) || { goals: 0, assists: 0 };
          currentStats.goals += 1;
          map.set(scorer.goal, currentStats);
        }
        if (scorer.assist) {
          const currentStats = map.get(scorer.assist) || { goals: 0, assists: 0 };
          currentStats.assists += 1;
          map.set(scorer.assist, currentStats);
        }
      }
    }
    return map;
  }, [scorers]);

  const assignedPlayers = useMemo(() => {
    return Object.entries(lineup)
      .filter(([_, p]) => p !== null)
      .map(([key, p]) => ({ key: key as keyof Lineup, player: p! }));
  }, [lineup]);

  const totalGoals = useMemo(() => {
    if (!scorers) return 0;
    return scorers.filter(s => !!s.goal).length;
  }, [scorers]);

  const totalAssists = useMemo(() => {
    if (!scorers) return 0;
    return scorers.filter(s => !!s.assist).length;
  }, [scorers]);

  const hasThirdLine = !!(lineup.LK3 || lineup.C3 || lineup.PK3);

  // Copy lineup to clipboard (clean formatted text)
  const handleCopyLineup = () => {
    const text = formatLineupClipboardText(lineup);
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Sestava zkopírována",
        description: "Formátovaný rozpis pětek byl uložen do schránky.",
      });
    });
  };

  const activeFormationConfigs = FORMATION_CONFIGS.filter(cfg => {
    if (cfg.id === 'attack-3' && !hasThirdLine && !showAllLines) {
      return false;
    }
    return true;
  });

  const attackCount = [lineup.LK1, lineup.C1, lineup.PK1, lineup.LK2, lineup.C2, lineup.PK2, lineup.LK3, lineup.C3, lineup.PK3].filter(Boolean).length;
  const defenseCount = [lineup.LO1, lineup.PO1, lineup.LO2, lineup.PO2].filter(Boolean).length;
  const goalie = lineup.B1;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background text-foreground">
      {/* Top Slim Summary Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2 border-b bg-muted/20 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
          <Badge variant="outline" className="font-bold border-border bg-card text-foreground gap-1 px-2 py-0.5 text-[11px] sm:text-xs">
            <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
            {assignedPlayers.length} hráčů
          </Badge>
          <span className="text-muted-foreground hidden sm:inline">•</span>
          <span className="text-muted-foreground text-[11px] sm:text-xs">
            <strong className="text-foreground">{attackCount}</strong> útočníků
          </span>
          <span className="text-muted-foreground text-[11px] sm:text-xs">•</span>
          <span className="text-muted-foreground text-[11px] sm:text-xs">
            <strong className="text-foreground">{defenseCount}</strong> obránců
          </span>
          <span className="text-muted-foreground text-[11px] sm:text-xs">•</span>
          <span className="text-muted-foreground text-[11px] sm:text-xs flex items-center gap-1">
            <Shield className="h-3 w-3 text-amber-500 shrink-0 inline" />
            Brankář:{' '}
            <strong className="text-amber-500">
              {goalie
                ? goalie.jerseyNumber != null
                  ? `#${goalie.jerseyNumber} ${formatName(goalie.name)}`
                  : formatName(goalie.name)
                : 'Volno'}
            </strong>
          </span>

          {totalGoals > 0 && (
            <>
              <span className="text-muted-foreground hidden sm:inline">•</span>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] font-bold px-1.5 py-0.5">
                {totalGoals} {totalGoals === 1 ? 'gól' : totalGoals < 5 ? 'góly' : 'gólů'} Aces
                {totalAssists > 0 ? ` (${totalAssists} as.)` : ''}
              </Badge>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {!hasThirdLine && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAllLines(!showAllLines)}
              className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
            >
              <Eye className="h-3 w-3 mr-1 text-primary" />
              {showAllLines ? 'Skrýt 3. útok' : 'Zobrazit 3. útok'}
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyLineup}
            className="text-xs h-7 font-semibold shrink-0 px-2.5"
            title="Zkopírovat sestavu do schránky"
          >
            <Copy className="h-3 w-3 mr-1.5 text-primary" />
            <span>Kopírovat sestavu</span>
          </Button>
        </div>
      </div>

      {/* Formations List Area */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-2 sm:p-3 space-y-1.5 max-w-5xl mx-auto w-full pb-4">
        {activeFormationConfigs.map(config => (
          <FormationSlideRow
            key={config.id}
            config={config}
            lineup={lineup}
            statsMap={statsMap}
          />
        ))}
      </div>
    </div>
  );
}
