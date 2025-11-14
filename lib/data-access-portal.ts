import { sql } from '@vercel/postgres';
import { randomUUID } from 'crypto';
import { nanoid } from 'nanoid';
import type {
  DarRequest,
  DarRequestStatus,
  DarCollaborator,
  DarRequestedDataset,
} from '@/types/data-access-portal';

const DEFAULT_PROJECT_TITLE = 'Untitled project';

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
  expectedDurationCategory?: string | null;
  datasets: Array<{ datasetSlug: string; level?: number | null }>;
  collaborators: Array<{
    name: string;
    email: string;
    phone?: string | null;
  }>;
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
        expected_duration_category,
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
        ${input.expectedDurationCategory ?? null},
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

    return mapDarRequestFromDb(request);
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
      SELECT * FROM dar_requests
      ORDER BY created_at DESC
    `;
    return result.rows.map(mapDarRequestFromDb);
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

    return request;
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

    return mapDarRequestFromDb(result.rows[0]);
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
  _updatedBy?: string
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

    return mapDarRequestFromDb(result.rows[0]);
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

    return {
      request: mapDarRequestFromDb(result.rows[0]),
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

    return mapDarRequestFromDb(result.rows[0]);
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

    return mapDarRequestFromDb(result.rows[0]);
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
    expectedDurationCategory: row.expected_duration_category,
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
    requestedDatasets: [],
    collaborators: [],
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
