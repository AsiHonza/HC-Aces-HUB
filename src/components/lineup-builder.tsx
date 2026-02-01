'use client'

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, OnDragEndResponder } from '@hello-pangea/dnd';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '@/lib/utils';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

export interface Player {
  id: string;
  name: string;
  email: string;
  jerseyNumber?: number;
}

export interface Lineup {
  LK1: Player | null; C1: Player | null; PK1: Player | null;
  LO1: Player | null; PO1: Player | null;
  LK2: Player | null; C2: Player | null; PK2: Player | null;
  LO2: Player | null; PO2: Player | null;
  B1: Player | null;
  B2: Player | null;
}

export const initialLineup: Lineup = {
  LK1: null, C1: null, PK1: null,
  LO1: null, PO1: null,
  LK2: null, C2: null, PK2: null,
  LO2: null, PO2: null,
  B1: null, B2: null,
};

const positionNames: Record<keyof Lineup, string> = {
    LK1: "Levé křídlo (1)", C1: "Centr (1)", PK1: "Pravé křídlo (1)",
    LO1: "Levý obránce (1)", PO1: "Pravý obránce (1)",
    LK2: "Levé křídlo (2)", C2: "Centr (2)", PK2: "Pravé křídlo (2)",
    LO2: "Levý obránce (2)", PO2: "Pravý obránce (2)",
    B1: "Brankář (1)", B2: "Brankář (2)",
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

const PlayerCard = ({ player, isDragging, isGhost }: { player: Player, isDragging?: boolean, isGhost?: boolean }) => (
    <Card className={cn(
        "p-2 flex items-center gap-2 w-48 bg-card/80 backdrop-blur-sm", 
        isDragging && "bg-primary/20 shadow-lg",
        isGhost && "opacity-50"
    )}>
        <Avatar className="h-8 w-8">
            <AvatarImage src={`https://picsum.photos/seed/${player.email}/100/100`} data-ai-hint="player portrait" alt={player.name} />
            <AvatarFallback>{player.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
        </Avatar>
        <div>
            <p className="font-medium text-sm leading-tight">{player.name}</p>
            {player.jerseyNumber != null && <p className="text-xs text-muted-foreground">#{player.jerseyNumber}</p>}
        </div>
    </Card>
)

function getPlayersInLineup(lineup: Lineup): string[] {
    return Object.values(lineup).filter(p => p !== null).map(p => p!.id);
}

export function LineupBuilder({ players, initialData, onSave, onCancel }: { players: Player[], initialData?: Lineup | null, onSave: (lineup: Lineup) => void, onCancel: () => void }) {
  const [lineup, setLineup] = useState<Lineup>(initialData || initialLineup);

  const [availablePlayers, setAvailablePlayers] = useState<Player[]>(() => {
    const playersInLineup = getPlayersInLineup(initialData || initialLineup);
    return players.filter(p => !playersInLineup.includes(p.id));
  });

  const onDragEnd: OnDragEndResponder = (result) => {
    const { source, destination } = result;

    if (!destination) return;

    const sourceId = source.droppableId;
    const destId = destination.droppableId;

    // Player from available to a position
    if (sourceId === 'availablePlayers' && destId.startsWith('pos-')) {
        const position = destId.split('-')[1] as keyof Lineup;
        const playerToMove = availablePlayers[source.index];
        const playerOnPosition = lineup[position];

        const newAvailable = availablePlayers.filter(p => p.id !== playerToMove.id);
        if (playerOnPosition) {
            newAvailable.push(playerOnPosition);
        }

        setLineup(prev => ({ ...prev, [position]: playerToMove }));
        setAvailablePlayers(newAvailable);
    }
    // Player from a position to available
    else if (sourceId.startsWith('pos-') && destId === 'availablePlayers') {
        const position = sourceId.split('-')[1] as keyof Lineup;
        const playerToMove = lineup[position];

        if (!playerToMove) return;

        const newAvailable = [...availablePlayers];
        newAvailable.splice(destination.index, 0, playerToMove);

        setLineup(prev => ({ ...prev, [position]: null }));
        setAvailablePlayers(newAvailable);
    }
    // Player from one position to another
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

  const PositionDropzone = ({ positionKey }: { positionKey: keyof Lineup }) => {
    const player = lineup[positionKey];
    return (
        <Droppable droppableId={`pos-${positionKey}`}>
            {(provided, snapshot) => (
            <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                "h-20 w-48 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-colors",
                snapshot.isDraggingOver ? "border-primary bg-primary/20" : "border-muted-foreground/50 bg-background/50 backdrop-blur-sm"
                )}
            >
                {player ? (
                    <Draggable draggableId={player.id} index={0}>
                        {(provided, snapshot) => (
                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                <PlayerCard player={player} isDragging={snapshot.isDragging} />
                            </div>
                        )}
                    </Draggable>
                ): (
                    <p className="text-muted-foreground font-semibold">{positionNames[positionKey]}</p>
                )}
                {provided.placeholder}
            </div>
            )}
        </Droppable>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex h-full gap-4">
            <Card className="w-64 flex flex-col">
                <h3 className="p-4 font-semibold">Dostupní hráči</h3>
                <CardContent className="p-2 flex-1 overflow-hidden">
                     <Droppable droppableId="availablePlayers">
                        {(provided, snapshot) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={cn(
                                "p-2 rounded-lg bg-muted min-h-[500px] h-full overflow-y-auto space-y-2 transition-colors",
                                snapshot.isDraggingOver && 'bg-primary/10'
                            )}
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

            <div className="flex-1 flex flex-col gap-4">
                <div className="flex-1 relative rounded-lg overflow-hidden">
                    <RinkBackground />
                    <div className="relative z-10 h-full flex flex-col justify-around p-4">
                        {/* Attacking Zone */}
                        <div className="space-y-4">
                           <div className="flex justify-around items-center">
                                <PositionDropzone positionKey="LK1" />
                                <PositionDropzone positionKey="C1" />
                                <PositionDropzone positionKey="PK1" />
                            </div>
                             <div className="flex justify-around items-center">
                                <PositionDropzone positionKey="LK2" />
                                <PositionDropzone positionKey="C2" />
                                <PositionDropzone positionKey="PK2" />
                            </div>
                        </div>
                        {/* Defensive Zone */}
                        <div className="space-y-4">
                           <div className="flex justify-around items-center">
                                <PositionDropzone positionKey="LO1" />
                                <PositionDropzone positionKey="PO1" />
                            </div>
                            <div className="flex justify-around items-center">
                                <PositionDropzone positionKey="LO2" />
                                <PositionDropzone positionKey="PO2" />
                            </div>
                        </div>
                        {/* Goalies */}
                        <div className="flex justify-around items-center">
                            <PositionDropzone positionKey="B1" />
                            <PositionDropzone positionKey="B2" />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2 p-2">
                    <Button variant="outline" onClick={onCancel}>Zrušit</Button>
                    <Button onClick={() => onSave(lineup)}>Uložit sestavu</Button>
                </div>
            </div>
        </div>
    </DragDropContext>
  );
}


export function LineupDisplay({ lineup }: { lineup: Lineup }) {

    const PositionDisplay = ({ positionKey }: { positionKey: keyof Lineup }) => {
        const player = lineup[positionKey];
        return (
            <div className="h-20 w-48 rounded-lg bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center">
                 {player ? <PlayerCard player={player} /> : <p className="text-muted-foreground font-semibold">{positionNames[positionKey]}</p>}
            </div>
        )
    }

    return (
        <div className="flex-1 relative rounded-lg overflow-hidden">
            <RinkBackground />
            <div className="relative z-10 h-full flex flex-col justify-around p-4">
                 {/* Attacking Zone */}
                <div className="space-y-4">
                    <div className="flex justify-around items-center">
                        <PositionDisplay positionKey="LK1" />
                        <PositionDisplay positionKey="C1" />
                        <PositionDisplay positionKey="PK1" />
                    </div>
                    <div className="flex justify-around items-center">
                        <PositionDisplay positionKey="LK2" />
                        <PositionDisplay positionKey="C2" />
                        <PositionDisplay positionKey="PK2" />
                    </div>
                </div>
                {/* Defensive Zone */}
                <div className="space-y-4">
                    <div className="flex justify-around items-center">
                        <PositionDisplay positionKey="LO1" />
                        <PositionDisplay positionKey="PO1" />
                    </div>
                    <div className="flex justify-around items-center">
                        <PositionDisplay positionKey="LO2" />
                        <PositionDisplay positionKey="PO2" />
                    </div>
                </div>
                {/* Goalies */}
                <div className="flex justify-around items-center">
                    <PositionDisplay positionKey="B1" />
                    <PositionDisplay positionKey="B2" />
                </div>
            </div>
        </div>
    );
}