'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, collectionGroup, query, orderBy } from 'firebase/firestore';
import type { Match, UserProfile } from '@/types';
import { 
  buildTeamScoringAndGoalieLeaderboard, 
  calculateTeamMilestonesOverview, 
  getTotalHoldersCount,
  type TeamMilestonesData 
} from '../utils/milestones';

const SEEN_MILESTONES_STORAGE_KEY = 'aces_seen_milestones_count';
const SEEN_HOLDERS_STORAGE_KEY = 'aces_seen_milestone_holders_v2';
const SESSION_NEW_HOLDERS_STORAGE_KEY = 'aces_session_new_unlocks_v2';

export function useTeamMilestonesData(explicitUserId?: string | null) {
  const firestore = useFirestore();
  const { user } = useUser();
  const currentUserId = explicitUserId !== undefined ? explicitUserId : user?.uid;

  const usersRef = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'users') : null),
    [firestore, user]
  );
  const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersRef);

  const matchesQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'matches') : null),
    [firestore, user]
  );
  const { data: allMatches, isLoading: areMatchesLoading } = useCollection<Match>(matchesQuery);

  const allSkaterStatsRef = useMemoFirebase(
    () => (firestore && user ? collectionGroup(firestore, 'skaterStats') : null),
    [firestore, user]
  );
  const { data: allSkaterStats, isLoading: areSkaterStatsLoading } = useCollection<any>(allSkaterStatsRef);

  const allGoalieStatsRef = useMemoFirebase(
    () => (firestore && user ? collectionGroup(firestore, 'goalieStats') : null),
    [firestore, user]
  );
  const { data: allGoalieStats, isLoading: areGoalieStatsLoading } = useCollection<any>(allGoalieStatsRef);

  const allAttendancesRef = useMemoFirebase(
    () => (firestore && user ? collectionGroup(firestore, 'attendees') : null),
    [firestore, user]
  );
  const { data: allAttendances } = useCollection<any>(allAttendancesRef);

  const attendancesByMatch = useMemo(() => {
    const map = new Map<string, any[]>();
    if (!allAttendances) return map;
    allAttendances.forEach((att) => {
      if (!att.matchId) return;
      if (!map.has(att.matchId)) map.set(att.matchId, []);
      map.get(att.matchId)!.push(att);
    });
    return map;
  }, [allAttendances]);

  const isLoading = areUsersLoading || areMatchesLoading || areSkaterStatsLoading || areGoalieStatsLoading;

  const { teamScoring, goalieLeaderboard } = useMemo(() => {
    if (!allUsers || !allSkaterStats || !allGoalieStats) {
      return { teamScoring: [], goalieLeaderboard: [] };
    }
    return buildTeamScoringAndGoalieLeaderboard(
      allUsers,
      allSkaterStats,
      allGoalieStats,
      allMatches || []
    );
  }, [allUsers, allSkaterStats, allGoalieStats, allMatches]);

  const teamMilestonesData: TeamMilestonesData = useMemo(() => {
    if (!allUsers) {
      return {
        allMilestones: [],
        upcomingMilestones: [],
        myUnlockedCount: 0,
        totalMilestonesCount: 0,
      };
    }
    return calculateTeamMilestonesOverview(
      allUsers,
      teamScoring,
      goalieLeaderboard,
      allMatches || [],
      currentUserId,
      attendancesByMatch
    );
  }, [allUsers, teamScoring, goalieLeaderboard, allMatches, currentUserId, attendancesByMatch]);

  const totalHoldersCount = useMemo(() => {
    return getTotalHoldersCount(teamMilestonesData.allMilestones);
  }, [teamMilestonesData.allMilestones]);

  const allCurrentHolderKeys = useMemo(() => {
    const keys: string[] = [];
    teamMilestonesData.allMilestones.forEach((m) => {
      m.holders.forEach((h) => {
        keys.push(`${m.definition.id}:${h.id}`);
      });
    });
    return keys;
  }, [teamMilestonesData.allMilestones]);

  const [hasNewMilestones, setHasNewMilestones] = useState(false);
  const [newMilestoneIds, setNewMilestoneIds] = useState<Set<string>>(new Set());
  const [newUnlockKeys, setNewUnlockKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isLoading || allCurrentHolderKeys.length === 0) return;

    try {
      const stored = localStorage.getItem(SEEN_HOLDERS_STORAGE_KEY);
      const sessionRaw = sessionStorage.getItem(SESSION_NEW_HOLDERS_STORAGE_KEY);
      const sessionKeys: string[] = sessionRaw ? JSON.parse(sessionRaw) || [] : [];
      const currentSet = new Set(allCurrentHolderKeys);

      if (stored === null) {
        // First load: store baseline without triggering unread badges
        localStorage.setItem(SEEN_HOLDERS_STORAGE_KEY, JSON.stringify(allCurrentHolderKeys));
        localStorage.setItem(SEEN_MILESTONES_STORAGE_KEY, String(totalHoldersCount));
        setHasNewMilestones(false);
        setNewMilestoneIds(new Set());
        setNewUnlockKeys(new Set());
      } else {
        const parsed: string[] = JSON.parse(stored) || [];
        // Prune any stale keys that are no longer unlocked so future real unlocks trigger notifications
        const cleanedSeen = parsed.filter((k) => currentSet.has(k));
        if (cleanedSeen.length !== parsed.length) {
          localStorage.setItem(SEEN_HOLDERS_STORAGE_KEY, JSON.stringify(cleanedSeen));
        }
        const seenSet = new Set(cleanedSeen);
        const freshKeys = new Set<string>(sessionKeys.filter((k) => currentSet.has(k)));
        let hasUnreadInStorage = false;

        allCurrentHolderKeys.forEach((key) => {
          if (!seenSet.has(key)) {
            hasUnreadInStorage = true;
            freshKeys.add(key);
          }
        });

        if (freshKeys.size > 0) {
          sessionStorage.setItem(SESSION_NEW_HOLDERS_STORAGE_KEY, JSON.stringify(Array.from(freshKeys)));
        }

        const freshMilestoneIds = new Set<string>();
        freshKeys.forEach((key) => {
          const [mId] = key.split(':');
          if (mId) freshMilestoneIds.add(mId);
        });

        setHasNewMilestones(hasUnreadInStorage);
        setNewUnlockKeys(freshKeys);
        setNewMilestoneIds(freshMilestoneIds);
      }
    } catch {
      // fallback to total holders count check if JSON fails
      try {
        const storedNum = Number(localStorage.getItem(SEEN_MILESTONES_STORAGE_KEY) || '0');
        setHasNewMilestones(totalHoldersCount > storedNum);
      } catch {
        // ignore
      }
    }
  }, [isLoading, allCurrentHolderKeys, totalHoldersCount]);

  const markMilestonesAsSeen = useCallback((clearSessionHighlights = false) => {
    try {
      if (allCurrentHolderKeys.length === 0) return;
      // Before marking as seen in localStorage, preserve any newly discovered keys in sessionStorage
      // so the Hall of Fame page still highlights them as "NOVÉ" during the current session!
      const stored = localStorage.getItem(SEEN_HOLDERS_STORAGE_KEY);
      if (stored !== null && !clearSessionHighlights) {
        const seenSet = new Set<string>(JSON.parse(stored) || []);
        const sessionRaw = sessionStorage.getItem(SESSION_NEW_HOLDERS_STORAGE_KEY);
        const mergedSession = new Set<string>(sessionRaw ? JSON.parse(sessionRaw) || [] : []);
        allCurrentHolderKeys.forEach((k) => {
          if (!seenSet.has(k)) mergedSession.add(k);
        });
        if (mergedSession.size > 0) {
          sessionStorage.setItem(SESSION_NEW_HOLDERS_STORAGE_KEY, JSON.stringify(Array.from(mergedSession)));
        }
      }

      localStorage.setItem(SEEN_HOLDERS_STORAGE_KEY, JSON.stringify(allCurrentHolderKeys));
      localStorage.setItem(SEEN_MILESTONES_STORAGE_KEY, String(totalHoldersCount));
      setHasNewMilestones(false);

      if (clearSessionHighlights) {
        sessionStorage.removeItem(SESSION_NEW_HOLDERS_STORAGE_KEY);
        setNewMilestoneIds(new Set());
        setNewUnlockKeys(new Set());
      }
    } catch {
      // ignore
    }
  }, [allCurrentHolderKeys, totalHoldersCount]);

  const clearNewHighlights = useCallback(() => {
    markMilestonesAsSeen(true);
  }, [markMilestonesAsSeen]);

  return {
    teamMilestonesData,
    teamScoring,
    goalieLeaderboard,
    allUsers,
    allMatches,
    isLoading,
    hasNewMilestones,
    newMilestoneIds,
    newUnlockKeys,
    markMilestonesAsSeen,
    clearNewHighlights,
  };
}
