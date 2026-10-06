/**
 * One-time migration from the v2 prototype's localStorage layout.
 *
 * The prototype stored every account — including plaintext passwords — under
 * `abtest_users`, and per-user history under `abtest_history_<email>`. We
 * re-analyse the saved tests with the corrected engine, import them into the
 * v3 workspace, and delete the insecure keys.
 */

import type { ExperimentRecord } from '@/types/experiment';
import { EMPTY_HYPOTHESIS } from '@/types/experiment';
import { twoProportionZTest } from '@/lib/stats/abEngine';
import { buildNarrative } from '@/lib/stats/narrative';
import { useWorkspace } from './workspace';

interface LegacyTest {
  id?: number;
  timestamp?: string;
  testName?: string;
  hypothesis?: string;
  visitorsA?: number;
  conversionsA?: number;
  visitorsB?: number;
  conversionsB?: number;
  confidence?: number;
}

const LEGACY_KEYS = /^abtest_(users|current_user|history_.+)$/;

function convert(test: LegacyTest): ExperimentRecord | null {
  const input = {
    visitorsA: Number(test.visitorsA),
    conversionsA: Number(test.conversionsA),
    visitorsB: Number(test.visitorsB),
    conversionsB: Number(test.conversionsB),
    confidence: Number(test.confidence) || 0.95,
  };
  try {
    const result = twoProportionZTest(input);
    const created = test.timestamp && !Number.isNaN(Date.parse(test.timestamp)) ? test.timestamp : new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      name: test.testName?.trim() || 'Imported experiment',
      hypothesis: { ...EMPTY_HYPOTHESIS, rationale: test.hypothesis?.trim() ?? '' },
      status: 'concluded',
      metric: 'binary',
      inputs: input,
      summary: {
        pValue: result.pValue,
        isSignificant: result.isSignificant,
        absoluteDiff: result.absoluteDiff,
        relativeUplift: result.relativeUplift,
        ciAbsolute: result.ciAbsolute,
        probBBeatsA: result.probBBeatsA,
        verdict: buildNarrative(result).verdict,
        source: 'local',
        srmDetected: result.srm.detected,
      },
      createdAt: created,
      updatedAt: created,
    };
  } catch {
    return null;
  }
}

/** Returns the number of imported experiments. Safe to call on every mount. */
export function migrateLegacyStorage(): number {
  if (typeof window === 'undefined') return 0;
  const { legacyImported, mergeExperiments, markLegacyImported } = useWorkspace.getState();
  let keys: string[];
  try {
    keys = Object.keys(window.localStorage).filter((k) => LEGACY_KEYS.test(k));
  } catch {
    return 0;
  }
  if (keys.length === 0) return 0;

  const imported: ExperimentRecord[] = [];
  if (!legacyImported) {
    for (const key of keys.filter((k) => k.startsWith('abtest_history_'))) {
      try {
        const tests = JSON.parse(window.localStorage.getItem(key) ?? '[]') as LegacyTest[];
        for (const t of Array.isArray(tests) ? tests : []) {
          const record = convert(t);
          if (record) imported.push(record);
        }
      } catch {
        // Corrupt legacy entry — skip it.
      }
    }
    if (imported.length) mergeExperiments(imported);
    markLegacyImported();
  }

  // Always purge the insecure prototype keys (plaintext credentials).
  for (const key of keys) window.localStorage.removeItem(key);
  return imported.length;
}
