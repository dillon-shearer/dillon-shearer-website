export const KOREADER_STORAGE_KEY = 'dwd:koreader:endpoint';

export const KOREADER_ACTIONS = {
  next: {
    id: 'next',
    label: 'Next Page',
    path: '/koreader/event/GotoViewRel/1',
  },
  prev: {
    id: 'prev',
    label: 'Previous Page',
    path: '/koreader/event/GotoViewRel/-1',
  },
  refresh: {
    id: 'refresh',
    label: 'Refresh Display',
    path: '/koreader/event/RefreshView',
  },
} as const;

export type KoreaderActionId = keyof typeof KOREADER_ACTIONS;

export function normalizeEndpoint(rawEndpoint: string): string {
  const trimmed = rawEndpoint.trim();
  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `http://${trimmed}`;
}

export function buildKoreaderUrl(endpoint: string, actionId: KoreaderActionId): string {
  const normalizedEndpoint = normalizeEndpoint(endpoint);

  if (!normalizedEndpoint) {
    throw new Error('Kindle endpoint is not configured.');
  }

  const action = KOREADER_ACTIONS[actionId];

  if (!action) {
    throw new Error(`Unknown KOReader action: ${actionId}`);
  }

  return `${normalizedEndpoint.replace(/\/+$/, '')}${action.path}`;
}

type SendCommandResult =
  | {
      ok: true;
      url: string;
    }
  | {
      ok: false;
      url?: string;
      error: string;
    };

type SendOptions = {
  retries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 1500;
const DEFAULT_RETRY_DELAY_MS = 120;
const DEFAULT_WARM_TIMEOUT_MS = 1000;

class FetchTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Request timed out (${Math.round(timeoutMs / 1000)} seconds).`);
    this.name = 'FetchTimeoutError';
  }
}

export async function sendKoreaderCommand(
  endpoint: string | undefined,
  actionId: KoreaderActionId,
  options: SendOptions = {},
): Promise<SendCommandResult> {
  if (!endpoint?.trim()) {
    return {
      ok: false,
      error: 'Kindle endpoint is not configured.',
    };
  }

  let url: string;
  try {
    url = buildKoreaderUrl(endpoint, actionId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to build KOReader URL.',
    };
  }

  const attempts = (options.retries ?? 1) + 1;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retryDelay = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  let lastErrorMessage = 'KOReader server unreachable. Confirm IP, port, and Wi-Fi.';

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await fetchKoreaderEndpoint(
        url,
        timeoutMs,
      );
      return { ok: true, url };
    } catch (error) {
      if (error instanceof FetchTimeoutError) {
        lastErrorMessage = error.message;
      } else if (error instanceof Error) {
        lastErrorMessage = error.message;
      } else {
        lastErrorMessage = 'KOReader server unreachable. Confirm IP, port, and Wi-Fi.';
      }

      if (attempt === attempts - 1) {
        return {
          ok: false,
          url,
          error: lastErrorMessage,
        };
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  return { ok: false, error: 'Unknown KOReader error.' };
}

export type WarmResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

export async function warmKoreaderEndpoint(endpoint: string | undefined): Promise<WarmResult> {
  if (!endpoint?.trim()) {
    return { ok: false, error: 'Kindle endpoint not configured.' };
  }
  try {
    await fetchKoreaderEndpoint(normalizeEndpoint(endpoint), DEFAULT_WARM_TIMEOUT_MS);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unable to reach KOReader. Confirm the IP & port.',
    };
  }
}

export async function prefetchKoreaderConnection(endpoint: string | undefined): Promise<void> {
  if (!endpoint?.trim()) {
    return;
  }
  try {
    await fetchKoreaderEndpoint(normalizeEndpoint(endpoint), DEFAULT_WARM_TIMEOUT_MS);
  } catch {
    // Prefetch is best-effort; ignore failures so the UI stays optimistic.
  }
}

async function fetchKoreaderEndpoint(url: string, timeoutMs: number) {
  if (!url) {
    throw new Error('Kindle endpoint is not configured.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await fetch(url, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      keepalive: true,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new FetchTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
