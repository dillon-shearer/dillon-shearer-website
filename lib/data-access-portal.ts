import { sql } from '@vercel/postgres';
import { randomUUID } from 'crypto';
import { nanoid } from 'nanoid';
import type {
  DarRequest,
  DarVisualizationPreset,
  DarRequestStatus,
  DarCollaborator,
  DarRequestedDataset,
  DarStatusEvent,
} from '@/types/data-access-portal';

const DEFAULT_PROJECT_TITLE = 'Untitled project';
let statusEventsTableReady: Promise<void> | null = null;
let requestNotesTableReady: Promise<void> | null = null;
let palettePrefsTableReady: Promise<void> | null = null;

async function ensureStatusEventsTable() {
  if (!statusEventsTableReady) {
    statusEventsTableReady = sql`
      CREATE TABLE IF NOT EXISTS dar_status_events (
        id UUID PRIMARY KEY,
        request_id UUID NOT NULL REFERENCES dar_requests(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        description TEXT,
        metadata TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
  }
  await statusEventsTableReady;
}

async function ensureRequestNotesTable() {
  if (!requestNotesTableReady) {
    requestNotesTableReady = sql`
      CREATE TABLE IF NOT EXISTS dar_request_notes (
        request_id UUID PRIMARY KEY REFERENCES dar_requests(id) ON DELETE CASCADE,
        notes TEXT,
        follow_up TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
  }
  await requestNotesTableReady;
}

async function ensurePalettePrefsTable() {
  if (!palettePrefsTableReady) {
    palettePrefsTableReady = sql`
      CREATE TABLE IF NOT EXISTS dar_request_palette_preferences (
        request_id UUID PRIMARY KEY REFERENCES dar_requests(id) ON DELETE CASCADE,
        palette TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
  }
  await palettePrefsTableReady;
}

async function logStatusEvent(
  requestId: string,
  status: string,
  description: string,
  metadata?: string | null
) {
  try {
    await ensureStatusEventsTable();
    const now = new Date().toISOString();
    await sql`
      INSERT INTO dar_status_events (
        id,
        request_id,
        status,
        description,
        metadata,
        created_at
      )
      VALUES (
        ${randomUUID()},
        ${requestId},
        ${status},
        ${description},
        ${metadata ?? null},
        ${now}
      )
    `;
  } catch (error) {
    console.error('Failed to log status event', error);
  }
}

export async function getRequestPalette(requestId: string): Promise<string[] | null> {
  await ensurePalettePrefsTable();
  try {
    const result = await sql`
      SELECT palette
      FROM dar_request_palette_preferences
      WHERE request_id = ${requestId}
    `;
    if (result.rows.length === 0) return null;
    const raw = result.rows[0].palette;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((color) => typeof color === 'string');
    }
    return null;
  } catch (error) {
    console.error('Failed to load palette preference', error);
    return null;
  }
}

export async function saveRequestPalette(requestId: string, palette: string[]): Promise<void> {
  await ensurePalettePrefsTable();
  const payload = JSON.stringify(palette);
  try {
    await sql`
      INSERT INTO dar_request_palette_preferences (request_id, palette, updated_at)
      VALUES (${requestId}, ${payload}, NOW())
      ON CONFLICT (request_id)
      DO UPDATE SET palette = ${payload}, updated_at = NOW()
    `;
  } catch (error) {
    console.error('Failed to save palette preference', error);
  }
}

export async function recordDeliverableMetadata(
  requestId: string,
  metadata: DeliverableMetadata,
  description = 'Deliverable metadata updated.'
) {
  const payload = JSON.stringify(metadata);
  await logStatusEvent(requestId, 'DELIVERABLE_METADATA', description, payload);
}

type DeliverableMetadata = {
  visualizationPresets?: DarVisualizationPreset[];
  visualizationCustomRequest?: string | null;
  customDeliveryStatus?: 'pending' | 'fulfilled' | 'rejected';
  customDeliveryNote?: string | null;
};

const DEMO_VISUALIZATION_ENRICHMENTS: Record<string, DeliverableMetadata> = {
  '11111111-1111-4111-8111-aaaaaaaaaaa1': {
    visualizationPresets: ['split-all-time', 'volume-all-time'],
    visualizationCustomRequest: 'Overlay k-anon suppression for small-N cohorts.',
  },
  '22222222-2222-4222-8222-bbbbbbbbbbb2': {
    visualizationPresets: ['rep-all-time'],
    visualizationCustomRequest: 'Stacked bars for practice vs meet weeks.',
  },
  '55555555-5555-4555-8555-eeeeeeeeeee5': {
    visualizationPresets: ['training-days-all-time'],
    visualizationCustomRequest: null,
  },
  '77777777-7777-4777-8777-777777777777': {
    visualizationPresets: ['split-all-time', 'rep-all-time'],
    visualizationCustomRequest: 'Add squad comparison for pro vs amateur.',
  },
  '99999999-9999-4999-8999-999999999999': {
    visualizationPresets: ['volume-all-time', 'training-days-all-time'],
    visualizationCustomRequest: null,
  },
};

const parseDeliverableMetadata = (raw?: string | null): DeliverableMetadata | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as DeliverableMetadata;
    }
    return null;
  } catch {
    return null;
  }
};

function applyDeliverablePlan(request: DarRequest): DarRequest {
  const fallback = DEMO_VISUALIZATION_ENRICHMENTS[request.id];

  let meta: DeliverableMetadata | null = null;
  if (request.statusEvents && request.statusEvents.length > 0) {
    for (let i = request.statusEvents.length - 1; i >= 0; i -= 1) {
      const parsed = parseDeliverableMetadata(request.statusEvents[i]?.metadata);
      if (
        parsed &&
        (parsed.visualizationPresets ||
          parsed.visualizationCustomRequest ||
          parsed.customDeliveryStatus)
      ) {
        meta = parsed;
        break;
      }
    }
  }

  request.visualizationPresets =
    (meta?.visualizationPresets && meta.visualizationPresets.length > 0
      ? meta.visualizationPresets
      : request.visualizationPresets && request.visualizationPresets.length > 0
        ? request.visualizationPresets
        : fallback?.visualizationPresets) ?? [];

  request.visualizationCustomRequest =
    meta?.visualizationCustomRequest ??
    request.visualizationCustomRequest ??
    fallback?.visualizationCustomRequest ??
    null;

  request.customDeliveryStatus =
    meta?.customDeliveryStatus ??
    request.customDeliveryStatus ??
    fallback?.customDeliveryStatus ??
    (request.visualizationCustomRequest ? 'pending' : null);
  request.customDeliveryNote =
    meta?.customDeliveryNote ??
    request.customDeliveryNote ?? 
    fallback?.customDeliveryNote ?? 
    null;

  return request;
}

// ============================================================================
// CREATE REQUEST
// ============================================================================

type CreateDarRequestInput = {
  piName: string;
  piEmail: string;
  piPhone?: string;
  institution: string;
  country: string;
  projectTitle?: string | null;
  dataUseProposal: string;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  datasets: Array<{ datasetSlug: string; level?: number | null }>;
  collaborators: Array<{
    name: string;
    email: string;
    phone?: string | null;
  }>;
  visualizationPresets?: DarVisualizationPreset[];
  visualizationCustomRequest?: string | null;
};

export async function createDarRequest(
  input: CreateDarRequestInput
): Promise<DarRequest> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const normalizedProjectTitle =
    (input.projectTitle ?? '').trim() || DEFAULT_PROJECT_TITLE;

  try {
    // Insert main request
    const requestResult = await sql`
      INSERT INTO dar_requests (
        id,
        pi_name,
        pi_email,
        pi_phone,
        institution,
        country,
        project_title,
        data_use_proposal,
        planned_start,
        planned_end,
        status,
        status_last_changed_at,
        created_at,
        updated_at
      )
      VALUES (
        ${id},
        ${input.piName},
        ${input.piEmail},
        ${input.piPhone || null},
        ${input.institution},
        ${input.country},
        ${normalizedProjectTitle},
        ${input.dataUseProposal},
        ${input.plannedStart || null},
        ${input.plannedEnd || null},
        'SUBMITTED',
        ${now},
        ${now},
        ${now}
      )
      RETURNING *
    `;

    const request = requestResult.rows[0];

    // Insert datasets
    if (input.datasets.length > 0) {
      for (const dataset of input.datasets) {
        await sql`
          INSERT INTO dar_requested_datasets (
            id,
            request_id,
            dataset_slug,
            level
          )
          VALUES (
            ${randomUUID()},
            ${id},
            ${dataset.datasetSlug},
            ${dataset.level ?? 1}
          )
        `;
      }
    }

    // Insert collaborators
    if (input.collaborators.length > 0) {
      for (const collab of input.collaborators) {
        await sql`
          INSERT INTO dar_collaborators (
            id,
            request_id,
            name,
            email,
            institution
          )
          VALUES (
            ${randomUUID()},
            ${id},
            ${collab.name},
            ${collab.email},
            ${collab.phone || null}
          )
        `;
      }
    }

    const metadata = JSON.stringify({
      visualizationPresets: input.visualizationPresets ?? [],
      visualizationCustomRequest: input.visualizationCustomRequest ?? null,
      customDeliveryStatus: input.visualizationCustomRequest ? 'pending' : undefined,
      customDeliveryNote: null,
    });

    await logStatusEvent(id, 'SUBMITTED', `${input.piName} submitted the request.`, metadata);

    const mapped = mapDarRequestFromDb(request);
    mapped.visualizationPresets = input.visualizationPresets ?? [];
    mapped.visualizationCustomRequest = input.visualizationCustomRequest ?? null;
    mapped.customDeliveryStatus = input.visualizationCustomRequest ? 'pending' : null;
    mapped.customDeliveryNote = null;
    mapped.collaborators = input.collaborators ?? [];
    mapped.collaboratorCount = mapped.collaborators.length;
    return mapped;
  } catch (error) {
    console.error('Error creating DAR request:', error);
    throw new Error('Failed to create data access request');
  }
}

// ============================================================================
// GET ALL REQUESTS
// ============================================================================

export async function getAllDarRequests(): Promise<DarRequest[]> {
  try {
    const result = await sql`
      SELECT
        r.*,
        se.metadata AS latest_metadata,
        se.created_at AS latest_metadata_at,
        COALESCE(collab.collaborator_count, 0) AS collaborator_count
      FROM dar_requests r
      LEFT JOIN LATERAL (
        SELECT metadata, created_at
        FROM dar_status_events
        WHERE request_id = r.id AND metadata IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 1
      ) se ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS collaborator_count
        FROM dar_collaborators dc
        WHERE dc.request_id = r.id
      ) collab ON TRUE
      ORDER BY r.created_at DESC
    `;
    return result.rows.map((row) => {
      const mapped = mapDarRequestFromDb(row);
      if (row.latest_metadata) {
        mapped.statusEvents = [
          {
            id: 'inline-meta',
            requestId: mapped.id,
            status: 'SUBMITTED',
            description: '',
            metadata: row.latest_metadata,
            createdAt: row.latest_metadata_at ?? mapped.createdAt,
          } as DarStatusEvent,
        ];
      }
      return applyDeliverablePlan(mapped);
    });
  } catch (error) {
    console.error('Error fetching DAR requests:', error);
    throw new Error('Failed to fetch data access requests');
  }
}

export { getAllDarRequests as listDarRequests };

// ============================================================================
// GET REQUEST BY ID (with relations)
// ============================================================================

export async function getDarRequestById(
  id: string
): Promise<DarRequest | null> {
  try {
    const result = await sql`
      SELECT * FROM dar_requests
      WHERE id = ${id}
    `;

    if (result.rows.length === 0) return null;

    const request = mapDarRequestFromDb(result.rows[0]);

    // Fetch datasets
    const datasetsResult = await sql`
      SELECT * FROM dar_requested_datasets
      WHERE request_id = ${id}
      ORDER BY dataset_slug
    `;
    request.requestedDatasets = datasetsResult.rows.map((row) => ({
      id: row.id,
      requestId: row.request_id,
      datasetSlug: row.dataset_slug,
      level: row.level ?? null,
    }));

    // Fetch collaborators
    const collabsResult = await sql`
      SELECT * FROM dar_collaborators
      WHERE request_id = ${id}
      ORDER BY name
    `;
    request.collaborators = collabsResult.rows.map((row) => ({
      id: row.id,
      requestId: row.request_id,
      name: row.name,
      email: row.email,
      phone: row.institution,
    }));
    request.collaboratorCount = request.collaborators.length;

    await ensureStatusEventsTable();
    const eventsResult = await sql`
      SELECT id, request_id, status, description, metadata, created_at
      FROM dar_status_events
      WHERE request_id = ${id}
      ORDER BY created_at ASC
    `;
    request.statusEvents = eventsResult.rows.map((row) => ({
      id: row.id,
      requestId: row.request_id,
      status: row.status,
      description: row.description,
      metadata: row.metadata,
      createdAt: row.created_at,
    })) as DarStatusEvent[];

    return applyDeliverablePlan(request);
  } catch (error) {
    console.error('Error fetching DAR request by ID:', error);
    throw new Error('Failed to fetch data access request');
  }
}

export { getDarRequestById as getDarRequestWithRelations };

export async function markDarRequestInReview(id: string): Promise<DarRequest | null> {
  const now = new Date().toISOString();
  try {
    const result = await sql`
      UPDATE dar_requests
      SET
        status = 'IN_REVIEW',
        status_last_changed_at = ${now},
        updated_at = ${now}
      WHERE id = ${id}
      AND status = 'SUBMITTED'
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return null;
    }

    const mapped = mapDarRequestFromDb(result.rows[0]);
    await logStatusEvent(id, 'IN_REVIEW', 'Request moved to in review.');
    return mapped;
  } catch (error) {
    console.error('Error marking DAR request in review:', error);
    return null;
  }
}

// ============================================================================
// UPDATE REQUEST METADATA
// ============================================================================

type UpdateDarRequestInput = {
  piName?: string;
  piEmail?: string;
  piPhone?: string | null;
  institution?: string;
  country?: string;
  projectTitle?: string | null;
  dataUseProposal?: string;
  plannedStart?: string | null;
  plannedEnd?: string | null;
};

export async function updateDarRequest(
  id: string,
  patch: UpdateDarRequestInput,
  updatedBy: string = 'demo-admin'
): Promise<DarRequest> {
  const now = new Date().toISOString();
  const shouldUpdatePiPhone = patch.piPhone !== undefined;
  const shouldUpdateProjectTitle = patch.projectTitle !== undefined;
  const normalizedProjectTitle =
    patch.projectTitle !== undefined
      ? (patch.projectTitle ?? '').trim() || DEFAULT_PROJECT_TITLE
      : null;
  const shouldUpdatePlannedStart = patch.plannedStart !== undefined;
  const shouldUpdatePlannedEnd = patch.plannedEnd !== undefined;
  const plannedStartValue = patch.plannedStart ?? null;
  const plannedEndValue = patch.plannedEnd ?? null;

  try {
    const result = await sql`
      UPDATE dar_requests
      SET
        pi_name = COALESCE(${patch.piName ?? null}, pi_name),
        pi_email = COALESCE(${patch.piEmail ?? null}, pi_email),
        pi_phone = CASE WHEN ${shouldUpdatePiPhone} THEN ${patch.piPhone ?? null} ELSE pi_phone END,
        institution = COALESCE(${patch.institution ?? null}, institution),
        country = COALESCE(${patch.country ?? null}, country),
        project_title = CASE WHEN ${shouldUpdateProjectTitle} THEN ${normalizedProjectTitle ?? DEFAULT_PROJECT_TITLE} ELSE project_title END,
        data_use_proposal = COALESCE(${patch.dataUseProposal ?? null}, data_use_proposal),
        planned_start = CASE WHEN ${shouldUpdatePlannedStart} THEN ${plannedStartValue} ELSE planned_start END,
        planned_end = CASE WHEN ${shouldUpdatePlannedEnd} THEN ${plannedEndValue} ELSE planned_end END,
        updated_at = ${now}
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      throw new Error('Request not found');
    }

    const mapped = mapDarRequestFromDb(result.rows[0]);
    await logStatusEvent(
      id,
      'UPDATED',
      `Metadata updated by ${updatedBy}.`
    );

    return mapped;
  } catch (error) {
    console.error('Error updating DAR request:', error);
    throw new Error('Failed to update data access request');
  }
}

// ============================================================================
// APPROVE REQUEST
// ============================================================================

export async function approveDarRequest(
  id: string,
  approvedBy: string = 'demo-admin'
): Promise<{ request: DarRequest; apiKey: string }> {
  const now = new Date().toISOString();
  const apiKey = `dar_${nanoid(32)}`;

  try {
    const result = await sql`
      UPDATE dar_requests
      SET
        status = 'APPROVED',
        status_last_changed_at = ${now},
        approved_at = ${now},
        approved_by = ${approvedBy},
        denied_at = NULL,
        denied_by = NULL,
        denied_reason = NULL,
        revoked_at = NULL,
        revoked_by = NULL,
        api_key_hash = ${apiKey},
        api_key_issued_at = ${now},
        updated_at = ${now}
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      throw new Error('Request not found');
    }

    const mapped = mapDarRequestFromDb(result.rows[0]);
    await logStatusEvent(
      id,
      'APPROVED',
      `Approved by ${approvedBy}.`,
      'API key minted at approval.'
    );

    return {
      request: mapped,
      apiKey,
    };
  } catch (error) {
    console.error('Error approving DAR request:', error);
    throw new Error('Failed to approve data access request');
  }
}

// ============================================================================
// DENY REQUEST
// ============================================================================

export async function denyDarRequest(
  id: string,
  reason: string,
  deniedBy: string = 'demo-admin'
): Promise<DarRequest> {
  const now = new Date().toISOString();

  try {
    const result = await sql`
      UPDATE dar_requests
      SET
        status = 'DENIED',
        status_last_changed_at = ${now},
        denied_at = ${now},
        denied_by = ${deniedBy},
        denied_reason = ${reason},
        approved_at = NULL,
        approved_by = NULL,
        api_key_hash = NULL,
        api_key_issued_at = NULL,
        revoked_at = NULL,
        revoked_by = NULL,
        updated_at = ${now}
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      throw new Error('Request not found');
    }

    const mapped = mapDarRequestFromDb(result.rows[0]);
    await logStatusEvent(
      id,
      'DENIED',
      `Denied by ${deniedBy}.`,
      reason
    );

    return mapped;
  } catch (error) {
    console.error('Error denying DAR request:', error);
    throw new Error('Failed to deny data access request');
  }
}

// ============================================================================
// REVOKE REQUEST
// ============================================================================

export async function revokeDarRequest(
  id: string,
  revokedBy: string = 'demo-admin'
): Promise<DarRequest> {
  const now = new Date().toISOString();

  try {
    const result = await sql`
      UPDATE dar_requests
      SET
        status = 'DENIED',
        status_last_changed_at = ${now},
        revoked_at = ${now},
        revoked_by = ${revokedBy},
        denied_at = ${now},
        denied_by = ${revokedBy},
        denied_reason = COALESCE(denied_reason, 'Access revoked by admin'),
        approved_at = NULL,
        approved_by = NULL,
        api_key_hash = NULL,
        api_key_issued_at = NULL,
        updated_at = ${now}
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      throw new Error('Request not found');
    }

    const mapped = mapDarRequestFromDb(result.rows[0]);
    await logStatusEvent(
      id,
      'REVOKED',
      `Access revoked by ${revokedBy}.`,
      'API key invalidated.'
    );

    return mapped;
  } catch (error) {
    console.error('Error revoking DAR request:', error);
    throw new Error('Failed to revoke data access request');
  }
}

// ============================================================================
// VALIDATE API KEY
// ============================================================================

export async function getRequestFromApiKey(apiKey: string): Promise<DarRequest | null> {
  try {
    const result = await sql`
      SELECT id
      FROM dar_requests
      WHERE api_key_hash = ${apiKey}
    `;

    if (result.rows.length === 0) {
      return null;
    }

    return getDarRequestById(result.rows[0].id);
  } catch (error) {
    console.error('Error fetching DAR request by API key:', error);
    return null;
  }
}

export async function validateApiKey(
  apiKey: string
): Promise<{ valid: boolean; request: DarRequest | null }> {
  try {
    const request = await getRequestFromApiKey(apiKey);
    if (!request || request.status !== 'APPROVED' || request.revokedAt) {
      return { valid: false, request: null };
    }
    return { valid: true, request };
  } catch (error) {
    console.error('Error validating API key:', error);
    return { valid: false, request: null };
  }
}

// ============================================================================
// HELPER: Map DB row to DarRequest type
// ============================================================================

function mapDarRequestFromDb(row: any): DarRequest {
  return {
    id: row.id,
    piName: row.pi_name,
    piEmail: row.pi_email,
    piPhone: row.pi_phone,
    institution: row.institution,
    country: row.country,
    projectTitle: row.project_title || DEFAULT_PROJECT_TITLE,
    dataUseProposal: row.data_use_proposal,
    plannedStart: row.planned_start,
    plannedEnd: row.planned_end,
    status: row.status as DarRequestStatus,
    statusLastChangedAt: row.status_last_changed_at,
    lastUpdatedBy: row.last_updated_by,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    deniedAt: row.denied_at,
    deniedBy: row.denied_by,
    deniedReason: row.denied_reason,
    revokedAt: row.revoked_at,
    revokedBy: row.revoked_by,
    apiKeyIssuedAt: row.api_key_issued_at,
    apiKey: row.api_key_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deliveryTypes: [],
    visualizationPlan: null,
    packagePlan: null,
    visualizationPresets: [],
    visualizationCustomRequest: null,
    customDeliveryStatus: null,
    customDeliveryNote: null,
    requestedDatasets: [],
    collaborators: [],
    collaboratorCount:
      typeof row.collaborator_count === 'number'
        ? Number(row.collaborator_count)
        : undefined,
    statusEvents: [],
  };
}

export async function replaceRequestedDatasets(
  requestId: string,
  datasets: Array<{ datasetSlug: string; level?: number | null }>
): Promise<void> {
  await sql`
    DELETE FROM dar_requested_datasets
    WHERE request_id = ${requestId}
  `;

  if (!datasets || datasets.length === 0) return;

  for (const dataset of datasets) {
    await sql`
      INSERT INTO dar_requested_datasets (
        id,
        request_id,
        dataset_slug,
        level
      )
      VALUES (
        ${randomUUID()},
        ${requestId},
        ${dataset.datasetSlug},
        ${dataset.level ?? 1}
      )
    `;
  }
}

export async function replaceDarCollaborators(
  requestId: string,
  collaborators: Array<{ name: string; email: string; phone?: string | null }>
): Promise<void> {
  await sql`
    DELETE FROM dar_collaborators
    WHERE request_id = ${requestId}
  `;

  if (!collaborators || collaborators.length === 0) return;

  for (const collab of collaborators) {
    await sql`
      INSERT INTO dar_collaborators (
        id,
        request_id,
        name,
        email,
        institution
      )
      VALUES (
        ${randomUUID()},
        ${requestId},
        ${collab.name},
        ${collab.email},
        ${collab.phone ?? null}
      )
    `;
  }
}

type RequestNotesRecord = {
  notes: string | null;
  followUp: string | null;
  updatedAt: string;
};

export async function getDarRequestNotes(
  requestId: string
): Promise<RequestNotesRecord | null> {
  await ensureRequestNotesTable();
  const result = await sql`
    SELECT notes, follow_up, updated_at
    FROM dar_request_notes
    WHERE request_id = ${requestId}
  `;
  if (result.rows.length === 0) return null;
  return {
    notes: result.rows[0].notes,
    followUp: result.rows[0].follow_up,
    updatedAt: result.rows[0].updated_at,
  };
}

export async function saveDarRequestNotes(
  requestId: string,
  payload: { notes?: string; followUp?: string }
): Promise<RequestNotesRecord> {
  await ensureRequestNotesTable();
  const result = await sql`
    INSERT INTO dar_request_notes (request_id, notes, follow_up)
    VALUES (${requestId}, ${payload.notes ?? null}, ${payload.followUp ?? null})
    ON CONFLICT (request_id)
    DO UPDATE SET
      notes = EXCLUDED.notes,
      follow_up = EXCLUDED.follow_up,
      updated_at = NOW()
    RETURNING notes, follow_up, updated_at
  `;
  const row = result.rows[0];
  return {
    notes: row.notes,
    followUp: row.follow_up,
    updatedAt: row.updated_at,
  };
}
