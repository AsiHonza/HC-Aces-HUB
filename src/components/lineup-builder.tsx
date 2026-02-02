'use client'

import { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, OnDragEndResponder } from '@hello-pangea/dnd';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Goal, Loader2 } from 'lucide-react';


export interface Player {
  id: string;
  name: string;
  email: string;
  jerseyNumber?: number;
  photoURL?: string | null;
}

export interface Lineup {
  LK1: Player | null; C1: Player | null; PK1: Player | null;
  LO1: Player | null; PO1: Player | null;
  LK2: Player | null; C2: Player | null; PK2: Player | null;
  LO2: Player | null; PO2: Player | null;
  LK3: Player | null; C3: Player | null; PK3: Player | null;
  B1: Player | null;
}

export const initialLineup: Lineup = {
  LK1: null, C1: null, PK1: null,
  LO1: null, PO1: null,
  LK2: null, C2: null, PK2: null,
  LO2: null, PO2: null,
  LK3: null, C3: null, PK3: null,
  B1: null,
};

const positionNames: Record<keyof Lineup, string> = {
    LK1: "Levé křídlo (1)", C1: "Centr (1)", PK1: "Pravé křídlo (1)",
    LO1: "Levý obránce (1)", PO1: "Pravý obránce (1)",
    LK2: "Levé křídlo (2)", C2: "Centr (2)", PK2: "Pravé křídlo (2)",
    LO2: "Levý obránce (2)", PO2: "Pravý obránce (2)",
    LK3: "Levé křídlo (3)", C3: "Centr (3)", PK3: "Pravé křídlo (3)",
    B1: "Brankář",
}

const RinkBackground = () => (
    <div className="absolute inset-0 z-0">
        <svg width="100%" height="100%" viewBox="0 0 400 800">
            {/* Ice */}
            <rect width="400" height="800" fill="hsl(var(--secondary))" />
            {/* Center Line */}
            <rect x="0" y="398" width="400" height="4" fill="hsl(var(--destructive))" />
            {/* Blue Lines */}
            <rect x="0" y="250" width="400" height="2" fill="hsl(var(--primary))" opacity="0.7" />
            <rect x="0" y="548" width="400" height="2" fill="hsl(var(--primary))" opacity="0.7" />
            {/* Goal Lines */}
            <rect x="0" y="50" width="400" height="2" fill="hsl(var(--destructive))" opacity="0.5" />
            <rect x="0" y="748" width="400" height="2" fill="hsl(var(--destructive))" opacity="0.5" />
            {/* Center Circle */}
            <circle cx="200" cy="400" r="75" stroke="hsl(var(--primary))" strokeWidth="2" fill="transparent" opacity="0.7" />
            {/* Faceoff Circles */}
            <circle cx="100" cy="150" r="45" stroke="hsl(var(--destructive))" strokeWidth="2" fill="transparent" opacity="0.5" />
            <circle cx="300" cy="150" r="45" stroke="hsl(var(--destructive))" strokeWidth="2" fill="transparent" opacity="0.5" />
            <circle cx="100" cy="650" r="45" stroke="hsl(var(--destructive))" strokeWidth="2" fill="transparent" opacity="0.5" />
            <circle cx="300" cy="650" r="45" stroke="hsl(var(--destructive))" strokeWidth="2" fill="transparent" opacity="0.5" />
        </svg>
    </div>
)

interface PlayerStats {
    goals: number;
    assists: number;
}

const PlayerCard = ({ player, isDragging, isGhost, isSmall, stats }: { player: Player, isDragging?: boolean, isGhost?: boolean, isSmall?: boolean, stats?: PlayerStats }) => (
    <Card className={cn(
        "p-2 flex items-center gap-2 w-48 bg-card/80 backdrop-blur-sm relative",
        isDragging && "bg-primary/20 shadow-lg",
        isGhost && "opacity-50",
        isSmall && "w-40 p-1 gap-1"
    )}>
        {stats && (stats.goals > 0 || stats.assists > 0) && (
             <div className="absolute -top-2 -right-2 flex flex-col items-end gap-1.5 z-10">
                {stats.goals > 0 && (
                     <div className="flex items-center gap-1.5 bg-background border border-border rounded-full pl-2 pr-3 py-1.5 text-base shadow-lg">
                        <Goal className="h-5 w-5 text-primary" />
                        <span className="font-bold leading-none">{stats.goals}</span>
                    </div>
                )}
                 {stats.assists > 0 && (
                    <div className="flex items-center gap-1.5 bg-background border border-border rounded-full pl-2 pr-3 py-1.5 text-base shadow-lg">
                        <span className="font-bold text-accent leading-none">A</span>
                        <span className="font-bold leading-none">{stats.assists}</span>
                    </div>
                )}
            </div>
        )}
        <Avatar className={cn("h-8 w-8", isSmall && "h-6 w-6")}>
            <AvatarImage src={player.photoURL ?? `https://picsum.photos/seed/${player.email}/100/100`} data-ai-hint="player portrait" alt={player.name} />
            <AvatarFallback>{player.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
        </Avatar>
        <div>
            <p className={cn("font-medium text-sm leading-tight", isSmall && "text-xs")}>{player.name}</p>
            {player.jerseyNumber != null && <p className={cn("text-xs text-muted-foreground", isSmall && "text-[10px]")}>#{player.jerseyNumber}</p>}
        </div>
    </Card>
)

function getPlayersInLineup(lineup: Lineup): string[] {
    return Object.values(lineup).filter(p => p !== null).map(p => p!.id);
}

export function LineupBuilder({ players, initialData, onSave, onCancel }: { players: Player[], initialData?: Lineup | null, onSave: (lineup: Lineup) => void, onCancel: () => void }) {
  const [lineup, setLineup] = useState<Lineup>(initialData || initialLineup);
  const isMobile = useIsMobile();
  const [formationCount, setFormationCount] = useState<'2' | '3'>(() => 
    initialData?.LK3 || initialData?.C3 || initialData?.PK3 ? '3' : '2'
  );

  const [availablePlayers, setAvailablePlayers] = useState<Player[]>(() => {
    const playersInLineup = getPlayersInLineup(initialData || initialLineup);
    return players.filter(p => !playersInLineup.includes(p.id));
  });

  if (isMobile === null) {
    return (
        <div className="flex h-full flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  const handleFormationChange = (val: string) => {
      const newCount = val as '2' | '3';
      if (newCount === '2' && formationCount === '3') {
          const playersToReturn = [lineup.LK3, lineup.C3, lineup.PK3].filter(Boolean) as Player[];
          if (playersToReturn.length > 0) {
              setAvailablePlayers(prev => [...prev, ...playersToReturn].sort((a, b) => a.name.localeCompare(b.name)));
              setLineup(prev => ({ ...prev, LK3: null, C3: null, PK3: null }));
          }
      }
      setFormationCount(newCount);
  };

  const onDragEnd: OnDragEndResponder = (result) => {
    const { source, destination } = result;
    if (!destination) return;
    const sourceId = source.droppableId;
    const destId = destination.droppableId;

    if (sourceId === 'availablePlayers' && destId.startsWith('pos-')) {
        const position = destId.split('-')[1] as keyof Lineup;
        const playerToMove = availablePlayers[source.index];
        const playerOnPosition = lineup[position];
        const newAvailable = availablePlayers.filter(p => p.id !== playerToMove.id);
        if (playerOnPosition) newAvailable.push(playerOnPosition);
        setLineup(prev => ({ ...prev, [position]: playerToMove }));
        setAvailablePlayers(newAvailable);
    }
    else if (sourceId.startsWith('pos-') && destId === 'availablePlayers') {
        const position = sourceId.split('-')[1] as keyof Lineup;
        const playerToMove = lineup[position];
        if (!playerToMove) return;
        const newAvailable = [...availablePlayers];
        newAvailable.splice(destination.index, 0, playerToMove);
        setLineup(prev => ({ ...prev, [position]: null }));
        setAvailablePlayers(newAvailable);
    }
    else if (sourceId.startsWith('pos-') && destId.startsWith('pos-')) {
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

  const MobilePositionSelector = ({ positionKey }: { positionKey: keyof Lineup }) => {
    const player = lineup[positionKey];
    return (
        <div className="grid grid-cols-3 items-center gap-2">
            <Label className="text-right text-xs">{positionNames[positionKey]}</Label>
            <Select
                value={player?.id || 'empty'}
                onValueChange={(playerId) => handlePlayerSelect(positionKey, playerId)}
            >
                <SelectTrigger className="col-span-2">
                    <SelectValue>
                        {player ? (
                             <div className="flex items-center gap-2">
                                 <Avatar className="h-6 w-6">
                                     <AvatarImage src={player.photoURL ?? `https://picsum.photos/seed/${player.email}/100/100`} data-ai-hint="player portrait" alt={player.name} />
                                     <AvatarFallback>{player.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                 </Avatar>
                                 <span>{player.name}</span>
                             </div>
                        ) : 'Nepřiřazeno'}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="empty">Nepřiřazeno</SelectItem>
                    <SelectItem value="clear">-- Vymazat --</SelectItem>
                    <SelectSeparator />
                    {player && <SelectItem value={player.id} disabled>{player.name}</SelectItem>}
                    {availablePlayers.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
  }

  const handlePlayerSelect = (position: keyof Lineup, playerId: string) => {
    const playerCurrentlyOnPosition = lineup[position];
    let newAvailablePlayers = [...availablePlayers];
    if (playerCurrentlyOnPosition) {
        newAvailablePlayers.push(playerCurrentlyOnPosition);
    }
    if (playerId === 'clear' || playerId === 'empty') {
        setLineup(prev => ({ ...prev, [position]: null }));
        setAvailablePlayers(newAvailablePlayers.sort((a,b) => a.name.localeCompare(b.name)));
        return;
    }
    const playerToPlace = newAvailablePlayers.find(p => p.id === playerId);
    if (!playerToPlace) return;
    const finalAvailablePlayers = newAvailablePlayers.filter(p => p.id !== playerId);
    setLineup(prev => ({ ...prev, [position]: playerToPlace }));
    setAvailablePlayers(finalAvailablePlayers.sort((a,b) => a.name.localeCompare(b.name)));
  };


  const PositionDropzone = ({ positionKey, isSmall }: { positionKey: keyof Lineup, isSmall?: boolean }) => {
    const player = lineup[positionKey];
    return (
        <Droppable droppableId={`pos-${positionKey}`}>
            {(provided, snapshot) => (
            <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn( "h-20 w-48 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-colors", snapshot.isDraggingOver ? "border-primary bg-primary/20" : "border-muted-foreground/50 bg-background/50 backdrop-blur-sm", isSmall && "h-16 w-40" )}
            >
                {player ? (
                    <Draggable draggableId={player.id} index={0}>
                        {(provided, snapshot) => (
                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                <PlayerCard player={player} isDragging={snapshot.isDragging} isSmall={isSmall} />
                            </div>
                        )}
                    </Draggable>
                ): ( <p className={cn("text-muted-foreground font-semibold", isSmall && "text-sm")}>{positionNames[positionKey]}</p> )}
                {provided.placeholder}
            </div>
            )}
        </Droppable>
    );
  }

  const MobileBuilder = () => (
    <div className="flex flex-col h-full p-2 gap-4">
        <Card>
            <CardHeader><CardTitle>Sestava</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <h4 className="font-semibold text-center">Útok</h4>
                <MobilePositionSelector positionKey="LK1" />
                <MobilePositionSelector positionKey="C1" />
                <MobilePositionSelector positionKey="PK1" />
                <MobilePositionSelector positionKey="LK2" />
                <MobilePositionSelector positionKey="C2" />
                <MobilePositionSelector positionKey="PK2" />
                {formationCount === '3' && (
                    <>
                        <MobilePositionSelector positionKey="LK3" />
                        <MobilePositionSelector positionKey="C3" />
                        <MobilePositionSelector positionKey="PK3" />
                    </>
                )}
                <h4 className="font-semibold text-center pt-4">Obrana</h4>
                <MobilePositionSelector positionKey="LO1" />
                <MobilePositionSelector positionKey="PO1" />
                <MobilePositionSelector positionKey="LO2" />
                <MobilePositionSelector positionKey="PO2" />
                <h4 className="font-semibold text-center pt-4">Brankář</h4>
                <MobilePositionSelector positionKey="B1" />
            </CardContent>
        </Card>
        <Card className="flex-1 min-h-0">
             <CardHeader><CardTitle>Dostupní hráči</CardTitle></CardHeader>
             <CardContent>
                <ScrollArea className="h-48">
                    <div className="space-y-2">
                        {availablePlayers.map(p => (
                            <div key={p.id} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={p.photoURL ?? `https://picsum.photos/seed/${p.email}/100/100`} data-ai-hint="player portrait" alt={p.name} />
                                    <AvatarFallback>{p.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium text-sm leading-tight">{p.name}</p>
                                    {p.jerseyNumber != null && <p className="text-xs text-muted-foreground">#{p.jerseyNumber}</p>}
                                </div>
                            </div>
                        ))}
                         {availablePlayers.length === 0 && <p className="text-sm text-muted-foreground text-center">Všichni hráči jsou v sestavě.</p>}
                    </div>
                </ScrollArea>
             </CardContent>
        </Card>
    </div>
  )

  const DesktopBuilder = () => {
    const isSmall = formationCount === '3';
    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex h-full gap-4 p-4">
                <Card className="w-64 flex flex-col">
                    <h3 className="p-4 font-semibold">Dostupní hráči</h3>
                    <CardContent className="p-2 flex-1 overflow-hidden">
                        <Droppable droppableId="availablePlayers">
                            {(provided, snapshot) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={cn( "p-2 rounded-lg bg-muted min-h-[500px] h-full overflow-y-auto space-y-2 transition-colors", snapshot.isDraggingOver && 'bg-primary/10' )}
                            >
                                {availablePlayers.map((player, index) => (
                                <Draggable key={player.id} draggableId={player.id} index={index}>
                                    {(provided, snapshot) => (
                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                        <PlayerCard player={player} isDragging={snapshot.isDragging} isGhost={snapshot.isDragging}/>
                                    </div>
                                    )}
                                </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                            )}
                        </Droppable>
                    </CardContent>
                </Card>
                <div className="flex-1 relative rounded-lg overflow-hidden">
                    <RinkBackground />
                    <div className={cn("relative z-10 h-full flex flex-col justify-around p-4", isSmall && "p-2 justify-evenly")}>
                        <div className={cn("space-y-4", isSmall && "space-y-2")}>
                            <div className="flex justify-around items-center">
                                <PositionDropzone positionKey="LK1" isSmall={isSmall} />
                                <PositionDropzone positionKey="C1" isSmall={isSmall} />
                                <PositionDropzone positionKey="PK1" isSmall={isSmall} />
                            </div>
                            <div className="flex justify-around items-center">
                                <PositionDropzone positionKey="LK2" isSmall={isSmall} />
                                <PositionDropzone positionKey="C2" isSmall={isSmall} />
                                <PositionDropzone positionKey="PK2" isSmall={isSmall} />
                            </div>
                             {formationCount === '3' && (
                                <div className="flex justify-around items-center">
                                    <PositionDropzone positionKey="LK3" isSmall={isSmall} />
                                    <PositionDropzone positionKey="C3" isSmall={isSmall} />
                                    <PositionDropzone positionKey="PK3" isSmall={isSmall} />
                                </div>
                            )}
                        </div>
                        <div className={cn("space-y-4", isSmall && "space-y-2")}>
                            <div className="flex justify-around items-center">
                                <PositionDropzone positionKey="LO1" isSmall={isSmall} />
                                <PositionDropzone positionKey="PO1" isSmall={isSmall} />
                            </div>
                            <div className="flex justify-around items-center">
                                <PositionDropzone positionKey="LO2" isSmall={isSmall} />
                                <PositionDropzone positionKey="PO2" isSmall={isSmall} />
                            </div>
                        </div>
                        <div className="flex justify-around items-center">
                            <PositionDropzone positionKey="B1" isSmall={isSmall}/>
                        </div>
                    </div>
                </div>
            </div>
        </DragDropContext>
    );
  }

  return (
    <div className="flex h-full flex-col">
        <div className="p-4 border-b">
             <Tabs value={formationCount} onValueChange={handleFormationChange} className="w-full max-w-sm mx-auto">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="2">2 útočné formace</TabsTrigger>
                    <TabsTrigger value="3">3 útočné formace</TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
        <div className="flex-1 overflow-auto">
            {isMobile ? <MobileBuilder /> : <DesktopBuilder />}
        </div>
        <div className="flex-shrink-0 flex justify-end gap-2 p-4 border-t">
            <Button variant="outline" onClick={onCancel}>Zrušit</Button>
            <Button onClick={() => onSave(lineup)}>Uložit sestavu</Button>
        </div>
    </div>
  );
}


export function LineupDisplay({ lineup, scorers }: { lineup: Lineup, scorers?: { goal: string; assist: string | null }[] }) {
    const isMobile = useIsMobile();

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

    if (isMobile === null) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const MobileDisplay = () => {
        const formations = [
            { title: '1. Útočná formace', positions: ['LK1', 'C1', 'PK1'] as const },
            { title: '1. Obranná dvojice', positions: ['LO1', 'PO1'] as const },
            { title: '2. Útočná formace', positions: ['LK2', 'C2', 'PK2'] as const },
            { title: '2. Obranná dvojice', positions: ['LO2', 'PO2'] as const },
        ];
        if (lineup.LK3 || lineup.C3 || lineup.PK3) {
            formations.push({ title: '3. Útočná formace', positions: ['LK3', 'C3', 'PK3'] as const });
        }
        formations.push({ title: 'Brankář', positions: ['B1'] as const });

        return (
            <ScrollArea className="h-full w-full">
                <div className="p-4 space-y-6">
                    {formations.map((formation) => {
                        const players = formation.positions.map(p => lineup[p]).filter(Boolean) as Player[];
                        if (players.length === 0) return null;

                        return (
                             <div key={formation.title}>
                                <h4 className="font-bold text-lg mb-3">{formation.title}</h4>
                                <div className="space-y-2">
                                {players.map(player => (
                                    <PlayerCard key={player.id} player={player} stats={statsMap.get(player.id)} />
                                ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </ScrollArea>
        )
    }

    const DesktopDisplay = () => {
        const hasThirdLine = !!(lineup.LK3 || lineup.C3 || lineup.PK3);
        const isSmall = hasThirdLine;

        const PositionDisplay = ({ positionKey, isSmall }: { positionKey: keyof Lineup, isSmall?: boolean }) => {
            const player = lineup[positionKey];
            if (!player && ['LK3', 'C3', 'PK3'].includes(positionKey) && !hasThirdLine) {
                return null;
            }

            return (
                <div className={cn("h-20 w-48 rounded-lg bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center", isSmall && "h-16 w-40")}>
                     {player ? <PlayerCard player={player} isSmall={isSmall} stats={statsMap.get(player.id)} /> : <p className={cn("text-muted-foreground font-semibold", isSmall && "text-sm")}>{positionNames[positionKey]}</p>}
                </div>
            )
        }

        return (
            <ScrollArea orientation="horizontal" className="w-full h-full">
                <div className="relative min-w-[620px] h-full">
                    <RinkBackground />
                    <div className={cn("relative z-10 h-full flex flex-col justify-around p-4", isSmall && "p-2 justify-evenly")}>
                        <div className={cn("space-y-4", isSmall && "space-y-2")}>
                            <div className="flex justify-around items-center">
                                <PositionDisplay positionKey="LK1" isSmall={isSmall} />
                                <PositionDisplay positionKey="C1" isSmall={isSmall} />
                                <PositionDisplay positionKey="PK1" isSmall={isSmall} />
                            </div>
                            <div className="flex justify-around items-center">
                                <PositionDisplay positionKey="LK2" isSmall={isSmall} />
                                <PositionDisplay positionKey="C2" isSmall={isSmall} />
                                <PositionDisplay positionKey="PK2" isSmall={isSmall} />
                            </div>
                            {hasThirdLine && (
                                <div className="flex justify-around items-center">
                                    <PositionDisplay positionKey="LK3" isSmall={isSmall} />
                                    <PositionDisplay positionKey="C3" isSmall={isSmall} />
                                    <PositionDisplay positionKey="PK3" isSmall={isSmall} />
                                </div>
                            )}
                        </div>
                        <div className={cn("space-y-4", isSmall && "space-y-2")}>
                            <div className="flex justify-around items-center">
                                <PositionDisplay positionKey="LO1" isSmall={isSmall} />
                                <PositionDisplay positionKey="PO1" isSmall={isSmall} />
                            </div>
                            <div className="flex justify-around items-center">
                                <PositionDisplay positionKey="LO2" isSmall={isSmall} />
                                <PositionDisplay positionKey="PO2" isSmall={isSmall} />
                            </div>
                        </div>
                        <div className="flex justify-around items-center">
                            <PositionDisplay positionKey="B1" isSmall={isSmall}/>
                        </div>
                    </div>
                </div>
            </ScrollArea>
        );
    }
    
    return isMobile ? <MobileDisplay /> : <DesktopDisplay />;
}
