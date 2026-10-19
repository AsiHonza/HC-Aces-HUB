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
    () => (firestore && user ? query(collection(firestore, 'matches'), orderBy('dateTime', 'asc')) : null),
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
      currentUserId
    );
  }, [allUsers, teamScoring, goalieLeaderboard, allMatches, currentUserId]);

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

  useEffect(() => {
    if (isLoading || allCurrentHolderKeys.length === 0) return;

    try {
      const stored = localStorage.getItem(SEEN_HOLDERS_STORAGE_KEY);
      if (stored === null) {
        // First load: store baseline without triggering unread badges
        localStorage.setItem(SEEN_HOLDERS_STORAGE_KEY, JSON.stringify(allCurrentHolderKeys));
        localStorage.setItem(SEEN_MILESTONES_STORAGE_KEY, String(totalHoldersCount));
        setHasNewMilestones(false);
        setNewMilestoneIds(new Set());
      } else {
        const parsed: string[] = JSON.parse(stored) || [];
        const seenSet = new Set(parsed);
        const freshMilestoneIds = new Set<string>();

        allCurrentHolderKeys.forEach((key) => {
          if (!seenSet.has(key)) {
            const [mId] = key.split(':');
            if (mId) freshMilestoneIds.add(mId);
          }
        });

        if (freshMilestoneIds.size > 0) {
          setHasNewMilestones(true);
          setNewMilestoneIds(freshMilestoneIds);
        } else {
          setHasNewMilestones(false);
          setNewMilestoneIds(new Set());
        }
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

  const markMilestonesAsSeen = useCallback(() => {
    try {
      localStorage.setItem(SEEN_HOLDERS_STORAGE_KEY, JSON.stringify(allCurrentHolderKeys));
      localStorage.setItem(SEEN_MILESTONES_STORAGE_KEY, String(totalHoldersCount));
      setHasNewMilestones(false);
      setNewMilestoneIds(new Set());
    } catch {
      // ignore
    }
  }, [allCurrentHolderKeys, totalHoldersCount]);

  return {
    teamMilestonesData,
    teamScoring,
    goalieLeaderboard,
    allUsers,
    allMatches,
    isLoading,
    hasNewMilestones,
    newMilestoneIds,
    markMilestonesAsSeen,
  };
}
