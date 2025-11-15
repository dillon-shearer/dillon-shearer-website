// types/data-access-portal.ts

export type DarRequestStatus =
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'DENIED';

export type DarVisualizationPreset =
  | 'split-all-time'
  | 'volume-all-time'
  | 'rep-all-time'
  | 'training-days-all-time';

export type DarDeliveryType = 'L1_VISUAL' | 'L2_PACKAGE';

export type DarVisualizationPlan = {
  chartType: 'line' | 'bar' | 'table';
  measure: string;
  breakdown: string;
  filters: string;
  refreshCadence: string;
  suppressionThreshold: number;
};

export type DarPackagePlan = {
  columns: string[];
  filters: string;
  sensitivityTags: string[];
  format: 'csv' | 'parquet';
  expectedSize?: string | null;
};

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

  deliveryTypes?: DarDeliveryType[];
  visualizationPlan?: DarVisualizationPlan | null;
  packagePlan?: DarPackagePlan | null;
  visualizationPresets?: DarVisualizationPreset[];
  visualizationCustomRequest?: string | null;
  visualizationPalette?: string[];
  customDeliveryStatus?: 'pending' | 'fulfilled' | 'rejected' | null;
  customDeliveryNote?: string | null;

  requestedDatasets?: DarRequestedDataset[];
  collaborators?: DarCollaborator[];
  statusEvents?: DarStatusEvent[];
}

export interface DarStatusEvent {
  id: string;
  requestId: string;
  status: string;
  description?: string | null;
  metadata?: string | null;
  createdAt: string;
}
