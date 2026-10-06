/**
 * Hybrid statistics service.
 *
 * Results are always computed on-device first (instant, and it validates the
 * input). When the FastAPI engine is configured and healthy, the same request
 * is sent to SciPy and its result supersedes the local one. If the service is
 * offline, slow or erroring, the UI keeps the on-device result — no blank
 * states, no spinners blocking the analysis.
 */

import type {
  BinaryAnalysisResponse,
  ContinuousAnalysisResponse,
  CupedResponse,
  HealthResponse,
  SampleSizeResponse,
} from '@/types/api';
import type {
  BinaryInput,
  BinaryResult,
  ContinuousInput,
  ContinuousResult,
  CupedInput,
  CupedResult,
  SampleSizeInput,
  SampleSizeResult,
} from '@/types/stats';
import { useEngineStatus } from '@/lib/store/engineStatus';
import { APIError, apiRequest, isApiConfigured } from './client';
import {
  fromBinaryResponse,
  fromContinuousResponse,
  fromCupedResponse,
  fromSampleSizeResponse,
  toBinaryRequest,
  toContinuousRequest,
  toCupedRequest,
  toSampleSizeRequest,
} from './mappers';

const RECHECK_AFTER_MS = 30_000;

let inflightHealth: Promise<boolean> | null = null;

/** Pings `/health`, de-duplicating concurrent calls and updating the status store. */
export function checkEngineHealth(): Promise<boolean> {
  const { setStatus } = useEngineStatus.getState();
  if (!isApiConfigured) {
    setStatus('unconfigured');
    return Promise.resolve(false);
  }
  inflightHealth ??= apiRequest<HealthResponse>('/health', { timeoutMs: 4000 })
    .then((res) => {
      setStatus('online', res.engine);
      return true;
    })
    .catch(() => {
      setStatus('offline');
      return false;
    })
    .finally(() => {
      inflightHealth = null;
    });
  return inflightHealth;
}

async function engineAvailable(): Promise<boolean> {
  if (!isApiConfigured) return false;
  const { status, checkedAt } = useEngineStatus.getState();
  if (status === 'online') return true;
  if (status === 'offline' && Date.now() - checkedAt < RECHECK_AFTER_MS) return false;
  return checkEngineHealth();
}

/** Runs `remote` against SciPy; resolves to null when the engine can't be used. */
async function tryRemote<T>(remote: () => Promise<T>, signal?: AbortSignal): Promise<T | null> {
  if (!(await engineAvailable()) || signal?.aborted) return null;
  try {
    return await remote();
  } catch (err) {
    if (signal?.aborted) return null;
    // A 4xx means local and remote validation disagree; keep the local result
    // rather than surfacing a confusing error. Network/5xx → mark offline.
    if (!(err instanceof APIError && err.isClientError)) useEngineStatus.getState().setStatus('offline');
    return null;
  }
}

export const remoteEngine = {
  analyzeBinary: (input: BinaryInput, signal?: AbortSignal): Promise<BinaryResult | null> =>
    tryRemote(
      () =>
        apiRequest<BinaryAnalysisResponse>('/api/v1/analyze', { method: 'POST', body: toBinaryRequest(input), signal }).then(
          fromBinaryResponse,
        ),
      signal,
    ),

  analyzeContinuous: (input: ContinuousInput, signal?: AbortSignal): Promise<ContinuousResult | null> =>
    tryRemote(
      () =>
        apiRequest<ContinuousAnalysisResponse>('/api/v1/analyze/continuous', {
          method: 'POST',
          body: toContinuousRequest(input),
          signal,
        }).then(fromContinuousResponse),
      signal,
    ),

  sampleSize: (input: SampleSizeInput, signal?: AbortSignal): Promise<SampleSizeResult | null> =>
    tryRemote(
      () =>
        apiRequest<SampleSizeResponse>('/api/v1/sample-size', { method: 'POST', body: toSampleSizeRequest(input), signal }).then(
          fromSampleSizeResponse,
        ),
      signal,
    ),

  cuped: (input: CupedInput, signal?: AbortSignal): Promise<CupedResult | null> =>
    tryRemote(
      () =>
        apiRequest<CupedResponse>('/api/v1/analyze/cuped', {
          method: 'POST',
          body: toCupedRequest(input),
          signal,
          timeoutMs: 15_000,
        }).then(fromCupedResponse),
      signal,
    ),
};
