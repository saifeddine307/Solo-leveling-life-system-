// Phase 1 Comprehensive Automated Audit Script
// This script executes tests against the real domain engine logic in StateAuthority,
// actions validator, event bus, and storage utilities.

class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  dump(): Record<string, any> {
    const res: Record<string, any> = {};
    for (const [k, v] of this.store.entries()) {
      try {
        res[k] = JSON.parse(v);
      } catch {
        res[k] = v;
      }
    }
    return res;
  }
}

// Attach mock localStorage to global before importing modules
const mockStorage = new MockLocalStorage();
(global as any).localStorage = mockStorage;

async function runAudit() {
  console.log('====================================================');
  console.log('STARTING PHASE 1 AUTOMATED AUDIT & VERIFICATION');
  console.log('====================================================\n');

  const { stateAuthority } = await import('../src/domain/StateAuthority');
  const { validateDomainAction } = await import('../src/domain/actions');
  const { domainEventBus } = await import('../src/domain/events');
  const {
    loadStoredData,
    getQuestCompletionCycle,
    isQuestRewardAlreadyClaimed,
    synchronizeQuestCycles,
    STORAGE_KEY_PLAYER,
    STORAGE_KEY_QUESTS,
    STORAGE_KEY_REWARD_TRANSACTIONS,
    INITIAL_PLAYER_STATS,
  } = await import('../src/utils/storage');

  let allPassed = true;
  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
    } else {
      console.error(`  [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      allPassed = false;
    }
  }

  // ----------------------------------------------------
  // TEST 1: REWARD INTEGRITY TEST
  // ----------------------------------------------------
  console.log('>>> TEST 1: REWARD INTEGRITY & IDEMPOTENCY EXECUTION');

  // Reset to clean state for testing
  stateAuthority.factoryReset();
  const initialPlayer = stateAuthority.getState().player;
  assert(initialPlayer.level === 1 && initialPlayer.currentXP === 0 && initialPlayer.gold === 0, 'Clean baseline verified');

  // 1. CREATE QUEST
  const testQuest = stateAuthority.createQuest(
    {
      title: 'Audit Trial: Pushups Directive',
      type: 'daily',
      rank: 'E',
      xpReward: 100,
      goldReward: 50,
      category: 'Fitness',
    },
    'user'
  );
  assert(!!testQuest.id, `Created quest with ID: ${testQuest.id}`);

  // 2. COMPLETE
  const completeResult1 = stateAuthority.atomicCompleteQuest(testQuest.id, 'user');
  assert(completeResult1.success === true, 'First completion succeeded');
  assert(completeResult1.rewardGranted?.xp === 100, 'Reward granted: 100 XP');
  assert(completeResult1.rewardGranted?.gold === 50, 'Reward granted: 50 Gold');

  const stateAfterComplete1 = stateAuthority.getState();
  assert(stateAfterComplete1.player.currentXP === 0, '100 XP gained: triggered level up from 1 to 2 (currentXP=0)');
  assert(stateAfterComplete1.player.level === 2, 'Player ascended to Level 2');
  assert(stateAfterComplete1.player.gold === 50, 'Player gold is exactly 50');
  assert(stateAfterComplete1.rewardTransactions.length === 1, 'Reward transaction ledger contains 1 record');

  // 3. UNCHECK
  // Wait for in-flight mutex lock (300ms) to clear
  await new Promise((r) => setTimeout(r, 350));
  const uncheckResult = stateAuthority.uncompleteQuest(testQuest.id, 'user');
  assert(uncheckResult.success === true, 'Uncheck succeeded');
  const stateAfterUncheck = stateAuthority.getState();
  assert(stateAfterUncheck.player.level === 2, 'Level remains 2 (historical progression permanent)');
  assert(stateAfterUncheck.player.gold === 50, 'Gold remains 50 (no rollback on uncheck)');
  const uncheckQuestInState = stateAfterUncheck.quests.find((q) => q.id === testQuest.id);
  assert(uncheckQuestInState?.completed === false, 'Quest completed status set to false');

  // 4. CHECK AGAIN (same occurrence)
  await new Promise((r) => setTimeout(r, 350));
  const completeResult2 = stateAuthority.atomicCompleteQuest(testQuest.id, 'user');
  assert(completeResult2.success === true, 'Second check succeeds without error');
  assert(completeResult2.rewardGranted === undefined, 'No duplicate reward granted (rewardGranted is undefined)');
  assert(completeResult2.reason?.includes('Reward previously claimed') === true, 'Reason confirms reward previously claimed');

  const stateAfterComplete2 = stateAuthority.getState();
  assert(stateAfterComplete2.player.level === 2, 'Player level still 2 (no duplicate level up)');
  assert(stateAfterComplete2.player.gold === 50, 'Player gold still 50 (NO duplicate gold)');
  assert(stateAfterComplete2.player.totalXPEarned === 100, 'Total XP still 100 (NO duplicate XP)');
  assert(stateAfterComplete2.rewardTransactions.length === 1, 'Reward transaction ledger still contains only 1 record');

  // 5. SIMULATE REFRESH (re-check with state reloaded from storage)
  // Save current storage and verify isQuestRewardAlreadyClaimed
  const currentTxs = loadStoredData(STORAGE_KEY_REWARD_TRANSACTIONS, []);
  const currentQuests = loadStoredData(STORAGE_KEY_QUESTS, []);
  const refreshedQuest = currentQuests.find((q: any) => q.id === testQuest.id);
  const alreadyClaimedOnRefresh = isQuestRewardAlreadyClaimed(refreshedQuest, currentTxs);
  assert(alreadyClaimedOnRefresh === true, 'Reward claim check evaluates true upon storage refresh');

  const completeResult3 = stateAuthority.atomicCompleteQuest(testQuest.id, 'user');
  assert(completeResult3.rewardGranted === undefined, 'After refresh: duplicate reward is blocked');

  // 6. SIMULATE LEGITIMATE NEW DAILY OCCURRENCE (Next Day)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDateStr = tomorrow.toISOString().split('T')[0];

  // Run cycle synchronization for tomorrow
  const syncedQuests = synchronizeQuestCycles(stateAuthority.getState().quests, stateAuthority.getState().rewardTransactions, tomorrow);
  const syncedTestQuest = syncedQuests.find((q) => q.id === testQuest.id);
  assert(syncedTestQuest?.completed === false, 'New day occurrence: quest completed status reset to false');
  assert(syncedTestQuest?.rewardClaimed === false, 'New day occurrence: rewardClaimed reset for new cycle');

  // Check if tomorrow cycle is claimed
  const isClaimedTomorrow = isQuestRewardAlreadyClaimed(syncedTestQuest!, stateAuthority.getState().rewardTransactions, tomorrow);
  assert(isClaimedTomorrow === false, 'New day occurrence: isQuestRewardAlreadyClaimed is false for tomorrow');

  // Now simulate completion on tomorrow
  // Update state with synced quests
  (stateAuthority as any).state.quests = syncedQuests;
  const tomorrowCycle = getQuestCompletionCycle(syncedTestQuest!, tomorrow);
  assert(tomorrowCycle === tomorrowDateStr, `Tomorrow cycle calculated: ${tomorrowCycle}`);

  console.log('\n>>> TEST 2: AI ACTION SECURITY & ARBITRARY MUTATION PREVENTION');

  const context = {
    quests: stateAuthority.getState().quests,
    goals: stateAuthority.getState().goals,
    statPoints: stateAuthority.getState().player.statPoints,
  };

  // AI Attempt 1: "Give me 500 XP"
  const aiAttempt1 = validateDomainAction(
    { type: 'ADD_XP' as any, payload: { xp: 500 } },
    'ai',
    context
  );
  assert(aiAttempt1.isValid === false, 'AI request "ADD_XP 500" REJECTED');
  assert(aiAttempt1.isArbitraryProgressionAttempt === true, 'Flagged as arbitrary progression attempt');

  // AI Attempt 2: "Give me 500 Gold"
  const aiAttempt2 = validateDomainAction(
    { type: 'GRANT_REWARDS' as any, payload: { gold: 500 } },
    'ai',
    context
  );
  assert(aiAttempt2.isValid === false, 'AI request "GRANT_REWARDS 500 Gold" REJECTED');
  assert(aiAttempt2.isArbitraryProgressionAttempt === true, 'Flagged as arbitrary progression attempt');

  // AI Attempt 3: "Set my level to 50"
  const aiAttempt3 = validateDomainAction(
    { type: 'UPDATE_PLAYER_STATE', payload: { level: 50 } },
    'ai',
    context
  );
  assert(aiAttempt3.isValid === false, 'AI request "UPDATE_PLAYER_STATE level=50" REJECTED');
  assert(aiAttempt3.isArbitraryProgressionAttempt === true, 'Flagged as arbitrary progression attempt');

  // AI Attempt 4: "Set my statPoints to 999"
  const aiAttempt4 = validateDomainAction(
    { type: 'UPDATE_PLAYER_STATE', payload: { statPoints: 999 } },
    'ai',
    context
  );
  assert(aiAttempt4.isValid === false, 'AI request "UPDATE_PLAYER_STATE statPoints=999" REJECTED');

  // AI Legitimate 1: "Create a quest called Edit Client Video worth 100 XP"
  const aiLegit1 = validateDomainAction(
    {
      type: 'CREATE_QUEST',
      payload: {
        title: 'Edit Client Video',
        description: 'Complete high-retention reel',
        xpReward: 100,
        goldReward: 80,
        rank: 'D',
        type: 'daily',
      },
    },
    'ai',
    context
  );
  assert(aiLegit1.isValid === true, 'AI request "CREATE_QUEST Edit Client Video" ACCEPTED');
  assert(aiLegit1.normalizedAction?.payload.xpReward === 100, 'Normalized XP reward preserved: 100');

  // AI Legitimate 2: "Complete quest <valid ID>"
  const aiLegit2 = validateDomainAction(
    {
      type: 'COMPLETE_QUEST',
      payload: {
        questId: testQuest.id,
      },
    },
    'ai',
    context
  );
  assert(aiLegit2.isValid === true, 'AI request "COMPLETE_QUEST valid-id" passed validation');

  // Test dispatching arbitrary mutation through stateAuthority.dispatch
  const dispatchArbitrary = stateAuthority.dispatch(
    { type: 'ADD_XP' as any, payload: { xp: 1000 } },
    'ai'
  );
  assert(dispatchArbitrary.success === false, 'stateAuthority.dispatch rejected arbitrary ADD_XP');

  console.log('\n>>> TEST 3: DOMAIN EVENTS VERIFICATION');

  const capturedEvents: string[] = [];
  const unsub = domainEventBus.subscribe('*', (evt) => {
    capturedEvents.push(evt.type);
  });

  stateAuthority.createQuest({ title: 'Event Test Quest', rank: 'E', xpReward: 50 }, 'user');
  assert(capturedEvents.includes('QUEST_CREATED'), 'QUEST_CREATED domain event emitted');

  stateAuthority.dispatch(
    { type: 'ADD_XP' as any, payload: { xp: 9999 } },
    'ai'
  );
  assert(capturedEvents.includes('AI_ACTION_REJECTED'), 'AI_ACTION_REJECTED domain event emitted');

  unsub();

  console.log('\n>>> TEST 4: FACTORY RESET INTEGRITY');

  // Verify state before reset has quests and modified player
  assert(stateAuthority.getState().quests.length > 0, 'Quests present before reset');
  assert(stateAuthority.getState().player.level >= 2, 'Player level >= 2 before reset');

  // Run factory reset
  const resetState = stateAuthority.factoryReset();
  assert(resetState.player.level === 1, 'Factory reset: Level is 1');
  assert(resetState.player.currentXP === 0, 'Factory reset: Current XP is 0');
  assert(resetState.player.totalXPEarned === 0, 'Factory reset: Total XP Earned is 0');
  assert(resetState.player.gold === 0, 'Factory reset: Gold is 0');
  assert(resetState.player.statPoints === 0, 'Factory reset: Stat points are 0');
  assert(resetState.player.streak === 0, 'Factory reset: Streak is 0');
  assert(resetState.player.rank === 'E', 'Factory reset: Rank is E');
  assert(resetState.quests.length === 0, 'Factory reset: Quests cleared (0)');
  assert(resetState.rewardTransactions.length === 0, 'Factory reset: Reward transactions ledger cleared (0)');
  assert(resetState.history.length === 0, 'Factory reset: History cleared (0)');
  assert(resetState.workSessions.length === 0, 'Factory reset: Work sessions cleared (0)');
  assert(resetState.projects.length === 0, 'Factory reset: Projects cleared (0)');
  assert(resetState.milestones.length === 0, 'Factory reset: Milestones cleared (0)');

  // ----------------------------------------------------
  // TEST 5: VERSIONED STORAGE & MIGRATIONS INTEGRITY
  // ----------------------------------------------------
  console.log('\n>>> TEST 5: VERSIONED STORAGE & MIGRATIONS INTEGRITY');

  // Verify saved data in storage is wrapped in StorageEnvelope with schemaVersion
  const rawEnvelopeString = mockStorage.getItem(STORAGE_KEY_PLAYER);
  assert(!!rawEnvelopeString, 'Player data exists in raw storage');
  const parsedEnvelope = JSON.parse(rawEnvelopeString!);
  assert(parsedEnvelope.schemaVersion === 1, 'Raw storage uses StorageEnvelope with schemaVersion = 1');
  assert(parsedEnvelope.data !== undefined && parsedEnvelope.data.name !== undefined, 'StorageEnvelope contains data payload');
  assert(typeof parsedEnvelope.updatedAt === 'string', 'StorageEnvelope contains timestamp');

  // Test legacy data automatic migration: simulate raw un-enveloped object in storage
  const legacyKey = 'solo_test_legacy_key';
  const legacyPayload = { legacyProp: true, value: 42 };
  mockStorage.setItem(legacyKey, JSON.stringify(legacyPayload));

  // Loading via loadStoredData should detect legacy version 0 and wrap it to current version
  const migratedData = loadStoredData<typeof legacyPayload>(legacyKey, { legacyProp: false, value: 0 });
  assert(migratedData.legacyProp === true && migratedData.value === 42, 'Legacy unversioned data loaded transparently');
  const migratedEnvelope = JSON.parse(mockStorage.getItem(legacyKey)!);
  assert(migratedEnvelope.schemaVersion === 1, 'Legacy data was automatically upgraded to schemaVersion 1 in storage');

  // ----------------------------------------------------
  // TEST 6: ATOMIC USER PARTITION SWITCHING
  // ----------------------------------------------------
  console.log('\n>>> TEST 6: ATOMIC USER PARTITION SWITCHING');

  // Switch to Hunter Cha
  const chaState = stateAuthority.switchUser('hunter_cha');
  assert(stateAuthority.getCurrentUserId() === 'hunter_cha', 'Current user ID set to hunter_cha');
  assert(chaState.player.name === 'Cha Hae-In', 'Atomic switch: Player profile is Cha Hae-In');

  // Switch to Commander Igris
  const igrisState = stateAuthority.switchUser('hunter_igris');
  assert(stateAuthority.getCurrentUserId() === 'hunter_igris', 'Current user ID set to hunter_igris');
  assert(igrisState.player.name === 'Commander Igris', 'Atomic switch: Player profile is Commander Igris');

  // Switch back to guest
  const guestState = stateAuthority.switchUser('guest');
  assert(stateAuthority.getCurrentUserId() === 'guest', 'Current user ID returned to guest');
  assert(guestState.player.name !== 'Commander Igris', 'Guest user data is completely separate and unpolluted');

  // ----------------------------------------------------
  // TEST 7: HUNTER AWAKENING INTEGRITY
  // ----------------------------------------------------
  console.log('\n>>> TEST 7: HUNTER AWAKENING INTEGRITY');

  const awakenedState = stateAuthority.completeAwakening(
    {
      name: 'Sung Jin-Woo',
      avatar: 'monarch',
      title: 'Shadow Monarch (Awakened)',
      quests: [
        {
          id: 'starter-quest-1',
          title: 'Daily Training Protocol',
          description: '100 pushups, 100 situps, 100 squats, 10km run',
          type: 'daily',
          rank: 'E',
          category: 'Fitness',
          xpReward: 50,
          goldReward: 40,
          completed: false,
        },
      ],
      skills: [
        {
          id: 'starter-skill-1',
          name: 'Sprint',
          category: 'Agility',
          level: 1,
          maxLevel: 10,
          xp: 0,
          xpToNext: 300,
          description: '30% speed boost',
          buff: '+30% Speed',
          iconName: 'Zap',
        },
      ],
    },
    'user'
  );

  assert(awakenedState.player.name === 'Sung Jin-Woo', 'Awakened name set to Sung Jin-Woo');
  assert(awakenedState.player.level === 1, 'Awakening strictly initializes at Level 1');
  assert(awakenedState.player.currentXP === 0, 'Awakening strictly initializes at 0 XP');
  assert(awakenedState.player.totalXPEarned === 0, 'Awakening strictly initializes at 0 Total XP');
  assert(awakenedState.player.gold === 0, 'Awakening strictly initializes at 0 Gold');
  assert(awakenedState.player.statPoints === 0, 'Awakening strictly initializes at 0 SP');
  assert(awakenedState.player.streak === 0, 'Awakening strictly initializes at 0 Streak');
  assert(awakenedState.player.rank === 'E', 'Awakening strictly initializes at Rank E');
  assert(awakenedState.quests.some((q) => q.id === 'starter-quest-1' && !q.completed), 'Starter quest registered uncompleted');
  assert(awakenedState.skills.some((s) => s.name === 'Sprint' && s.level === 1), 'Starter skill registered at Level 1');

  // ----------------------------------------------------
  // TEST 7: SKILL DELETION & REFUND INTEGRITY TEST
  // ----------------------------------------------------
  console.log('\n>>> TEST 7: SKILL DELETION & STAT POINTS REFUND');
  // Add a test skill
  const skillToTest = stateAuthority.unlockSkill({
    name: 'Accidental Mistake Skill',
    category: 'Motion Design',
    description: 'Added by mistake',
    buff: '+5% Speed',
    level: 1,
    maxLevel: 10,
    xp: 0,
    xpToNext: 300,
  });
  assert(stateAuthority.getState().skills.some((s) => s.name === 'Accidental Mistake Skill'), 'Mistaken skill added to Matrix');

  // Delete via deleteSkill method
  const deleteRes1 = stateAuthority.deleteSkill(skillToTest.id, 'user');
  assert(deleteRes1.success === true, 'deleteSkill succeeded');
  assert(!stateAuthority.getState().skills.some((s) => s.id === skillToTest.id), 'Mistaken skill removed from state');

  // Add another skill and simulate upgrading it
  const upgradedSkill = stateAuthority.unlockSkill({
    name: 'Upgrade Test Skill',
    category: 'Coding',
    description: 'Upgraded skill',
    buff: '+10% Focus',
    level: 3, // 2 upgrades invested = 2 SP
    maxLevel: 10,
    xp: 0,
    xpToNext: 300,
  });
  const spBefore = stateAuthority.getState().player.statPoints;
  const deleteRes2 = stateAuthority.deleteSkill(upgradedSkill.id, 'user');
  assert(deleteRes2.success === true, 'Upgraded skill deleted');
  assert(deleteRes2.refundedStatPoints === 2, '2 Stat Points refunded for Tier 3 skill');
  assert(stateAuthority.getState().player.statPoints === spBefore + 2, 'Player statPoints pool received 2 refunded points');

  // Test dispatch DELETE_SKILL action
  const dispatchDeleteRes = stateAuthority.dispatch({
    type: 'DELETE_SKILL',
    payload: { skillName: 'Sprint' },
  });
  assert(dispatchDeleteRes.success === true, 'DELETE_SKILL action dispatched successfully by skill name');
  assert(!stateAuthority.getState().skills.some((s) => s.name === 'Sprint'), 'Sprint skill removed via dispatch');

  console.log('\n====================================================');
  console.log(allPassed ? 'ALL AUTOMATED TESTS PASSED SUCCESSFULLY!' : 'SOME TESTS FAILED - REVIEW ABOVE');
  console.log('====================================================');

  if (!allPassed) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error('Audit crashed:', err);
  process.exit(1);
});
