import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, OnDragEndResponder } from '@hello-pangea/dnd';
import { Player, Lineup } from '../types';
import { initialLineup, positionNames } from '../utils/lineup-config';
import { RinkBackground } from './TacticalRinkBoard';
import { PlayerCard } from './PlayerCard';
import { useIsDesktop } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Loader2,
  Sparkles,
  RotateCcw,
  Search,
  UserCheck,
  UserPlus,
  Flame,
  Plus,
  X,
  Check,
  ArrowLeftRight,
  Shield,
} from 'lucide-react';
import { cn, formatName } from '@/lib/utils';
import type { TeamChemistryData } from '@/features/stats/utils/chemistry';

interface LineupBuilderProps {
  players: Player[];
  confirmedPlayerIds?: string[];
  initialData?: Lineup | null;
  teamChemistry?: TeamChemistryData | null;
  isSaving?: boolean;
  onSave: (lineup: Lineup) => void;
  onCancel: () => void;
}

const ALL_SLOT_KEYS: (keyof Lineup)[] = [
  'LK1', 'C1', 'PK1',
  'LO1', 'PO1',
  'LK2', 'C2', 'PK2',
  'LO2', 'PO2',
  'LK3', 'C3', 'PK3',
  'B1',
];

function getSlotTargetRole(slotKey: keyof Lineup): 'goalie' | 'defense' | 'center' | 'wing' {
  if (slotKey === 'B1') return 'goalie';
  if (slotKey.startsWith('LO') || slotKey.startsWith('PO')) return 'defense';
  if (slotKey.startsWith('C')) return 'center';
  return 'wing';
}

function isPlayerMatchingSlotRole(player: Player, slotKey: keyof Lineup): boolean {
  const target = getSlotTargetRole(slotKey);
  if (target === 'goalie') return player.playerType === 'goalie';
  if (player.playerType === 'goalie') return false;
  return player.fieldPosition === target;
}

function getLinePeersForSlot(slotKey: keyof Lineup, lineup: Lineup): (Player | null)[] {
  if (slotKey === 'LK1' || slotKey === 'C1' || slotKey === 'PK1') {
    return [lineup.LK1, lineup.C1, lineup.PK1];
  }
  if (slotKey === 'LO1' || slotKey === 'PO1') {
    return [lineup.LO1, lineup.PO1];
  }
  if (slotKey === 'LK2' || slotKey === 'C2' || slotKey === 'PK2') {
    return [lineup.LK2, lineup.C2, lineup.PK2];
  }
  if (slotKey === 'LO2' || slotKey === 'PO2') {
    return [lineup.LO2, lineup.PO2];
  }
  if (slotKey === 'LK3' || slotKey === 'C3' || slotKey === 'PK3') {
    return [lineup.LK3, lineup.C3, lineup.PK3];
  }
  return [];
}

function getPositionBadgeMeta(player: Player): { label: string; className: string } | null {
  if (player.playerType === 'goalie') {
    return { label: 'BRA', className: 'border-amber-500/40 text-amber-400 bg-amber-500/10' };
  }
  if (player.fieldPosition === 'defense') {
    return { label: 'OBR', className: 'border-blue-500/40 text-blue-400 bg-blue-500/10' };
  }
  if (player.fieldPosition === 'center') {
    return { label: 'CEN', className: 'border-purple-500/40 text-purple-400 bg-purple-500/10' };
  }
  if (player.fieldPosition === 'wing') {
    return { label: 'KŘÍ', className: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' };
  }
  return null;
}

export function LineupBuilder({
  players,
  confirmedPlayerIds,
  initialData,
  teamChemistry,
  isSaving = false,
  onSave,
  onCancel,
}: LineupBuilderProps) {
  const [lineup, setLineup] = useState<Lineup>(() => initialData || initialLineup);
  const isDesktop = useIsDesktop();
  const { toast } = useToast();

  const [formationCount, setFormationCount] = useState<'2' | '3'>(() =>
    initialData?.LK3 || initialData?.C3 || initialData?.PK3 ? '3' : '2'
  );

  const confirmedSet = useMemo(
    () => new Set(confirmedPlayerIds || []),
    [confirmedPlayerIds]
  );
  const hasConfirmedAttendance = confirmedSet.size > 0;

  // Club roster players who didn't confirm attendance, but were manually added (or already in initialData)
  const [manuallyAddedIds, setManuallyAddedIds] = useState<Set<string>>(() => {
    const set = new Set<string>();
    const knownPlayerIds = new Set(players.map((p) => p.id));
    if (initialData) {
      Object.values(initialData).forEach((p) => {
        if (p && p.id && !confirmedSet.has(p.id) && knownPlayerIds.has(p.id)) {
          set.add(p.id);
        }
      });
    }
    return set;
  });

  // Custom guest players not in the club roster
  const [customGuests, setCustomGuests] = useState<Player[]>(() => {
    const guests: Player[] = [];
    const knownPlayerIds = new Set(players.map((p) => p.id));
    if (initialData) {
      const seen = new Set<string>();
      Object.values(initialData).forEach((p) => {
        if (p && p.id && !knownPlayerIds.has(p.id) && !seen.has(p.id)) {
          seen.add(p.id);
          guests.push({ ...p, isGuest: true });
        }
      });
    }
    return guests;
  });

  // Slot picker dialog state
  const [activeSlot, setActiveSlot] = useState<keyof Lineup | null>(null);
  const [pickerTab, setPickerTab] = useState<'confirmed' | 'unconfirmed' | 'guest'>('confirmed');
  const [pickerSearch, setPickerSearch] = useState('');
  const [showMembersInUnconfirmed, setShowMembersInUnconfirmed] = useState(false);

  // Add unconfirmed / guest modal ("+ Dopsat hráče")
  const [isAddPoolModalOpen, setIsAddPoolModalOpen] = useState(false);
  const [addPoolTab, setAddPoolTab] = useState<'roster' | 'guest'>('roster');
  const [addPoolSearch, setAddPoolSearch] = useState('');

  // Desktop left sidebar tab & search
  const [sidebarTab, setSidebarTab] = useState<'pool' | 'unconfirmed' | 'guest'>('pool');
  const [sidebarSearch, setSidebarSearch] = useState('');

  // Quick-assign selected player chip
  const [selectedQuickPlayerId, setSelectedQuickPlayerId] = useState<string | null>(null);

  // Guest creation form states
  const [guestName, setGuestName] = useState('');
  const [guestJersey, setGuestJersey] = useState('');
  const [guestRole, setGuestRole] = useState<'wing' | 'center' | 'defense' | 'goalie'>('wing');

  // Set of player IDs currently assigned to any slot on the ice
  const assignedPlayerIds = useMemo(() => {
    const set = new Set<string>();
    Object.values(lineup).forEach((p) => {
      if (p?.id) set.add(p.id);
    });
    return set;
  }, [lineup]);

  // Complete map of all known players + custom guests
  const allKnownPlayersMap = useMemo(() => {
    const map = new Map<string, Player>();
    players.forEach((p) => map.set(p.id, p));
    customGuests.forEach((g) => map.set(g.id, g));
    Object.values(lineup).forEach((p) => {
      if (p && !map.has(p.id)) map.set(p.id, p);
    });
    return map;
  }, [players, customGuests, lineup]);

  // Active Match Pool: ONLY confirmed players + manually added players + custom guests
  const matchPoolPlayers = useMemo(() => {
    const list: Player[] = [];
    const seen = new Set<string>();

    for (const p of players) {
      if (hasConfirmedAttendance) {
        if (confirmedSet.has(p.id) || manuallyAddedIds.has(p.id)) {
          list.push(p);
          seen.add(p.id);
        }
      } else {
        if (p.playerType !== 'member' || manuallyAddedIds.has(p.id)) {
          list.push(p);
          seen.add(p.id);
        }
      }
    }

    for (const g of customGuests) {
      if (!seen.has(g.id)) {
        list.push(g);
        seen.add(g.id);
      }
    }

    return list.sort((a, b) => {
      const aConf = confirmedSet.has(a.id) ? 1 : 0;
      const bConf = confirmedSet.has(b.id) ? 1 : 0;
      if (bConf !== aConf) return bConf - aConf;
      return (a.name || '').localeCompare(b.name || '', 'cs');
    });
  }, [players, hasConfirmedAttendance, confirmedSet, manuallyAddedIds, customGuests]);

  // Unassigned players from the active match pool
  const unassignedPoolPlayers = useMemo(() => {
    return matchPoolPlayers.filter((p) => !assignedPlayerIds.has(p.id));
  }, [matchPoolPlayers, assignedPlayerIds]);

  // Unconfirmed players from the club roster
  const unconfirmedRosterPlayers = useMemo(() => {
    return players
      .filter((p) => {
        if (confirmedSet.has(p.id)) return false;
        if (manuallyAddedIds.has(p.id)) return false;
        if (assignedPlayerIds.has(p.id)) return false;
        if (!showMembersInUnconfirmed && p.playerType === 'member') return false;
        return true;
      })
      .sort((a, b) => {
        const aIsMember = a.playerType === 'member' ? 1 : 0;
        const bIsMember = b.playerType === 'member' ? 1 : 0;
        if (aIsMember !== bIsMember) return aIsMember - bIsMember;
        return (a.name || '').localeCompare(b.name || '', 'cs');
      });
  }, [players, confirmedSet, manuallyAddedIds, assignedPlayerIds, showMembersInUnconfirmed]);

  const getChemistryWithUnit = (candidateId: string, unitPlayers: (Player | null)[]) => {
    if (!teamChemistry) return 0;
    let score = 0;
    for (const p of unitPlayers) {
      if (!p || p.id === candidateId) continue;
      const chem = teamChemistry.byPlayerId.get(p.id);
      score += chem?.duoGoalsByPartnerId?.[candidateId] || 0;
    }
    return score;
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

  const desktopSidebarPlayers = useMemo(() => {
    const baseList = sidebarTab === 'pool' ? unassignedPoolPlayers : unconfirmedRosterPlayers;
    if (!sidebarSearch.trim()) return baseList;
    const q = sidebarSearch.toLowerCase().trim();
    return baseList.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.jerseyNumber != null && String(p.jerseyNumber).includes(q))
    );
  }, [sidebarTab, unassignedPoolPlayers, unconfirmedRosterPlayers, sidebarSearch]);

  const activeSlotMeta = activeSlot ? positionNames[activeSlot] : null;
  const activeSlotOccupant = activeSlot ? lineup[activeSlot] : null;
  const activeSlotPeers = activeSlot ? getLinePeersForSlot(activeSlot, lineup) : [];

  const sortedSlotPoolCandidates = useMemo(() => {
    if (!activeSlot) return [];
    const q = pickerSearch.toLowerCase().trim();
    return [...unassignedPoolPlayers]
      .filter(
        (p) =>
          !q ||
          (p.name || '').toLowerCase().includes(q) ||
          (p.jerseyNumber != null && String(p.jerseyNumber).includes(q))
      )
      .sort((a, b) => {
        const aMatch = isPlayerMatchingSlotRole(a, activeSlot) ? 1 : 0;
        const bMatch = isPlayerMatchingSlotRole(b, activeSlot) ? 1 : 0;
        if (bMatch !== aMatch) return bMatch - aMatch;

        const aChem = getChemistryWithUnit(a.id, activeSlotPeers);
        const bChem = getChemistryWithUnit(b.id, activeSlotPeers);
        if (bChem !== aChem) return bChem - aChem;

        return (a.name || '').localeCompare(b.name || '', 'cs');
      });
  }, [activeSlot, unassignedPoolPlayers, pickerSearch, activeSlotPeers]);

  const sortedSlotUnconfirmedCandidates = useMemo(() => {
    if (!activeSlot) return [];
    const q = pickerSearch.toLowerCase().trim();
    return [...unconfirmedRosterPlayers]
      .filter(
        (p) =>
          !q ||
          (p.name || '').toLowerCase().includes(q) ||
          (p.jerseyNumber != null && String(p.jerseyNumber).includes(q))
      )
      .sort((a, b) => {
        const aMatch = isPlayerMatchingSlotRole(a, activeSlot) ? 1 : 0;
        const bMatch = isPlayerMatchingSlotRole(b, activeSlot) ? 1 : 0;
        if (bMatch !== aMatch) return bMatch - aMatch;
        return (a.name || '').localeCompare(b.name || '', 'cs');
      });
  }, [activeSlot, unconfirmedRosterPlayers, pickerSearch]);

  const placedElsewherePlayers = useMemo(() => {
    if (!activeSlot) return [];
    const list: Array<{ slotKey: keyof Lineup; player: Player }> = [];
    for (const key of ALL_SLOT_KEYS) {
      if (key === activeSlot) continue;
      if (formationCount === '2' && (key === 'LK3' || key === 'C3' || key === 'PK3')) continue;
      const p = lineup[key];
      if (p) list.push({ slotKey: key, player: p });
    }
    return list;
  }, [activeSlot, lineup, formationCount]);

  const handleFormationChange = (val: string) => {
    const newCount = val as '2' | '3';
    if (newCount === '2' && formationCount === '3') {
      const hasThirdLinePlayers = Boolean(lineup.LK3 || lineup.C3 || lineup.PK3);
      if (hasThirdLinePlayers) {
        setLineup((prev) => ({ ...prev, LK3: null, C3: null, PK3: null }));
      }
    }
    setFormationCount(newCount);
  };

  const assignPlayerToSlot = (slotKey: keyof Lineup, player: Player) => {
    if (!confirmedSet.has(player.id) && !String(player.id).startsWith('guest-')) {
      setManuallyAddedIds((prev) => {
        const next = new Set(prev);
        next.add(player.id);
        return next;
      });
    }

    setLineup((prev) => {
      const next = { ...prev };
      const existingSlotOfPlayer = ALL_SLOT_KEYS.find((k) => next[k]?.id === player.id);
      const currentOccupant = next[slotKey];

      if (existingSlotOfPlayer) {
        next[existingSlotOfPlayer] = currentOccupant;
      }
      next[slotKey] = player;
      return next;
    });

    if (selectedQuickPlayerId === player.id) {
      setSelectedQuickPlayerId(null);
    }
    setActiveSlot(null);
  };

  const handleRemoveFromPosition = (positionKey: keyof Lineup) => {
    setLineup((prev) => ({ ...prev, [positionKey]: null }));
  };

  const handleAddRosterPlayerToPool = (player: Player) => {
    setManuallyAddedIds((prev) => {
      const next = new Set(prev);
      next.add(player.id);
      return next;
    });
    toast({
      title: 'Hráč dopsán do nominace',
      description: `${player.name} je nyní v seznamu hráčů pro tento zápas.`,
    });
  };

  const handleRemoveManualPlayerFromPool = (playerId: string) => {
    setManuallyAddedIds((prev) => {
      const next = new Set(prev);
      next.delete(playerId);
      return next;
    });
    setCustomGuests((prev) => prev.filter((g) => g.id !== playerId));
  };

  const handleCreateGuestPlayer = (targetSlot?: keyof Lineup | null) => {
    const trimmedName = guestName.trim();
    if (!trimmedName) {
      toast({
        variant: 'destructive',
        title: 'Zadejte jméno hráče',
        description: 'Vyplňte prosím jméno nebo přezdívku dopisovaného hráče.',
      });
      return;
    }

    const parsedJersey = guestJersey.trim() ? parseInt(guestJersey.trim(), 10) : undefined;
    const roleToUse = targetSlot ? getSlotTargetRole(targetSlot) : guestRole;

    const newGuest: Player = {
      id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmedName,
      email: '',
      jerseyNumber: !isNaN(parsedJersey as number) ? parsedJersey : undefined,
      playerType: roleToUse === 'goalie' ? 'goalie' : 'player',
      fieldPosition: roleToUse === 'goalie' ? null : roleToUse,
      role: 'classic',
      isGuest: true,
    };

    setCustomGuests((prev) => [...prev, newGuest]);
    setGuestName('');
    setGuestJersey('');

    if (targetSlot) {
      assignPlayerToSlot(targetSlot, newGuest);
      toast({
        title: 'Host dopsán a nasazen',
        description: `${newGuest.name} byl umístěn na pozici ${positionNames[targetSlot].short}.`,
      });
    } else {
      toast({
        title: 'Host přidán do nominace',
        description: `${newGuest.name} je nyní připraven k nasazení do sestavy.`,
      });
      setIsAddPoolModalOpen(false);
    }
  };

  const handleAutoFill = () => {
    const unassigned = [...unassignedPoolPlayers];
    if (unassigned.length === 0) {
      toast({
        title: 'Žádní volní přihlášení hráči',
        description: 'Všichni přihlášení hráči už jsou nasazeni v sestavě.',
      });
      return;
    }

    const totalMatchPlayers = matchPoolPlayers.length;
    let targetFormation = formationCount;
    if (totalMatchPlayers > 11 && formationCount === '2') {
      targetFormation = '3';
      setFormationCount('3');
    }

    const newLineup = { ...lineup };
    let placedCount = 0;

    if (!newLineup.B1) {
      const goalieIdx = unassigned.findIndex(
        (p) => p.playerType === 'goalie' || /brank/i.test(p.name || '')
      );
      if (goalieIdx !== -1) {
        newLineup.B1 = unassigned.splice(goalieIdx, 1)[0];
        placedCount++;
      }
    }

    const pickBestCandidate = (
      predicate: (p: Player) => boolean,
      unitPlayers: (Player | null)[]
    ): Player | null => {
      const matchingIndices = unassigned
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => predicate(p));
      if (matchingIndices.length === 0) return null;

      matchingIndices.sort((a, b) => {
        const confA = confirmedSet.has(a.p.id) ? 1 : 0;
        const confB = confirmedSet.has(b.p.id) ? 1 : 0;
        if (confB !== confA) return confB - confA;
        const chemA = getChemistryWithUnit(a.p.id, unitPlayers);
        const chemB = getChemistryWithUnit(b.p.id, unitPlayers);
        if (chemB !== chemA) return chemB - chemA;
        return 0;
      });

      const chosenIdx = matchingIndices[0].i;
      return unassigned.splice(chosenIdx, 1)[0];
    };

    const defUnits: Array<[keyof Lineup, keyof Lineup]> = [
      ['LO1', 'PO1'],
      ['LO2', 'PO2'],
    ];

    for (const [loKey, poKey] of defUnits) {
      if (!newLineup[loKey]) {
        const chosen = pickBestCandidate(
          (p) => p.playerType !== 'goalie' && p.fieldPosition === 'defense',
          [newLineup[poKey]]
        );
        if (chosen) {
          newLineup[loKey] = chosen;
          placedCount++;
        }
      }
      if (!newLineup[poKey]) {
        const chosen = pickBestCandidate(
          (p) => p.playerType !== 'goalie' && p.fieldPosition === 'defense',
          [newLineup[loKey]]
        );
        if (chosen) {
          newLineup[poKey] = chosen;
          placedCount++;
        }
      }
    }

    const attackUnits: Array<[keyof Lineup, keyof Lineup, keyof Lineup]> =
      targetFormation === '3'
        ? [
            ['LK1', 'C1', 'PK1'],
            ['LK2', 'C2', 'PK2'],
            ['LK3', 'C3', 'PK3'],
          ]
        : [
            ['LK1', 'C1', 'PK1'],
            ['LK2', 'C2', 'PK2'],
          ];

    for (const [lkKey, cKey, pkKey] of attackUnits) {
      if (!newLineup[cKey]) {
        const chosen = pickBestCandidate(
          (p) => p.playerType !== 'goalie' && p.fieldPosition === 'center',
          [newLineup[lkKey], newLineup[pkKey]]
        );
        if (chosen) {
          newLineup[cKey] = chosen;
          placedCount++;
        }
      }
      if (!newLineup[lkKey]) {
        const chosen = pickBestCandidate(
          (p) => p.playerType !== 'goalie' && p.fieldPosition === 'wing',
          [newLineup[cKey], newLineup[pkKey]]
        );
        if (chosen) {
          newLineup[lkKey] = chosen;
          placedCount++;
        }
      }
      if (!newLineup[pkKey]) {
        const chosen = pickBestCandidate(
          (p) => p.playerType !== 'goalie' && p.fieldPosition === 'wing',
          [newLineup[cKey], newLineup[lkKey]]
        );
        if (chosen) {
          newLineup[pkKey] = chosen;
          placedCount++;
        }
      }
    }

    const skaterKeys: (keyof Lineup)[] =
      targetFormation === '3'
        ? ['LK1', 'C1', 'PK1', 'LO1', 'PO1', 'LK2', 'C2', 'PK2', 'LO2', 'PO2', 'LK3', 'C3', 'PK3']
        : ['LK1', 'C1', 'PK1', 'LO1', 'PO1', 'LK2', 'C2', 'PK2', 'LO2', 'PO2'];

    for (const key of skaterKeys) {
      if (!newLineup[key] && unassigned.length > 0) {
        const nonGoalieIdx = unassigned.findIndex((p) => p.playerType !== 'goalie');
        if (nonGoalieIdx !== -1) {
          newLineup[key] = unassigned.splice(nonGoalieIdx, 1)[0];
          placedCount++;
        }
      }
    }

    if (!newLineup.B1 && unassigned.length > 0) {
      newLineup.B1 = unassigned.shift()!;
      placedCount++;
    }

    setLineup(newLineup);
    setSelectedQuickPlayerId(null);
    toast({
      title: 'Sestava předvyplněna z přihlášených hráčů',
      description: `Automaticky bylo rozmístěno ${placedCount} přihlášených hráčů podle postů a souhry.`,
    });
  };

  const handleClear = () => {
    const hasAny = Object.values(lineup).some(Boolean);
    if (!hasAny) return;
    setLineup(initialLineup);
    setSelectedQuickPlayerId(null);
    toast({ title: 'Sestava byla vyčištěna' });
  };

  const onDragEnd: OnDragEndResponder = (result) => {
    const { source, destination } = result;
    if (!destination) return;
    const sourceId = source.droppableId;
    const destId = destination.droppableId;

    if (sourceId === 'availablePlayers' && destId.startsWith('pos-')) {
      const position = destId.split('-')[1] as keyof Lineup;
      const playerToMove = desktopSidebarPlayers[source.index];
      if (!playerToMove) return;
      assignPlayerToSlot(position, playerToMove);
    } else if (sourceId.startsWith('pos-') && destId === 'availablePlayers') {
      const position = sourceId.split('-')[1] as keyof Lineup;
      handleRemoveFromPosition(position);
    } else if (sourceId.startsWith('pos-') && destId.startsWith('pos-')) {
      const sourcePosition = sourceId.split('-')[1] as keyof Lineup;
      const destPosition = destId.split('-')[1] as keyof Lineup;
      if (sourcePosition === destPosition) return;

      setLineup((prev) => ({
        ...prev,
        [sourcePosition]: prev[destPosition],
        [destPosition]: prev[sourcePosition],
      }));
    }
  };

  const openSlotPicker = (slotKey: keyof Lineup) => {
    if (selectedQuickPlayerId) {
      const quickPlayer = allKnownPlayersMap.get(selectedQuickPlayerId);
      if (quickPlayer) {
        assignPlayerToSlot(slotKey, quickPlayer);
        return;
      }
    }

    setActiveSlot(slotKey);
    setPickerSearch('');
    setGuestName('');
    setGuestJersey('');
    setGuestRole(getSlotTargetRole(slotKey));
    if (unassignedPoolPlayers.length > 0 || lineup[slotKey]) {
      setPickerTab('confirmed');
    } else {
      setPickerTab('unconfirmed');
    }
  };

  const assignedCount = Object.values(lineup).filter(Boolean).length;
  const selectedQuickPlayer = selectedQuickPlayerId
    ? allKnownPlayersMap.get(selectedQuickPlayerId) || null
    : null;

  /**
   * Render helper for a single tactical slot tile (< 1024px view)
   */
  const renderTacticalSlotTile = (positionKey: keyof Lineup, isGoalieSlot = false) => {
    const player = lineup[positionKey];
    const posMeta = positionNames[positionKey];
    const isConfirmed = player ? confirmedSet.has(player.id) : false;
    const isGuest = player ? String(player.id).startsWith('guest-') || Boolean(player.isGuest) : false;
    const isManuallyAdded = player ? !isConfirmed && !isGuest : false;
    const roleBadge = player ? getPositionBadgeMeta(player) : null;

    return (
      <div
        key={positionKey}
        role="button"
        tabIndex={0}
        onClick={() => openSlotPicker(positionKey)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openSlotPicker(positionKey);
          }
        }}
        className={cn(
          'group relative flex flex-col justify-between rounded-xl border p-2 sm:p-2.5 text-left transition-all select-none cursor-pointer min-w-0',
          player
            ? isGoalieSlot
              ? 'border-amber-500/45 bg-gradient-to-b from-amber-500/10 via-card/95 to-card shadow-sm hover:border-amber-500'
              : 'border-border/90 bg-gradient-to-b from-card via-card/95 to-muted/20 shadow-sm hover:border-primary/70'
            : selectedQuickPlayer
            ? 'border-2 border-dashed border-primary bg-primary/10 shadow-md shadow-primary/10'
            : isGoalieSlot
            ? 'border-2 border-dashed border-amber-500/35 bg-amber-500/5 hover:border-amber-500/60 hover:bg-amber-500/10'
            : 'border-2 border-dashed border-slate-700/80 bg-slate-900/40 hover:border-primary/50 hover:bg-primary/5'
        )}
      >
        {/* Top Row: Position Short Badge + Role/Remove */}
        <div className="flex items-center justify-between gap-1 w-full min-w-0">
          <span
            className={cn(
              'inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider shrink-0',
              isGoalieSlot
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : player
                ? 'bg-primary/20 text-primary border border-primary/40'
                : 'bg-muted/60 text-muted-foreground border border-border'
            )}
          >
            {posMeta.short}
          </span>

          {player ? (
            <div className="flex items-center gap-1 shrink-0">
              {roleBadge && (
                <span
                  className={cn(
                    'hidden xs:inline-block sm:inline-block text-[8px] font-bold px-1 py-0.2 rounded border uppercase',
                    roleBadge.className
                  )}
                >
                  {roleBadge.label}
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFromPosition(positionKey);
                }}
                className="h-5 w-5 rounded-full bg-muted/80 hover:bg-destructive hover:text-destructive-foreground text-muted-foreground flex items-center justify-center transition-colors shrink-0"
                title="Uvolnit pozici"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <span className="hidden sm:inline text-[10px] text-muted-foreground/70 font-medium truncate">
              {posMeta.full.split(' (')[0]}
            </span>
          )}
        </div>

        {/* Body: Player Info OR Empty Prompt */}
        {player ? (
          <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 min-w-0">
            <Avatar className="hidden sm:flex h-7 w-7 border border-border/80 shrink-0">
              <AvatarImage
                src={player.photoURL ?? `https://picsum.photos/seed/${player.email || player.name}/80/80`}
                alt={player.name}
              />
              <AvatarFallback className="text-[10px] font-bold bg-muted">
                {(player.name || '')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p
                className="text-[11px] sm:text-xs font-bold text-foreground truncate leading-tight"
                title={player.name}
              >
                {player.jerseyNumber != null && (
                  <span className="text-primary font-black font-mono mr-1">
                    #{player.jerseyNumber}
                  </span>
                )}
                {formatName(player.name)}
              </p>
              <div className="flex items-center gap-1 mt-0.5 truncate">
                {isConfirmed ? (
                  <span className="text-[9px] font-semibold text-emerald-400">✓ Přihlášen</span>
                ) : isGuest ? (
                  <span className="text-[9px] font-semibold text-amber-400">Host</span>
                ) : isManuallyAdded ? (
                  <span className="text-[9px] font-semibold text-amber-400">Dopsán</span>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1 pt-2 pb-1 text-muted-foreground group-hover:text-primary transition-colors">
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[11px] font-semibold truncate">
              {selectedQuickPlayer ? 'Sem' : 'Vybrat'}
            </span>
          </div>
        )}
      </div>
    );
  };

  /**
   * Render helper for a Desktop Ice Rink Dropzone (>= 1024px view)
   */
  const renderDesktopDropzone = (positionKey: keyof Lineup, isSmall?: boolean) => {
    const player = lineup[positionKey];
    const posMeta = positionNames[positionKey];
    const isConfirmed = player ? confirmedSet.has(player.id) : false;
    const isGuest = player ? String(player.id).startsWith('guest-') || Boolean(player.isGuest) : false;
    const isManuallyAdded = player ? !isConfirmed && !isGuest : false;

    return (
      <Droppable key={positionKey} droppableId={`pos-${positionKey}`}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            onClick={() => openSlotPicker(positionKey)}
            className={cn(
              'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all cursor-pointer w-full max-w-[230px] min-w-0 mx-auto',
              snapshot.isDraggingOver
                ? 'border-primary bg-primary/20 scale-[1.03] shadow-lg shadow-primary/30'
                : player
                ? 'border-transparent bg-transparent'
                : selectedQuickPlayer
                ? 'border-primary bg-primary/15 shadow-md'
                : 'border-slate-500/40 bg-slate-900/65 hover:border-primary/60 hover:bg-slate-900/80 backdrop-blur-sm',
              isSmall ? 'min-h-[62px]' : 'min-h-[72px]'
            )}
          >
            {player ? (
              <Draggable draggableId={player.id} index={0}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    className="w-full"
                  >
                    <PlayerCard
                      player={player}
                      fullWidth
                      isDragging={dragSnapshot.isDragging}
                      isSmall={isSmall}
                      positionBadge={posMeta.short}
                      isConfirmed={isConfirmed}
                      isManuallyAdded={isManuallyAdded}
                      onRemove={() => handleRemoveFromPosition(positionKey)}
                      onClick={() => openSlotPicker(positionKey)}
                    />
                  </div>
                )}
              </Draggable>
            ) : (
              <div className="flex flex-col items-center justify-center p-1.5 text-center pointer-events-none">
                <div className="flex items-center gap-1">
                  <Plus className="h-3 w-3 text-primary" />
                  <span className="text-xs font-black text-slate-200 uppercase tracking-wider">
                    {posMeta.short}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium truncate max-w-full">
                  {selectedQuickPlayer
                    ? `Umístit: ${formatName(selectedQuickPlayer.name)}`
                    : posMeta.full.split(' (')[0]}
                </span>
              </div>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    );
  };

  /**
   * Render Mobile & Tablet Tactical Formation View (< 1024px)
   * Uses a pure block scroll container (`overflow-y-auto overscroll-contain`) so cards NEVER shrink or clip!
   */
  const renderTacticalFormationBoard = () => {
    const line1Chem = getLineChemistryGoals([lineup.LK1, lineup.C1, lineup.PK1, lineup.LO1, lineup.PO1]);
    const line2Chem = getLineChemistryGoals([lineup.LK2, lineup.C2, lineup.PK2, lineup.LO2, lineup.PO2]);
    const line3Chem = getLineChemistryGoals([lineup.LK3, lineup.C3, lineup.PK3]);

    const line1Count = [lineup.LK1, lineup.C1, lineup.PK1, lineup.LO1, lineup.PO1].filter(Boolean).length;
    const line2Count = [lineup.LK2, lineup.C2, lineup.PK2, lineup.LO2, lineup.PO2].filter(Boolean).length;
    const line3Count = [lineup.LK3, lineup.C3, lineup.PK3].filter(Boolean).length;

    return (
      <div
        data-testid="lineup-mobile-scroll"
        className="flex-1 min-h-0 w-full overflow-y-auto overscroll-contain touch-pan-y p-2.5 sm:p-4 space-y-3 pb-6"
      >
        {/* Waiting Players Strip */}
        <div className="rounded-xl border border-border/80 bg-card/70 p-2.5 sm:p-3 space-y-2 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold text-[11px]"
              >
                ✓ Přihlášeno: {confirmedSet.size}
              </Badge>
              {(manuallyAddedIds.size > 0 || customGuests.length > 0) && (
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold text-[11px]"
                >
                  + Dopsáno: {manuallyAddedIds.size + customGuests.length}
                </Badge>
              )}
              <span className="text-muted-foreground text-[11px]">
                V sestavě: <strong className="text-foreground">{assignedCount}</strong>
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAddPoolSearch('');
                setAddPoolTab('roster');
                setIsAddPoolModalOpen(true);
              }}
              className="h-7 text-[11px] font-bold border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 px-2.5"
            >
              <UserPlus className="h-3.5 w-3.5 mr-1" />
              Dopsat hráče
            </Button>
          </div>

          {unassignedPoolPlayers.length > 0 ? (
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-muted-foreground">
                <span>
                  Čekají na zařazení (<strong className="text-foreground">{unassignedPoolPlayers.length}</strong>):
                </span>
                <span className="text-[10px] text-primary font-medium">
                  {selectedQuickPlayer
                    ? `Vybrán ${formatName(selectedQuickPlayer.name)} — klepni na post níže`
                    : 'Klepni na hráče nebo rovnou na post'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
                {unassignedPoolPlayers.map((p) => {
                  const isSelected = selectedQuickPlayerId === p.id;
                  const roleBadge = getPositionBadgeMeta(p);
                  const isConfirmed = confirmedSet.has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setSelectedQuickPlayerId((prev) => (prev === p.id ? null : p.id))
                      }
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold shrink-0 transition-all',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground shadow-md'
                          : 'border-border/80 bg-background/80 hover:border-primary/50 text-foreground'
                      )}
                    >
                      {p.jerseyNumber != null && (
                        <span
                          className={cn(
                            'text-[10px] font-black font-mono',
                            isSelected ? 'text-primary-foreground' : 'text-primary'
                          )}
                        >
                          #{p.jerseyNumber}
                        </span>
                      )}
                      <span>{formatName(p.name)}</span>
                      {roleBadge && (
                        <span
                          className={cn(
                            'text-[9px] font-bold px-1 rounded border',
                            isSelected
                              ? 'border-primary-foreground/40 bg-primary-foreground/20 text-primary-foreground'
                              : roleBadge.className
                          )}
                        >
                          {roleBadge.label}
                        </span>
                      )}
                      {!isConfirmed && (
                        <span
                          className={cn(
                            'text-[8px] font-bold px-1 rounded',
                            isSelected
                              ? 'bg-black/20 text-white'
                              : 'bg-amber-500/15 text-amber-400'
                          )}
                        >
                          Dopsán
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 text-xs text-emerald-400">
              <span className="font-semibold flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 shrink-0" />
                Všichni přihlášení hráči ({matchPoolPlayers.length}) jsou v sestavě!
              </span>
            </div>
          )}
        </div>

        {/* 1. FORMACE (ÚTOK & OBRANA) */}
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-b from-slate-900/90 via-card/90 to-slate-950/90 shadow-md">
          <div className="px-3.5 py-2 rounded-t-2xl bg-primary/10 border-b border-primary/20 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
              <h3 className="text-xs font-black uppercase tracking-wider text-primary truncate">
                1. Formace (Útok & Obrana)
              </h3>
              <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                ({line1Count}/5)
              </span>
            </div>
            {line1Chem > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] font-bold bg-orange-500/15 text-orange-400 border-orange-500/40 inline-flex items-center gap-1 shrink-0"
              >
                <Flame className="h-3 w-3 fill-orange-400 text-orange-400" />
                <span>+{line1Chem} G</span>
              </Badge>
            )}
          </div>

          <div className="p-2.5 sm:p-3 space-y-2.5">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-1.5 flex items-center justify-between px-0.5">
                <span>1. Útočná lajna</span>
                <span>LW • C • RW</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {renderTacticalSlotTile('LK1')}
                {renderTacticalSlotTile('C1')}
                {renderTacticalSlotTile('PK1')}
              </div>
            </div>

            <div className="pt-2 border-t border-border/40">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400/80 mb-1.5 flex items-center justify-between px-0.5">
                <span>1. Obranný pár</span>
                <span>LD • RD</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 sm:max-w-[82%] mx-auto">
                {renderTacticalSlotTile('LO1')}
                {renderTacticalSlotTile('PO1')}
              </div>
            </div>
          </div>
        </div>

        {/* 2. FORMACE (ÚTOK & OBRANA) */}
        <div className="rounded-2xl border border-border/80 bg-gradient-to-b from-slate-900/80 via-card/90 to-slate-950/90 shadow-md">
          <div className="px-3.5 py-2 rounded-t-2xl bg-muted/30 border-b border-border/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground truncate">
                2. Formace (Útok & Obrana)
              </h3>
              <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                ({line2Count}/5)
              </span>
            </div>
            {line2Chem > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] font-bold bg-orange-500/15 text-orange-400 border-orange-500/40 inline-flex items-center gap-1 shrink-0"
              >
                <Flame className="h-3 w-3 fill-orange-400 text-orange-400" />
                <span>+{line2Chem} G</span>
              </Badge>
            )}
          </div>

          <div className="p-2.5 sm:p-3 space-y-2.5">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-1.5 flex items-center justify-between px-0.5">
                <span>2. Útočná lajna</span>
                <span>LW • C • RW</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {renderTacticalSlotTile('LK2')}
                {renderTacticalSlotTile('C2')}
                {renderTacticalSlotTile('PK2')}
              </div>
            </div>

            <div className="pt-2 border-t border-border/40">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400/80 mb-1.5 flex items-center justify-between px-0.5">
                <span>2. Obranný pár</span>
                <span>LD • RD</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 sm:max-w-[82%] mx-auto">
                {renderTacticalSlotTile('LO2')}
                {renderTacticalSlotTile('PO2')}
              </div>
            </div>
          </div>
        </div>

        {/* 3. ÚTOČNÁ LAJNA (Volitelná) */}
        {formationCount === '3' && (
          <div className="rounded-2xl border border-border/80 bg-gradient-to-b from-slate-900/80 via-card/90 to-slate-950/90 shadow-md">
            <div className="px-3.5 py-2 rounded-t-2xl bg-muted/30 border-b border-border/60 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                <h3 className="text-xs font-black uppercase tracking-wider text-foreground truncate">
                  3. Útočná lajna
                </h3>
                <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                  ({line3Count}/3)
                </span>
              </div>
              {line3Chem > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold bg-orange-500/15 text-orange-400 border-orange-500/40 inline-flex items-center gap-1 shrink-0"
                >
                  <Flame className="h-3 w-3 fill-orange-400 text-orange-400" />
                  <span>+{line3Chem} G</span>
                </Badge>
              )}
            </div>

            <div className="p-2.5 sm:p-3">
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {renderTacticalSlotTile('LK3')}
                {renderTacticalSlotTile('C3')}
                {renderTacticalSlotTile('PK3')}
              </div>
            </div>
          </div>
        )}

        {/* BRANKOVIŠTĚ (BRANKÁŘ) */}
        <div className="rounded-2xl border border-amber-500/35 bg-gradient-to-b from-amber-500/10 via-card/90 to-slate-950/90 shadow-md">
          <div className="px-3.5 py-2 rounded-t-2xl bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
                Brankoviště (Brankář)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              ({lineup.B1 ? '1/1' : '0/1'})
            </span>
          </div>
          <div className="p-2.5 sm:p-3 flex justify-center">
            <div className="w-full max-w-xs">
              {renderTacticalSlotTile('B1', true)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render Desktop Split View (>= 1024px)
   * Both Left Roster Sidebar and Right Ice Rink scroll cleanly when content exceeds viewport height!
   */
  const renderDesktopBuilder = () => {
    const isSmall = formationCount === '3';

    return (
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-1 h-full min-h-0 gap-4 p-4 overflow-hidden">
          {/* Left Panel: Match Roster Pool */}
          <Card className="w-72 xl:w-80 flex flex-col shrink-0 h-full min-h-0 border-border bg-card/70 backdrop-blur-sm overflow-hidden">
            <div className="p-3 border-b space-y-2.5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Nominace na zápas
                </span>
                <Badge variant="outline" className="text-[10px] font-bold">
                  V sestavě: {assignedCount}
                </Badge>
              </div>

              <Tabs
                value={sidebarTab}
                onValueChange={(v) => setSidebarTab(v as any)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3 h-8 p-0.5">
                  <TabsTrigger value="pool" className="text-[11px] py-1 font-bold">
                    Přihlášení ({unassignedPoolPlayers.length})
                  </TabsTrigger>
                  <TabsTrigger value="unconfirmed" className="text-[11px] py-1">
                    + Z týmu ({unconfirmedRosterPlayers.length})
                  </TabsTrigger>
                  <TabsTrigger value="guest" className="text-[11px] py-1">
                    + Host
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {sidebarTab !== 'guest' && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder={
                      sidebarTab === 'pool'
                        ? 'Hledat mezi přihlášenými...'
                        : 'Hledat nenahlášeného hráče...'
                    }
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
              )}

              {sidebarTab === 'unconfirmed' && (
                <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
                  <span>Hráči bez potvrzené účasti</span>
                  <button
                    type="button"
                    onClick={() => setShowMembersInUnconfirmed((p) => !p)}
                    className="text-primary hover:underline font-medium"
                  >
                    {showMembersInUnconfirmed ? 'Skrýt členy' : '+ I členové'}
                  </button>
                </div>
              )}
            </div>

            <div className="p-2 flex-1 min-h-0 overflow-hidden flex flex-col">
              {sidebarTab === 'guest' ? (
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2.5 space-y-3 bg-muted/30 rounded-xl border border-border/60">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <UserPlus className="h-3.5 w-3.5 text-primary" />
                      Dopsat vlastního hráče / hosta
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Pokud zaskakuje hráč, který není registrovaný v aplikaci.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">
                        Jméno hráče *
                      </label>
                      <Input
                        placeholder="např. Karel Novák"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">
                          Číslo dresu
                        </label>
                        <Input
                          type="number"
                          placeholder="např. 99"
                          value={guestJersey}
                          onChange={(e) => setGuestJersey(e.target.value)}
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">
                          Post
                        </label>
                        <select
                          value={guestRole}
                          onChange={(e) => setGuestRole(e.target.value as any)}
                          className="w-full h-8 text-xs mt-1 rounded-md border border-input bg-background px-2"
                        >
                          <option value="wing">Křídlo (KŘÍ)</option>
                          <option value="center">Centr (CEN)</option>
                          <option value="defense">Obránce (OBR)</option>
                          <option value="goalie">Brankář (BRA)</option>
                        </select>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        handleCreateGuestPlayer(null);
                        setSidebarTab('pool');
                      }}
                      className="w-full text-xs font-bold mt-1"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Přidat do dnešní nominace
                    </Button>
                  </div>
                </div>
              ) : (
                <Droppable droppableId="availablePlayers">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'p-2 rounded-lg bg-muted/40 flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 transition-colors',
                        snapshot.isDraggingOver && 'bg-primary/10 border-primary border'
                      )}
                    >
                      {desktopSidebarPlayers.map((player, index) => {
                        const isConfirmed = confirmedSet.has(player.id);
                        const isSelected = selectedQuickPlayerId === player.id;
                        return (
                          <Draggable key={player.id} draggableId={player.id} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                className="relative"
                              >
                                <PlayerCard
                                  player={player}
                                  fullWidth
                                  isDragging={dragSnapshot.isDragging}
                                  isGhost={dragSnapshot.isDragging}
                                  isConfirmed={isConfirmed}
                                  isManuallyAdded={!isConfirmed}
                                  isSelected={isSelected}
                                  onClick={() => {
                                    if (sidebarTab === 'unconfirmed') {
                                      handleAddRosterPlayerToPool(player);
                                      setSelectedQuickPlayerId(player.id);
                                      setSidebarTab('pool');
                                    } else {
                                      setSelectedQuickPlayerId((prev) =>
                                        prev === player.id ? null : player.id
                                      );
                                    }
                                  }}
                                />
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                      {desktopSidebarPlayers.length === 0 && (
                        <div className="text-center py-8 px-3 space-y-2">
                          <p className="text-xs text-muted-foreground italic">
                            {sidebarTab === 'pool'
                              ? 'Všichni přihlášení hráči jsou už nasazeni na ledě.'
                              : 'Žádný další hráč neodpovídá hledání.'}
                          </p>
                          {sidebarTab === 'pool' && unconfirmedRosterPlayers.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSidebarTab('unconfirmed')}
                              className="text-xs h-7"
                            >
                              <UserPlus className="h-3 w-3 mr-1.5 text-primary" />
                              Dopsat nenahlášeného z týmu
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              )}
            </div>
          </Card>

          {/* Right Panel: Scrollable Ice Rink Tactics Board */}
          <div
            data-testid="lineup-desktop-rink-scroll"
            className="flex-1 min-h-0 h-full overflow-y-auto overscroll-contain rounded-2xl border border-slate-700/60 shadow-2xl bg-[#0b0f17]"
          >
            <div className="relative min-h-full flex flex-col justify-between gap-3 p-4 xl:p-6">
              <RinkBackground />

              {/* 1. Attack Line */}
              <div className="relative z-10 space-y-1.5">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-card/90 px-3 py-0.5 rounded-full border border-primary/30 shadow-xs">
                    1. Útok
                  </span>
                  {getLineChemistryGoals([lineup.LK1, lineup.C1, lineup.PK1]) > 0 && (
                    <span className="text-[10px] font-bold text-orange-400 bg-slate-950/90 px-2.5 py-0.5 rounded-full border border-orange-500/40 shadow-xs inline-flex items-center gap-1">
                      <Flame className="h-2.5 w-2.5 fill-orange-400 text-orange-400" />
                      <span>
                        Chemie +{getLineChemistryGoals([lineup.LK1, lineup.C1, lineup.PK1])} G
                      </span>
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2.5 xl:gap-4 items-center">
                  {renderDesktopDropzone('LK1', isSmall)}
                  {renderDesktopDropzone('C1', isSmall)}
                  {renderDesktopDropzone('PK1', isSmall)}
                </div>
              </div>

              {/* 2. Attack Line */}
              <div className="relative z-10 space-y-1.5">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[10px] font-bold text-foreground/80 uppercase tracking-wider bg-card/90 px-3 py-0.5 rounded-full border border-border shadow-xs">
                    2. Útok
                  </span>
                  {getLineChemistryGoals([lineup.LK2, lineup.C2, lineup.PK2]) > 0 && (
                    <span className="text-[10px] font-bold text-orange-400 bg-slate-950/90 px-2.5 py-0.5 rounded-full border border-orange-500/40 shadow-xs inline-flex items-center gap-1">
                      <Flame className="h-2.5 w-2.5 fill-orange-400 text-orange-400" />
                      <span>
                        Chemie +{getLineChemistryGoals([lineup.LK2, lineup.C2, lineup.PK2])} G
                      </span>
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2.5 xl:gap-4 items-center">
                  {renderDesktopDropzone('LK2', isSmall)}
                  {renderDesktopDropzone('C2', isSmall)}
                  {renderDesktopDropzone('PK2', isSmall)}
                </div>
              </div>

              {/* Optional 3. Attack Line */}
              {formationCount === '3' && (
                <div className="relative z-10 space-y-1.5">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-[10px] font-bold text-foreground/80 uppercase tracking-wider bg-card/90 px-3 py-0.5 rounded-full border border-border shadow-xs">
                      3. Útok
                    </span>
                    {getLineChemistryGoals([lineup.LK3, lineup.C3, lineup.PK3]) > 0 && (
                      <span className="text-[10px] font-bold text-orange-400 bg-slate-950/90 px-2.5 py-0.5 rounded-full border border-orange-500/40 shadow-xs inline-flex items-center gap-1">
                        <Flame className="h-2.5 w-2.5 fill-orange-400 text-orange-400" />
                        <span>
                          Chemie +{getLineChemistryGoals([lineup.LK3, lineup.C3, lineup.PK3])} G
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2.5 xl:gap-4 items-center">
                    {renderDesktopDropzone('LK3', isSmall)}
                    {renderDesktopDropzone('C3', isSmall)}
                    {renderDesktopDropzone('PK3', isSmall)}
                  </div>
                </div>
              )}

              {/* Defense Pairs */}
              <div className="relative z-10 space-y-2.5 pt-1">
                <div className="grid grid-cols-2 gap-3 xl:gap-6 max-w-xl mx-auto w-full items-center">
                  {renderDesktopDropzone('LO1', isSmall)}
                  {renderDesktopDropzone('PO1', isSmall)}
                </div>
                <div className="grid grid-cols-2 gap-3 xl:gap-6 max-w-xl mx-auto w-full items-center">
                  {renderDesktopDropzone('LO2', isSmall)}
                  {renderDesktopDropzone('PO2', isSmall)}
                </div>
              </div>

              {/* Goalie */}
              <div className="relative z-10 flex justify-center items-center pt-1 pb-1">
                <div className="w-full max-w-[230px]">
                  {renderDesktopDropzone('B1', isSmall)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DragDropContext>
    );
  };

  return (
    <div className="flex flex-1 flex-col w-full min-h-0 overflow-hidden bg-background">
      {/* Compact Header Controls */}
      <div className="px-3 py-2 sm:px-4 sm:py-2.5 border-b flex-shrink-0 flex flex-wrap items-center justify-between gap-2 bg-muted/20">
        <Tabs
          value={formationCount}
          onValueChange={handleFormationChange}
          className="w-full sm:w-[250px]"
        >
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="2" className="text-xs font-semibold">
              2 formace útoku
            </TabsTrigger>
            <TabsTrigger value="3" className="text-xs font-semibold">
              3 formace útoku
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoFill}
            className="text-xs font-semibold flex-1 sm:flex-initial h-8 border-primary/40 hover:bg-primary/10"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
            Předvyplnit přihlášené
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-xs text-muted-foreground hover:text-destructive h-8 px-2.5 shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Vyčistit
          </Button>
        </div>
      </div>

      {/* Main Interactive Area (Flex-1 + min-h-0 guarantees proper child scrolling!) */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {isDesktop ? renderDesktopBuilder() : renderTacticalFormationBoard()}
      </div>

      {/* Footer Actions */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 border-t bg-card/80 backdrop-blur-md">
        <div className="text-xs text-muted-foreground hidden sm:block">
          Nasazeno hráčů: <span className="font-bold text-foreground">{assignedCount}</span> (
          {lineup.B1 ? '1 brankář' : 'bez brankáře'},{' '}
          {assignedCount - (lineup.B1 ? 1 : 0)} v poli • Přihlášeno: {confirmedSet.size})
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 sm:flex-none h-9"
          >
            Zrušit
          </Button>
          <Button
            type="button"
            onClick={() => onSave(lineup)}
            disabled={isSaving}
            className="flex-1 sm:flex-none font-bold min-w-[140px] h-9"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ukládám...
              </>
            ) : (
              'Uložit sestavu'
            )}
          </Button>
        </div>
      </div>

      {/* 1. SMART POSITION SLOT PICKER DIALOG */}
      <Dialog open={Boolean(activeSlot)} onOpenChange={(open) => !open && setActiveSlot(null)}>
        <DialogContent className="sm:max-w-md w-[94vw] max-h-[86dvh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="p-3.5 sm:p-4 pb-3 border-b bg-muted/20 flex-shrink-0 text-left">
            <div className="flex items-center justify-between pr-6">
              <div className="flex items-center gap-2">
                {activeSlotMeta && (
                  <Badge className="bg-primary text-primary-foreground font-black text-xs px-2 py-0.5">
                    {activeSlotMeta.short}
                  </Badge>
                )}
                <DialogTitle className="text-sm sm:text-base font-headline font-bold">
                  {activeSlotMeta?.full}
                </DialogTitle>
              </div>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Vyberte hráče z přihlášených na zápas, nebo dopište nenahlášeného hráče či hosta.
            </DialogDescription>

            {activeSlotOccupant && activeSlot && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
                <span className="text-xs font-bold text-foreground truncate">
                  Nyní: {activeSlotOccupant.jerseyNumber != null ? `#${activeSlotOccupant.jerseyNumber} ` : ''}
                  {activeSlotOccupant.name}
                </span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    handleRemoveFromPosition(activeSlot);
                    setActiveSlot(null);
                  }}
                  className="h-7 text-xs px-2.5 shrink-0"
                >
                  Uvolnit post
                </Button>
              </div>
            )}
          </DialogHeader>

          <div className="p-3 border-b space-y-2.5 bg-background flex-shrink-0">
            <Tabs value={pickerTab} onValueChange={(v) => setPickerTab(v as any)}>
              <TabsList className="grid w-full grid-cols-3 h-8 p-0.5">
                <TabsTrigger value="confirmed" className="text-[11px] sm:text-xs font-bold">
                  Přihlášení ({unassignedPoolPlayers.length})
                </TabsTrigger>
                <TabsTrigger value="unconfirmed" className="text-[11px] sm:text-xs">
                  + Z týmu ({unconfirmedRosterPlayers.length})
                </TabsTrigger>
                <TabsTrigger value="guest" className="text-[11px] sm:text-xs">
                  + Host
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {pickerTab !== 'guest' && (
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={
                    pickerTab === 'confirmed'
                      ? 'Hledat mezi přihlášenými...'
                      : 'Hledat nenahlášeného hráče v kádru...'
                  }
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-3">
            {pickerTab === 'confirmed' && activeSlot && (
              <>
                {sortedSlotPoolCandidates.length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                      Volní přihlášení hráči ({sortedSlotPoolCandidates.length})
                    </p>
                    {sortedSlotPoolCandidates.map((p) => {
                      const isRecommended = isPlayerMatchingSlotRole(p, activeSlot);
                      const chemGoals = getChemistryWithUnit(p.id, activeSlotPeers);
                      const roleBadge = getPositionBadgeMeta(p);
                      const isConfirmed = confirmedSet.has(p.id);

                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => assignPlayerToSlot(activeSlot, p)}
                          className={cn(
                            'w-full flex items-center justify-between gap-2 p-2.5 rounded-xl border text-left transition-all hover:border-primary hover:bg-primary/5',
                            isRecommended
                              ? 'border-primary/40 bg-primary/5'
                              : 'border-border/80 bg-card/80'
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar className="h-8 w-8 border border-border shrink-0">
                              <AvatarImage
                                src={
                                  p.photoURL ??
                                  `https://picsum.photos/seed/${p.email || p.name}/80/80`
                                }
                              />
                              <AvatarFallback className="text-[10px] font-bold">
                                {(p.name || '')
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                {p.jerseyNumber != null && (
                                  <span className="text-xs font-black font-mono text-primary">
                                    #{p.jerseyNumber}
                                  </span>
                                )}
                                <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                                  {p.name}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                {isConfirmed ? (
                                  <span className="text-[10px] text-emerald-400 font-semibold">
                                    ✓ Přihlášen
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-amber-400 font-semibold">
                                    Dopsán do nominace
                                  </span>
                                )}
                                {isRecommended && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] py-0 px-1.5 border-primary/40 text-primary bg-primary/10 font-bold"
                                  >
                                    Doporučený post
                                  </Badge>
                                )}
                                {chemGoals > 0 && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] py-0 px-1.5 border-orange-500/40 text-orange-400 bg-orange-500/10 font-bold"
                                  >
                                    🔥 +{chemGoals} G v lajně
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {roleBadge && (
                            <Badge
                              variant="outline"
                              className={cn('text-[10px] font-bold shrink-0', roleBadge.className)}
                            >
                              {roleBadge.label}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Všichni přihlášení hráči už mají své místo v sestavě.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPickerTab('unconfirmed')}
                        className="text-xs h-8"
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1.5 text-primary" />
                        Vybrat nenahlášeného z týmu
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPickerTab('guest')}
                        className="text-xs h-8"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
                        Dopsat hosta
                      </Button>
                    </div>
                  </div>
                )}

                {placedElsewherePlayers.length > 0 && (
                  <div className="pt-2 border-t border-border/60 space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 flex items-center gap-1.5">
                      <ArrowLeftRight className="h-3 w-3 text-primary" />
                      Přesunout / Vyměnit s hráčem ze sestavy
                    </p>
                    {placedElsewherePlayers.map(({ slotKey, player }) => (
                      <button
                        key={slotKey}
                        type="button"
                        onClick={() => assignPlayerToSlot(activeSlot, player)}
                        className="w-full flex items-center justify-between gap-2 p-2 rounded-lg border border-border/50 bg-muted/20 hover:border-primary/50 text-left text-xs transition-all"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                            {positionNames[slotKey].short}
                          </Badge>
                          <span className="font-semibold truncate">
                            {player.jerseyNumber != null ? `#${player.jerseyNumber} ` : ''}
                            {player.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-primary font-semibold shrink-0">
                          {activeSlotOccupant ? 'Prohodit' : 'Přesunout sem'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {pickerTab === 'unconfirmed' && activeSlot && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    Nenahlášení z kádru ({sortedSlotUnconfirmedCandidates.length})
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowMembersInUnconfirmed((prev) => !prev)}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    {showMembersInUnconfirmed ? 'Skrýt členy' : '+ Zobrazit i členy'}
                  </button>
                </div>

                {sortedSlotUnconfirmedCandidates.map((p) => {
                  const roleBadge = getPositionBadgeMeta(p);
                  const isRecommended = isPlayerMatchingSlotRole(p, activeSlot);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => assignPlayerToSlot(activeSlot, p)}
                      className="w-full flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border/70 bg-card/60 hover:border-amber-500/60 hover:bg-amber-500/5 text-left transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="h-8 w-8 border border-border shrink-0">
                          <AvatarImage
                            src={
                              p.photoURL ??
                              `https://picsum.photos/seed/${p.email || p.name}/80/80`
                            }
                          />
                          <AvatarFallback className="text-[10px] font-bold">
                            {(p.name || '')
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {p.jerseyNumber != null && (
                              <span className="text-xs font-black font-mono text-muted-foreground">
                                #{p.jerseyNumber}
                              </span>
                            )}
                            <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                              {p.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-amber-400 font-medium">
                              + Dopsat a nasadit
                            </span>
                            {isRecommended && (
                              <Badge
                                variant="outline"
                                className="text-[9px] py-0 px-1 border-primary/40 text-primary"
                              >
                                Vhodný post
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {roleBadge && (
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] font-bold shrink-0', roleBadge.className)}
                        >
                          {roleBadge.label}
                        </Badge>
                      )}
                    </button>
                  );
                })}

                {sortedSlotUnconfirmedCandidates.length === 0 && (
                  <p className="text-center py-6 text-xs text-muted-foreground italic">
                    Žádný nenahlášený hráč neodpovídá hledání.
                  </p>
                )}
              </div>
            )}

            {pickerTab === 'guest' && activeSlot && (
              <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Dopsat vlastního hráče / hosta na post {activeSlotMeta?.short}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Ideální pro záskok nebo hosta, který nemá účet v aplikaci.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-foreground">
                      Jméno a příjmení (nebo přezdívka) *
                    </label>
                    <Input
                      placeholder="např. Petr Svoboda"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="h-9 text-xs mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-foreground">
                      Číslo dresu (volitelné)
                    </label>
                    <Input
                      type="number"
                      placeholder="např. 88"
                      value={guestJersey}
                      onChange={(e) => setGuestJersey(e.target.value)}
                      className="h-9 text-xs mt-1"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={() => handleCreateGuestPlayer(activeSlot)}
                    className="w-full font-bold text-xs h-9"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Dopsat a nasadit na {activeSlotMeta?.short}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. ADD UNCONFIRMED OR GUEST TO MATCH POOL MODAL */}
      <Dialog open={isAddPoolModalOpen} onOpenChange={setIsAddPoolModalOpen}>
        <DialogContent className="sm:max-w-md w-[94vw] max-h-[86dvh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="p-3.5 sm:p-4 pb-3 border-b bg-muted/20 flex-shrink-0 text-left">
            <DialogTitle className="text-sm sm:text-base font-headline font-bold flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              Dopsat hráče na zápas
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Přidejte do dnešní zápasové nominace hráče z kádru, který se zapomněl přihlásit, nebo vytvořte záskok / hosta.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 border-b space-y-2.5 flex-shrink-0">
            <Tabs value={addPoolTab} onValueChange={(v) => setAddPoolTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2 h-8 p-0.5">
                <TabsTrigger value="roster" className="text-xs font-bold">
                  Nenahlášení z týmu ({unconfirmedRosterPlayers.length})
                </TabsTrigger>
                <TabsTrigger value="guest" className="text-xs font-bold">
                  + Vlastní host
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {addPoolTab === 'roster' && (
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Hledat hráče podle jména nebo čísla..."
                  value={addPoolSearch}
                  onChange={(e) => setAddPoolSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2">
            {addPoolTab === 'roster' ? (
              <>
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="text-[11px] text-muted-foreground">
                    Klepnutím zařadíte hráče do dnešní nominace
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMembersInUnconfirmed((p) => !p)}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    {showMembersInUnconfirmed ? 'Skrýt členy' : '+ I členové'}
                  </button>
                </div>

                {(manuallyAddedIds.size > 0 || customGuests.length > 0) && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      Již dopsaní na tento zápas:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(manuallyAddedIds).map((id) => {
                        const p = allKnownPlayersMap.get(id);
                        if (!p) return null;
                        return (
                          <Badge
                            key={id}
                            variant="outline"
                            className="text-xs bg-card border-amber-500/40 text-foreground gap-1 pr-1"
                          >
                            <span>{formatName(p.name)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveManualPlayerFromPool(id)}
                              className="hover:text-destructive p-0.5"
                              title="Odebrat z nominace"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                      {customGuests.map((g) => (
                        <Badge
                          key={g.id}
                          variant="outline"
                          className="text-xs bg-card border-amber-500/40 text-foreground gap-1 pr-1"
                        >
                          <span>{g.name} (Host)</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveManualPlayerFromPool(g.id)}
                            className="hover:text-destructive p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {unconfirmedRosterPlayers
                  .filter((p) => {
                    if (!addPoolSearch.trim()) return true;
                    const q = addPoolSearch.toLowerCase().trim();
                    return (
                      (p.name || '').toLowerCase().includes(q) ||
                      (p.jerseyNumber != null && String(p.jerseyNumber).includes(q))
                    );
                  })
                  .map((p) => {
                    const roleBadge = getPositionBadgeMeta(p);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border/70 bg-card/70 hover:border-primary/40"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="h-8 w-8 border border-border shrink-0">
                            <AvatarImage
                              src={
                                p.photoURL ??
                                `https://picsum.photos/seed/${p.email || p.name}/80/80`
                              }
                            />
                            <AvatarFallback className="text-[10px] font-bold">
                              {(p.name || '')
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {p.jerseyNumber != null && (
                                <span className="text-xs font-black font-mono text-primary">
                                  #{p.jerseyNumber}
                                </span>
                              )}
                              <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                                {p.name}
                              </span>
                              {roleBadge && (
                                <Badge
                                  variant="outline"
                                  className={cn('text-[9px] py-0 px-1 font-bold', roleBadge.className)}
                                >
                                  {roleBadge.label}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddRosterPlayerToPool(p)}
                          className="h-7 text-xs font-bold border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Dopsat
                        </Button>
                      </div>
                    );
                  })}
              </>
            ) : (
              <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-3">
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-foreground">
                      Jméno a příjmení (nebo přezdívka) *
                    </label>
                    <Input
                      placeholder="např. Karel Novák"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="h-9 text-xs mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-foreground">
                        Číslo dresu
                      </label>
                      <Input
                        type="number"
                        placeholder="např. 99"
                        value={guestJersey}
                        onChange={(e) => setGuestJersey(e.target.value)}
                        className="h-9 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-foreground">
                        Preferovaný post
                      </label>
                      <select
                        value={guestRole}
                        onChange={(e) => setGuestRole(e.target.value as any)}
                        className="w-full h-9 text-xs mt-1 rounded-md border border-input bg-background px-2"
                      >
                        <option value="wing">Křídlo (KŘÍ)</option>
                        <option value="center">Centr (CEN)</option>
                        <option value="defense">Obránce (OBR)</option>
                        <option value="goalie">Brankář (BRA)</option>
                      </select>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleCreateGuestPlayer(null)}
                    className="w-full font-bold text-xs h-9"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Přidat hosta do nominace
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
