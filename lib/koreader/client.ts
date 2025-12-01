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
};

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

  const attempts = (options.retries ?? 3) + 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await fetch(url, {
        method: 'GET',
        mode: 'no-cors',
      });

      return { ok: true, url };
    } catch (error) {
      if (attempt === attempts - 1) {
        return {
          ok: false,
          url,
          error:
            error instanceof Error
              ? error.message
              : 'Request failed. Confirm you are on the same network as the Kindle.',
        };
      }
      const delay = options.retryDelayMs ?? 120;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return { ok: false, error: 'Unknown KOReader error.' };
}

export async function warmKoreaderEndpoint(endpoint: string | undefined) {
  if (!endpoint?.trim()) return;
  const normalized = normalizeEndpoint(endpoint);
  try {
    await fetch(`${normalized}`, { method: 'GET', mode: 'no-cors' });
  } catch (error) {
    console.warn('Warmup failed', error);
  }
}
