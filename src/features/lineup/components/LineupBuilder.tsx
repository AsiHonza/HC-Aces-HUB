import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, OnDragEndResponder } from '@hello-pangea/dnd';
import { Player, Lineup } from '../types';
import { initialLineup, positionNames, getPlayersInLineup } from '../utils/lineup-config';
import { RinkBackground } from './TacticalRinkBoard';
import { PlayerCard } from './PlayerCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, RotateCcw, Search, UserCheck, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeamChemistryData } from '@/features/stats/utils/chemistry';

interface LineupBuilderProps {
  players: Player[];
  initialData?: Lineup | null;
  teamChemistry?: TeamChemistryData | null;
  onSave: (lineup: Lineup) => void;
  onCancel: () => void;
}

export function LineupBuilder({
  players,
  initialData,
  teamChemistry,
  onSave,
  onCancel,
}: LineupBuilderProps) {
  const [lineup, setLineup] = useState<Lineup>(initialData || initialLineup);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [formationCount, setFormationCount] = useState<'2' | '3'>(() =>
    initialData?.LK3 || initialData?.C3 || initialData?.PK3 ? '3' : '2'
  );

  const [availablePlayers, setAvailablePlayers] = useState<Player[]>(() => {
    const playersInLineup = getPlayersInLineup(initialData || initialLineup);
    return players.filter(p => !playersInLineup.includes(p.id));
  });

  const handleFormationChange = (val: string) => {
    const newCount = val as '2' | '3';
    if (newCount === '2' && formationCount === '3') {
      const playersToReturn = [lineup.LK3, lineup.C3, lineup.PK3].filter(Boolean) as Player[];
      if (playersToReturn.length > 0) {
        setAvailablePlayers(prev => [...prev, ...playersToReturn].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        setLineup(prev => ({ ...prev, LK3: null, C3: null, PK3: null }));
      }
    }
    setFormationCount(newCount);
  };

  /**
   * Smart Auto-fill:
   * Maps available players into remaining vacant positions on the ice.
   * Prioritizes goalies for B1, defensemen for LO/PO, centers for C, wings for LK/PK,
   * and fills any remaining vacancies with remaining available players.
   */
  const handleAutoFill = () => {
    const unassigned = [...availablePlayers];
    if (unassigned.length === 0) {
      toast({ title: 'Žádní volní hráči', description: 'Všichni dostupní hráči už jsou v sestavě.' });
      return;
    }

    const newLineup = { ...lineup };
    let placedCount = 0;

    // 1. Assign Goalie to B1 if empty
    if (!newLineup.B1) {
      const goalieIdx = unassigned.findIndex(p => p.playerType === 'goalie' || /brank/i.test(p.name || ''));
      if (goalieIdx !== -1) {
        newLineup.B1 = unassigned.splice(goalieIdx, 1)[0];
        placedCount++;
      } else if (unassigned.length > 0) {
        newLineup.B1 = unassigned.shift()!;
        placedCount++;
      }
    }

    // 2. Specialized position passes
    const defSlots: (keyof Lineup)[] = ['LO1', 'PO1', 'LO2', 'PO2'];
    const centerSlots: (keyof Lineup)[] = formationCount === '3' ? ['C1', 'C2', 'C3'] : ['C1', 'C2'];
    const wingSlots: (keyof Lineup)[] = formationCount === '3' ? ['LK1', 'PK1', 'LK2', 'PK2', 'LK3', 'PK3'] : ['LK1', 'PK1', 'LK2', 'PK2'];

    for (const slot of defSlots) {
      if (!newLineup[slot]) {
        const idx = unassigned.findIndex(p => p.fieldPosition === 'defense');
        if (idx !== -1) {
          newLineup[slot] = unassigned.splice(idx, 1)[0];
          placedCount++;
        }
      }
    }

    for (const slot of centerSlots) {
      if (!newLineup[slot]) {
        const idx = unassigned.findIndex(p => p.fieldPosition === 'center');
        if (idx !== -1) {
          newLineup[slot] = unassigned.splice(idx, 1)[0];
          placedCount++;
        }
      }
    }

    for (const slot of wingSlots) {
      if (!newLineup[slot]) {
        const idx = unassigned.findIndex(p => p.fieldPosition === 'wing');
        if (idx !== -1) {
          newLineup[slot] = unassigned.splice(idx, 1)[0];
          placedCount++;
        }
      }
    }

    // 3. Fallback pass for any remaining empty slots
    const posKeys: (keyof Lineup)[] = formationCount === '3'
      ? ['LK1', 'C1', 'PK1', 'LO1', 'PO1', 'LK2', 'C2', 'PK2', 'LO2', 'PO2', 'LK3', 'C3', 'PK3']
      : ['LK1', 'C1', 'PK1', 'LO1', 'PO1', 'LK2', 'C2', 'PK2', 'LO2', 'PO2'];

    for (const key of posKeys) {
      if (!newLineup[key] && unassigned.length > 0) {
        newLineup[key] = unassigned.shift()!;
        placedCount++;
      }
    }

    setLineup(newLineup);
    setAvailablePlayers(unassigned);
    toast({
      title: 'Sestava předvyplněna podle postů',
      description: `Automaticky bylo obsazeno ${placedCount} pozic (obránci, centři, křídla).`,
    });
  };

  const getLineChemistryGoals = (linePlayers: (Player | null)[]) => {
    if (!teamChemistry) return 0;
    const valid = linePlayers.filter((p): p is Player => Boolean(p));
    let totalSharedGoals = 0;
    for (let i = 0; i < valid.length; i++) {
      for (let j = i + 1; j < valid.length; j++) {
        const p1 = valid[i];
        const p2 = valid[j];
        const p1Chem = teamChemistry.byPlayerId.get(p1.id);
        const shared = p1Chem?.duoGoalsByPartnerId?.[p2.id] || 0;
        totalSharedGoals += shared;
      }
    }
    return totalSharedGoals;
  };

  /**
   * Clear all positions
   */
  const handleClear = () => {
    const inLineup = Object.values(lineup).filter(Boolean) as Player[];
    if (inLineup.length === 0) return;

    setAvailablePlayers(prev => [...prev, ...inLineup].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    setLineup(initialLineup);
    toast({ title: 'Sestava byla vyčištěna' });
  };

  /**
   * Remove single position
   */
  const handleRemoveFromPosition = (positionKey: keyof Lineup) => {
    const player = lineup[positionKey];
    if (!player) return;

    setLineup(prev => ({ ...prev, [positionKey]: null }));
    setAvailablePlayers(prev => [...prev, player].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
  };

  const onDragEnd: OnDragEndResponder = (result) => {
    const { source, destination } = result;
    if (!destination) return;
    const sourceId = source.droppableId;
    const destId = destination.droppableId;

    if (sourceId === 'availablePlayers' && destId.startsWith('pos-')) {
      const position = destId.split('-')[1] as keyof Lineup;
      const playerToMove = filteredAvailablePlayers[source.index];
      if (!playerToMove) return;

      const playerOnPosition = lineup[position];
      const newAvailable = availablePlayers.filter(p => p.id !== playerToMove.id);
      if (playerOnPosition) newAvailable.push(playerOnPosition);

      setLineup(prev => ({ ...prev, [position]: playerToMove }));
      setAvailablePlayers(newAvailable.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    } else if (sourceId.startsWith('pos-') && destId === 'availablePlayers') {
      const position = sourceId.split('-')[1] as keyof Lineup;
      const playerToMove = lineup[position];
      if (!playerToMove) return;

      setLineup(prev => ({ ...prev, [position]: null }));
      setAvailablePlayers(prev => [...prev, playerToMove].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    } else if (sourceId.startsWith('pos-') && destId.startsWith('pos-')) {
      const sourcePosition = sourceId.split('-')[1] as keyof Lineup;
      const destPosition = destId.split('-')[1] as keyof Lineup;
      if (sourcePosition === destPosition) return;

      const sourcePlayer = lineup[sourcePosition];
      const destPlayer = lineup[destPosition];
      setLineup(prev => ({
        ...prev,
        [sourcePosition]: destPlayer,
        [destPosition]: sourcePlayer,
      }));
    }
  };

  const filteredAvailablePlayers = useMemo(() => {
    if (!searchQuery.trim()) return availablePlayers;
    const q = searchQuery.toLowerCase().trim();
    return availablePlayers.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.jerseyNumber && String(p.jerseyNumber).includes(q))
    );
  }, [availablePlayers, searchQuery]);

  const assignedCount = Object.values(lineup).filter(Boolean).length;

  if (isMobile === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const PositionDropzone = ({ positionKey, isSmall }: { positionKey: keyof Lineup; isSmall?: boolean }) => {
    const player = lineup[positionKey];
    const posMeta = positionNames[positionKey];

    return (
      <Droppable droppableId={`pos-${positionKey}`}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all",
              snapshot.isDraggingOver
                ? "border-primary bg-primary/20 scale-105 shadow-lg shadow-primary/30"
                : player
                ? "border-transparent bg-transparent"
                : "border-slate-500/40 bg-slate-900/60 hover:border-slate-400/60 backdrop-blur-sm",
              isSmall ? "h-16 w-36 sm:w-44" : "h-20 w-44 sm:w-52"
            )}
          >
            {player ? (
              <Draggable draggableId={player.id} index={0}>
                {(dragProvided, dragSnapshot) => (
                  <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps}>
                    <PlayerCard
                      player={player}
                      isDragging={dragSnapshot.isDragging}
                      isSmall={isSmall}
                      positionBadge={posMeta.short}
                      onRemove={() => handleRemoveFromPosition(positionKey)}
                    />
                  </div>
                )}
              </Draggable>
            ) : (
              <div className="flex flex-col items-center justify-center p-1 text-center pointer-events-none">
                <span className="text-[11px] sm:text-xs font-black text-slate-300 uppercase tracking-wider">
                  {posMeta.short}
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">
                  {posMeta.line}
                </span>
              </div>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    );
  };

  const MobilePositionCard = ({ positionKey }: { positionKey: keyof Lineup }) => {
    const player = lineup[positionKey];
    const posMeta = positionNames[positionKey];

    return (
      <div className="flex items-center justify-between p-3 rounded-xl border bg-card/60 gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-bold text-xs bg-primary/10 border-primary/30 text-primary w-10 text-center justify-center">
            {posMeta.short}
          </Badge>
          <span className="text-xs font-semibold">{posMeta.full}</span>
        </div>

        <Select
          value={player?.id || 'empty'}
          onValueChange={(val) => {
            if (val === 'empty' || val === 'clear') {
              handleRemoveFromPosition(positionKey);
            } else {
              const selected = availablePlayers.find(p => p.id === val);
              if (selected) {
                const current = lineup[positionKey];
                const newAvail = availablePlayers.filter(p => p.id !== selected.id);
                if (current) newAvail.push(current);
                setLineup(prev => ({ ...prev, [positionKey]: selected }));
                setAvailablePlayers(newAvail.sort((a,b) => (a.name || '').localeCompare(b.name || '')));
              }
            }
          }}
        >
          <SelectTrigger className="w-[160px] h-9 text-xs">
            <SelectValue>
              {player ? (
                <span className="font-bold truncate text-foreground">{player.name}</span>
              ) : (
                <span className="text-muted-foreground italic">Volno</span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="empty">-- Volno --</SelectItem>
            {player && <SelectItem value={player.id} disabled>{player.name} (vybrán)</SelectItem>}
            <SelectSeparator />
            {availablePlayers.map(p => {
              const posTag =
                p.playerType === 'goalie'
                  ? ' [BRA]'
                  : p.fieldPosition === 'defense'
                  ? ' [OBR]'
                  : p.fieldPosition === 'center'
                  ? ' [CEN]'
                  : p.fieldPosition === 'wing'
                  ? ' [KŘÍ]'
                  : '';
              return (
                <SelectItem key={p.id} value={p.id}>
                  {p.jerseyNumber != null ? `#${p.jerseyNumber} ` : ''}{p.name}{posTag}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    );
  };

  const MobileBuilder = () => {
    const line1Chem = getLineChemistryGoals([lineup.LK1, lineup.C1, lineup.PK1, lineup.LO1, lineup.PO1]);
    const line2Chem = getLineChemistryGoals([lineup.LK2, lineup.C2, lineup.PK2, lineup.LO2, lineup.PO2]);
    const line3Chem = getLineChemistryGoals([lineup.LK3, lineup.C3, lineup.PK3]);

    return (
      <div className="flex flex-col h-full overflow-y-auto p-3 space-y-4 pb-20">
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={handleAutoFill} className="flex-1 text-xs">
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
            Předvyplnit podle postů
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear} className="text-xs text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Vyčistit
          </Button>
        </div>

        <Card>
          <CardHeader className="py-3 px-4 bg-muted/20 border-b flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-primary tracking-wider">1. Lajna (Útok & Obrana)</CardTitle>
            {line1Chem > 0 && (
              <Badge variant="outline" className="text-[10px] font-bold bg-orange-500/15 text-orange-500 border-orange-500/40 inline-flex items-center gap-1">
                <Flame className="h-3 w-3 fill-orange-500 text-orange-500" />
                <span>Chemie +{line1Chem} G</span>
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            <MobilePositionCard positionKey="LK1" />
            <MobilePositionCard positionKey="C1" />
            <MobilePositionCard positionKey="PK1" />
            <MobilePositionCard positionKey="LO1" />
            <MobilePositionCard positionKey="PO1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4 bg-muted/20 border-b flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-primary tracking-wider">2. Lajna (Útok & Obrana)</CardTitle>
            {line2Chem > 0 && (
              <Badge variant="outline" className="text-[10px] font-bold bg-orange-500/15 text-orange-500 border-orange-500/40 inline-flex items-center gap-1">
                <Flame className="h-3 w-3 fill-orange-500 text-orange-500" />
                <span>Chemie +{line2Chem} G</span>
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            <MobilePositionCard positionKey="LK2" />
            <MobilePositionCard positionKey="C2" />
            <MobilePositionCard positionKey="PK2" />
            <MobilePositionCard positionKey="LO2" />
            <MobilePositionCard positionKey="PO2" />
          </CardContent>
        </Card>

        {formationCount === '3' && (
          <Card>
            <CardHeader className="py-3 px-4 bg-muted/20 border-b flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-bold uppercase text-primary tracking-wider">3. Útočná lajna</CardTitle>
              {line3Chem > 0 && (
                <Badge variant="outline" className="text-[10px] font-bold bg-orange-500/15 text-orange-500 border-orange-500/40 inline-flex items-center gap-1">
                  <Flame className="h-3 w-3 fill-orange-500 text-orange-500" />
                  <span>Chemie +{line3Chem} G</span>
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              <MobilePositionCard positionKey="LK3" />
              <MobilePositionCard positionKey="C3" />
              <MobilePositionCard positionKey="PK3" />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="py-3 px-4 bg-muted/20 border-b">
            <CardTitle className="text-xs font-bold uppercase text-cyan-500 tracking-wider">Brankář</CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            <MobilePositionCard positionKey="B1" />
          </CardContent>
        </Card>
      </div>
    );
  };

  const DesktopBuilder = () => {
    const isSmall = formationCount === '3';

    return (
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex h-full gap-4 p-4 min-h-0">
          {/* Available Players Drawer */}
          <Card className="w-72 flex flex-col shrink-0 border-border bg-card/60 backdrop-blur-sm">
            <div className="p-3 border-b space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Dostupní hráči ({filteredAvailablePlayers.length})
                </span>
                <Badge variant="outline" className="text-[10px]">
                  V sestavě: {assignedCount}
                </Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Hledat hráče nebo #..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>

            <CardContent className="p-2 flex-1 overflow-hidden min-h-0">
              <Droppable droppableId="availablePlayers">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "p-2 rounded-lg bg-muted/40 h-full overflow-y-auto space-y-2 transition-colors",
                      snapshot.isDraggingOver && 'bg-primary/10 border-primary border'
                    )}
                  >
                    {filteredAvailablePlayers.map((player, index) => (
                      <Draggable key={player.id} draggableId={player.id} index={index}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                          >
                            <PlayerCard
                              player={player}
                              isDragging={dragSnapshot.isDragging}
                              isGhost={dragSnapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {filteredAvailablePlayers.length === 0 && (
                      <p className="text-center py-8 text-xs text-muted-foreground italic">
                        {availablePlayers.length === 0
                          ? 'Všichni hráči jsou nasazeni v sestavě.'
                          : 'Žádný hráč neodpovídá vyhledávání.'}
                      </p>
                    )}
                  </div>
                )}
              </Droppable>
            </CardContent>
          </Card>

          {/* Ice Rink Tactics Board */}
          <div className="flex-1 relative rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl min-h-[560px]">
            <RinkBackground />

            {/* Tactical Grid Overlay */}
            <div className={cn("relative z-10 h-full flex flex-col justify-between p-4 sm:p-6", isSmall && "p-2 sm:p-3")}>
              {/* 1. Attack Line */}
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-card/90 px-3 py-0.5 rounded-full border border-primary/30 shadow-xs">
                    1. Útok
                  </span>
                  {getLineChemistryGoals([lineup.LK1, lineup.C1, lineup.PK1]) > 0 && (
                    <span className="text-[10px] font-bold text-orange-400 bg-slate-950/90 px-2.5 py-0.5 rounded-full border border-orange-500/40 shadow-xs inline-flex items-center gap-1">
                      <Flame className="h-2.5 w-2.5 fill-orange-400 text-orange-400" />
                      <span>Chemie +{getLineChemistryGoals([lineup.LK1, lineup.C1, lineup.PK1])} G</span>
                    </span>
                  )}
                </div>
                <div className="flex justify-around items-center">
                  <PositionDropzone positionKey="LK1" isSmall={isSmall} />
                  <PositionDropzone positionKey="C1" isSmall={isSmall} />
                  <PositionDropzone positionKey="PK1" isSmall={isSmall} />
                </div>
              </div>

              {/* 2. Attack Line */}
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[10px] font-bold text-foreground/80 uppercase tracking-wider bg-card/90 px-3 py-0.5 rounded-full border border-border shadow-xs">
                    2. Útok
                  </span>
                  {getLineChemistryGoals([lineup.LK2, lineup.C2, lineup.PK2]) > 0 && (
                    <span className="text-[10px] font-bold text-orange-400 bg-slate-950/90 px-2.5 py-0.5 rounded-full border border-orange-500/40 shadow-xs inline-flex items-center gap-1">
                      <Flame className="h-2.5 w-2.5 fill-orange-400 text-orange-400" />
                      <span>Chemie +{getLineChemistryGoals([lineup.LK2, lineup.C2, lineup.PK2])} G</span>
                    </span>
                  )}
                </div>
                <div className="flex justify-around items-center">
                  <PositionDropzone positionKey="LK2" isSmall={isSmall} />
                  <PositionDropzone positionKey="C2" isSmall={isSmall} />
                  <PositionDropzone positionKey="PK2" isSmall={isSmall} />
                </div>
              </div>

              {/* Optional 3. Attack Line */}
              {formationCount === '3' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-[10px] font-bold text-foreground/80 uppercase tracking-wider bg-card/90 px-3 py-0.5 rounded-full border border-border shadow-xs">
                      3. Útok
                    </span>
                    {getLineChemistryGoals([lineup.LK3, lineup.C3, lineup.PK3]) > 0 && (
                      <span className="text-[10px] font-bold text-orange-400 bg-slate-950/90 px-2.5 py-0.5 rounded-full border border-orange-500/40 shadow-xs inline-flex items-center gap-1">
                        <Flame className="h-2.5 w-2.5 fill-orange-400 text-orange-400" />
                        <span>Chemie +{getLineChemistryGoals([lineup.LK3, lineup.C3, lineup.PK3])} G</span>
                      </span>
                    )}
                  </div>
                  <div className="flex justify-around items-center">
                    <PositionDropzone positionKey="LK3" isSmall={isSmall} />
                    <PositionDropzone positionKey="C3" isSmall={isSmall} />
                    <PositionDropzone positionKey="PK3" isSmall={isSmall} />
                  </div>
                </div>
              )}

              {/* Defense Pairs */}
              <div className="space-y-2">
                <div className="flex justify-around items-center">
                  <PositionDropzone positionKey="LO1" isSmall={isSmall} />
                  <PositionDropzone positionKey="PO1" isSmall={isSmall} />
                </div>
                <div className="flex justify-around items-center">
                  <PositionDropzone positionKey="LO2" isSmall={isSmall} />
                  <PositionDropzone positionKey="PO2" isSmall={isSmall} />
                </div>
              </div>

              {/* Goalie */}
              <div className="flex justify-center items-center pt-2">
                <PositionDropzone positionKey="B1" isSmall={isSmall} />
              </div>
            </div>
          </div>
        </div>
      </DragDropContext>
    );
  };

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 bg-background">
      {/* Header Controls */}
      <div className="p-3 sm:p-4 border-b flex-shrink-0 flex flex-wrap items-center justify-between gap-3 bg-muted/20">
        <Tabs value={formationCount} onValueChange={handleFormationChange} className="w-full sm:w-[280px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="2" className="text-xs">2 formace útoku</TabsTrigger>
            <TabsTrigger value="3" className="text-xs">3 formace útoku</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoFill}
            className="text-xs hidden sm:inline-flex"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
            Předvyplnit podle postů
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Vyčistit
          </Button>
        </div>
      </div>

      {/* Main Interactive Board */}
      <div className="flex-1 overflow-hidden min-h-0">
        {isMobile ? <MobileBuilder /> : <DesktopBuilder />}
      </div>

      {/* Footer Actions */}
      <div className="flex-shrink-0 flex items-center justify-between p-3 sm:p-4 border-t bg-card/80 backdrop-blur-md">
        <div className="text-xs text-muted-foreground hidden sm:block">
          Nasazeno hráčů: <span className="font-bold text-foreground">{assignedCount}</span> (
          {lineup.B1 ? '1 brankář' : 'bez brankáře'}, {assignedCount - (lineup.B1 ? 1 : 0)} v poli)
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button variant="outline" onClick={onCancel} className="flex-1 sm:flex-none">
            Zrušit
          </Button>
          <Button onClick={() => onSave(lineup)} className="flex-1 sm:flex-none font-bold">
            Uložit sestavu
          </Button>
        </div>
      </div>
    </div>
  );
}
