// types/data-access-portal.ts

export type DarRequestStatus =
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'DENIED';

export type ExpectedDurationCategory = '<6m' | '6-12m' | '>12m';

export type GymDatasetSlug =
  | 'workout_sessions'
  | 'set_metrics'
  | 'body_metrics'
  | 'aggregates';

export interface DarRequestedDataset {
  id: string;
  requestId: string;
  datasetSlug: GymDatasetSlug | string;
  level?: number | null;
  createdAt?: string;
}

export interface DarCollaborator {
  id: string;
  requestId: string;
  name: string;
  email: string;
  phone?: string | null;
  createdAt?: string;
}

export interface DarRequest {
  id: string;
  createdAt: string;
  updatedAt: string;

  piName: string;
  piEmail: string;
  piPhone?: string | null;

  institution: string;
  country: string;

  projectTitle?: string | null;
  dataUseProposal: string;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  expectedDurationCategory?: ExpectedDurationCategory | null;

  status: DarRequestStatus;
  statusLastChangedAt: string;
  lastUpdatedBy?: string | null;

  approvedAt?: string | null;
  approvedBy?: string | null;
  deniedAt?: string | null;
  deniedBy?: string | null;
  deniedReason?: string | null;
  revokedAt?: string | null;
  revokedBy?: string | null;

  apiKeyIssuedAt?: string | null;
  apiKey?: string | null;

  requestedDatasets?: DarRequestedDataset[];
  collaborators?: DarCollaborator[];
}
