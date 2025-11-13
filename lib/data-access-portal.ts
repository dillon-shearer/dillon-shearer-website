// lib/data-access-portal.ts
import { sql } from '@vercel/postgres';
import { randomUUID, createHash, randomBytes } from 'crypto';
import type {
  DarRequest,
  DarRequestStatus,
  GymDatasetSlug,
  DarRequestedDataset,
  DarCollaborator,
} from '@/types/data-access-portal';

function toDarRequestRow(row: any): DarRequest {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    piName: row.pi_name,
    piEmail: row.pi_email,
    piPhone: row.pi_phone,
    institution: row.institution,
    country: row.country,
    projectTitle: row.project_title,
    dataUseProposal: row.data_use_proposal,
    plannedStart: row.planned_start,
    plannedEnd: row.planned_end,
    expectedDurationCategory: row.expected_duration_category,
    status: row.status,
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
  };
}

export async function createDarRequest(input: {
  piName: string;
  piEmail: string;
  piPhone?: string;
  institution: string;
  country: string;
  projectTitle: string;
  dataUseProposal: string;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  expectedDurationCategory?: string | null;
  datasets: { datasetSlug: GymDatasetSlug | string; level: number }[];
  collaborators: { name: string; email: string; institution?: string }[];
}): Promise<DarRequest> {
  const id = randomUUID();
  const now = new Date().toISOString();

  // but is not declared in the current TypeScript types.
  await (sql as any).begin(async (tx: any) => {
    await tx`
      INSERT INTO dar_requests (
        id,
        created_at,
        updated_at,
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
        status_last_changed_at
      )
      VALUES (
        ${id},
        ${now},
        ${now},
        ${input.piName},
        ${input.piEmail},
        ${input.piPhone ?? null},
        ${input.institution},
        ${input.country},
        ${input.projectTitle},
        ${input.dataUseProposal},
        ${input.plannedStart ?? null},
        ${input.plannedEnd ?? null},
        ${input.expectedDurationCategory ?? null},
        'SUBMITTED',
        ${now}
      )
    `;

    for (const d of input.datasets) {
      await tx`
        INSERT INTO dar_requested_datasets (
          id, request_id, dataset_slug, level
        )
        VALUES (
          ${randomUUID()},
          ${id},
          ${d.datasetSlug},
          ${d.level}
        )
      `;
    }

    for (const c of input.collaborators) {
      await tx`
        INSERT INTO dar_collaborators (
          id, request_id, name, email, institution
        )
        VALUES (
          ${randomUUID()},
          ${id},
          ${c.name},
          ${c.email},
          ${c.institution ?? null}
        )
      `;
    }
  });

  const { rows } = await sql`SELECT * FROM dar_requests WHERE id = ${id}`;
  return toDarRequestRow(rows[0]);
}

export async function listDarRequests(): Promise<DarRequest[]> {
  const { rows } = await sql`
    SELECT * FROM dar_requests
    ORDER BY created_at DESC
  `;
  return rows.map(toDarRequestRow);
}

export async function getDarRequestWithRelations(id: string): Promise<DarRequest | null> {
  const reqRes = await sql`SELECT * FROM dar_requests WHERE id = ${id}`;
  if (reqRes.rowCount === 0) return null;
  const request = toDarRequestRow(reqRes.rows[0]);

  const datasetsRes = await sql`
    SELECT * FROM dar_requested_datasets
    WHERE request_id = ${id}
    ORDER BY dataset_slug, level
  `;
  const collaboratorsRes = await sql`
    SELECT * FROM dar_collaborators
    WHERE request_id = ${id}
    ORDER BY name
  `;

  const requestedDatasets: DarRequestedDataset[] = datasetsRes.rows.map((row) => ({
    id: row.id,
    requestId: row.request_id,
    datasetSlug: row.dataset_slug,
    level: row.level,
  }));

  const collaborators: DarCollaborator[] = collaboratorsRes.rows.map((row) => ({
    id: row.id,
    requestId: row.request_id,
    name: row.name,
    email: row.email,
    institution: row.institution,
  }));

  return { ...request, requestedDatasets, collaborators };
}

export async function updateDarRequest(
  id: string,
  patch: Partial<{
    piName: string;
    piEmail: string;
    piPhone?: string;
    institution: string;
    country: string;
    projectTitle: string;
    dataUseProposal: string;
    plannedStart?: string | null;
    plannedEnd?: string | null;
    expectedDurationCategory?: string | null;
    status: DarRequestStatus;
    deniedReason?: string | null;
  }>,
  updatedBy: string,
): Promise<DarRequest | null> {
  const now = new Date().toISOString();

  // Build dynamic update
  const fields: string[] = [];
  const values: any[] = [];

  function add(field: string, value: any) {
    fields.push(`${field} = $${fields.length + 1}`);
    values.push(value);
  }

  if (patch.piName !== undefined) add('pi_name', patch.piName);
  if (patch.piEmail !== undefined) add('pi_email', patch.piEmail);
  if (patch.piPhone !== undefined) add('pi_phone', patch.piPhone ?? null);
  if (patch.institution !== undefined) add('institution', patch.institution);
  if (patch.country !== undefined) add('country', patch.country);
  if (patch.projectTitle !== undefined) add('project_title', patch.projectTitle);
  if (patch.dataUseProposal !== undefined) add('data_use_proposal', patch.dataUseProposal);
  if (patch.plannedStart !== undefined) add('planned_start', patch.plannedStart ?? null);
  if (patch.plannedEnd !== undefined) add('planned_end', patch.plannedEnd ?? null);
  if (patch.expectedDurationCategory !== undefined)
    add('expected_duration_category', patch.expectedDurationCategory ?? null);
  if (patch.status !== undefined) {
    add('status', patch.status);
    add('status_last_changed_at', now);
  }
  if (patch.deniedReason !== undefined) add('denied_reason', patch.deniedReason ?? null);

  add('updated_at', now);
  add('last_updated_by', updatedBy);

  if (fields.length === 0) {
    return getDarRequestWithRelations(id);
  }

  const query = `
    UPDATE dar_requests
    SET ${fields.join(', ')}
    WHERE id = $${fields.length + 1}
  `;
  values.push(id);

  // @ts-ignore – using raw sql string; this is fine for this helper
  await sql.unsafe(query, values);

  return getDarRequestWithRelations(id);
}

export function generateApiKey(): { apiKey: string; apiKeyHash: string } {
  const raw = `dar_${randomBytes(24).toString('hex')}`;
  const hash = createHash('sha256').update(raw).digest('hex');
  return { apiKey: raw, apiKeyHash: hash };
}

export async function approveDarRequest(
  id: string,
  approvedBy: string,
): Promise<{ request: DarRequest | null; apiKey?: string }> {
  const now = new Date().toISOString();
  const { apiKey, apiKeyHash } = generateApiKey();

  await sql`
    UPDATE dar_requests
    SET
      status = 'APPROVED',
      status_last_changed_at = ${now},
      approved_at = ${now},
      approved_by = ${approvedBy},
      api_key_hash = ${apiKeyHash},
      api_key_issued_at = ${now},
      updated_at = ${now},
      last_updated_by = ${approvedBy}
    WHERE id = ${id}
  `;

  const request = await getDarRequestWithRelations(id);
  return { request, apiKey };
}

export async function denyDarRequest(
  id: string,
  deniedBy: string,
  deniedReason: string,
): Promise<DarRequest | null> {
  const now = new Date().toISOString();
  await sql`
    UPDATE dar_requests
    SET
      status = 'DENIED',
      status_last_changed_at = ${now},
      denied_at = ${now},
      denied_by = ${deniedBy},
      denied_reason = ${deniedReason},
      updated_at = ${now},
      last_updated_by = ${deniedBy}
    WHERE id = ${id}
  `;
  return getDarRequestWithRelations(id);
}

export async function revokeDarRequest(
  id: string,
  revokedBy: string,
): Promise<DarRequest | null> {
  const now = new Date().toISOString();
  await sql`
    UPDATE dar_requests
    SET
      status = 'REVOKED',
      status_last_changed_at = ${now},
      revoked_at = ${now},
      revoked_by = ${revokedBy},
      updated_at = ${now},
      last_updated_by = ${revokedBy}
    WHERE id = ${id}
  `;
  return getDarRequestWithRelations(id);
}

export async function getRequestFromApiKey(apiKey: string): Promise<DarRequest | null> {
  const hash = createHash('sha256').update(apiKey).digest('hex');
  const { rows } = await sql`
    SELECT * FROM dar_requests
    WHERE api_key_hash = ${hash}
  `;
  if (!rows.length) return null;
  return toDarRequestRow(rows[0]);
}
