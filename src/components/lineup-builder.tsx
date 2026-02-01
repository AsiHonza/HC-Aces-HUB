'use client'

import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, OnDragEndResponder } from '@hello-pangea/dnd';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '@/lib/utils';
import { Card, CardContent } from './ui/card';

interface Player {
  id: string;
  name: string;
  email: string;
  jerseyNumber?: number;
}

interface Lineup {
  PK: Player | null; // Pravé křídlo
  C: Player | null; // Centr
  LK: Player | null; // Levé křídlo
  PO: Player | null; // Pravý obránce
  LO: Player | null; // Levý obránce
  B: Player | null; // Brankář
}

const initialLineup: Lineup = {
  PK: null,
  C: null,
  LK: null,
  PO: null,
  LO: null,
  B: null,
};

const positionNames = {
    PK: "Pravé křídlo",
    C: "Centr",
    LK: "Levé křídlo",
    PO: "Pravý obránce",
    LO: "Levý obránce",
    B: "Brankář"
}

export function LineupBuilder({ players }: { players: Player[] }) {
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>(players);
  const [lineup, setLineup] = useState<Lineup>(initialLineup);

  const onDragEnd: OnDragEndResponder = (result) => {
    const { source, destination } = result;

    if (!destination) {
      return;
    }

    // Moving from available players to a position
    if (source.droppableId === 'availablePlayers' && destination.droppableId.startsWith('pos-')) {
      const position = destination.droppableId.split('-')[1] as keyof Lineup;
      const playerToMove = availablePlayers[source.index];

      // If position is already occupied, move the player back to available
      const currentlyOnPosition = lineup[position];
      const newAvailable = [...availablePlayers];
      newAvailable.splice(source.index, 1);
      if (currentlyOnPosition) {
        newAvailable.push(currentlyOnPosition);
      }
      
      setLineup(prev => ({ ...prev, [position]: playerToMove }));
      setAvailablePlayers(newAvailable);
    }
    // Moving from a position back to available players
    else if (source.droppableId.startsWith('pos-') && destination.droppableId === 'availablePlayers') {
        const position = source.droppableId.split('-')[1] as keyof Lineup;
        const playerToMove = lineup[position];
        if (!playerToMove) return;

        const newAvailable = [...availablePlayers];
        newAvailable.splice(destination.index, 0, playerToMove);

        setLineup(prev => ({ ...prev, [position]: null }));
        setAvailablePlayers(newAvailable);
    }
     // Moving from one position to another
    else if (source.droppableId.startsWith('pos-') && destination.droppableId.startsWith('pos-')) {
        const sourcePosition = source.droppableId.split('-')[1] as keyof Lineup;
        const destPosition = destination.droppableId.split('-')[1] as keyof Lineup;
        if(sourcePosition === destPosition) return;
        
        const sourcePlayer = lineup[sourcePosition];
        const destPlayer = lineup[destPosition];

        setLineup(prev => ({
            ...prev,
            [sourcePosition]: destPlayer,
            [destPosition]: sourcePlayer,
        }))
    }
  };

  const RinkBackground = () => (
    <div className="absolute inset-0 z-0">
        <svg width="100%" height="100%" viewBox="0 0 800 400">
            {/* Ice */}
            <rect width="800" height="400" fill="hsl(var(--secondary))" />
            {/* Center Line */}
            <rect x="398" y="0" width="4" height="400" fill="hsl(var(--destructive))" />
             {/* Blue Lines */}
            <rect x="250" y="0" width="2" height="400" fill="hsl(var(--primary))" opacity="0.7" />
            <rect x="548" y="0" width="2" height="400" fill="hsl(var(--primary))" opacity="0.7" />
             {/* Goal Lines */}
            <rect x="50" y="0" width="2" height="400" fill="hsl(var(--destructive))" opacity="0.5" />
            <rect x="748" y="0" width="2" height="400" fill="hsl(var(--destructive))" opacity="0.5" />
            {/* Center Circle */}
            <circle cx="400" cy="200" r="50" stroke="hsl(var(--primary))" strokeWidth="2" fill="transparent" opacity="0.7" />
            {/* Faceoff Circles */}
            <circle cx="150" cy="100" r="30" stroke="hsl(var(--destructive))" strokeWidth="2" fill="transparent" opacity="0.5" />
            <circle cx="150" cy="300" r="30" stroke="hsl(var(--destructive))" strokeWidth="2" fill="transparent" opacity="0.5" />
            <circle cx="650" cy="100" r="30" stroke="hsl(var(--destructive))" strokeWidth="2" fill="transparent" opacity="0.5" />
            <circle cx="650" cy="300" r="30" stroke="hsl(var(--destructive))" strokeWidth="2" fill="transparent" opacity="0.5" />
        </svg>
    </div>
  )

  const PlayerCard = ({ player, isDragging }: { player: Player, isDragging: boolean}) => (
    <Card className={cn("p-2 flex items-center gap-2 w-48", isDragging ? "bg-primary/20 shadow-lg" : "bg-card")}>
        <Avatar className="h-8 w-8">
            <AvatarImage src={`https://picsum.photos/seed/${player.email}/100/100`} data-ai-hint="player portrait" alt={player.name} />
            <AvatarFallback>{player.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
        </Avatar>
        <div>
            <p className="font-medium text-sm leading-tight">{player.name}</p>
            {player.jerseyNumber && <p className="text-xs text-muted-foreground">#{player.jerseyNumber}</p>}
        </div>
    </Card>
  )

  const PositionDropzone = ({ position, player }: { position: keyof Lineup, player: Player | null }) => (
      <Droppable droppableId={`pos-${position}`}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "h-20 w-48 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-colors",
              snapshot.isDraggingOver ? "border-primary bg-primary/20" : "border-muted-foreground/50 bg-background/50"
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
                <p className="text-muted-foreground font-semibold">{positionNames[position]}</p>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
  )

  return (
    <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex h-full gap-4">
            <Card className="w-64">
                <CardContent className="p-2">
                    <h3 className="p-2 font-semibold">Dostupní hráči</h3>
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
                                    <PlayerCard player={player} isDragging={snapshot.isDragging} />
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
                <div className="relative z-10 h-full flex flex-col justify-around p-4">
                     {/* Forwards */}
                    <div className="flex justify-around items-center">
                        <PositionDropzone position="LK" player={lineup.LK} />
                        <PositionDropzone position="C" player={lineup.C} />
                        <PositionDropzone position="PK" player={lineup.PK} />
                    </div>
                     {/* Defensemen */}
                    <div className="flex justify-around items-center">
                        <PositionDropzone position="LO" player={lineup.LO} />
                        <PositionDropzone position="PO" player={lineup.PO} />
                    </div>
                     {/* Goalie */}
                    <div className="flex justify-center items-center">
                         <PositionDropzone position="B" player={lineup.B} />
                    </div>
                </div>
            </div>
        </div>
    </DragDropContext>
  );
}
