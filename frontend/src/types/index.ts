// These types mirror the backend's actual response shapes exactly (see
// backend/src/modules/**/*.service.ts). Numeric Postgres columns (NUMERIC
// type) come back from node-postgres as strings, not numbers, so fields
// like temperature/volume/etc. are typed as `string` here to match.

export type UserRole = 'admin' | 'researcher';

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

// ---- Incubator Monitoring ----

export type IncubatorStatus = 'operational' | 'maintenance' | 'out_of_order';

export interface Incubator {
  id: number;
  name: string;
  target_temperature_c: string;
  target_co2_percent: string;
  target_humidity_percent: string | null;
  status: IncubatorStatus;
  created_at: string;
}

export interface IncubatorReading {
  id: number;
  incubator_id: number;
  temperature_c: string;
  co2_percent: string;
  humidity_percent: string | null;
  recorded_by: number | null;
  recorded_at: string;
}

// ---- Media Preparation ----

export interface MediaBatch {
  id: number;
  media_name: string;
  prepared_by: number | null;
  prepared_date: string;
  volume_prepared_ml: string;
  volume_remaining_ml: string;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
}

// ---- Cell Culture Management ----

export type CultureStatus = 'active' | 'contaminated' | 'discontinued';

export interface CellCulture {
  id: number;
  culture_name: string;
  cell_line: string;
  incubator_id: number | null;
  current_passage_number: number;
  status: CultureStatus;
  started_by: number | null;
  started_at: string;
}

export interface PassageRecord {
  id: number;
  cell_culture_id: number;
  passage_number: number;
  passage_date: string;
  confluency_percent: string | null;
  notes: string | null;
  performed_by: number | null;
}

// ---- Culture Scheduling ----

export type TaskType = 'feed' | 'passage' | 'media_change' | 'check' | 'other';
export type ScheduleStatus = 'pending' | 'completed' | 'missed';

export interface CultureSchedule {
  id: number;
  cell_culture_id: number;
  task_type: TaskType;
  scheduled_date: string;
  assigned_to: number | null;
  status: ScheduleStatus;
  notes: string | null;
  created_at: string;
}

// ---- Contamination Logs ----

export type ContaminationStatus = 'open' | 'resolved';

export interface ContaminationLog {
  id: number;
  cell_culture_id: number;
  reported_by: number | null;
  description: string;
  detected_at: string;
  resolution_notes: string | null;
  status: ContaminationStatus;
}

// ---- Experiment Tracking ----

export type ExperimentStatus = 'ongoing' | 'completed' | 'aborted';

export interface Experiment {
  id: number;
  title: string;
  objective: string | null;
  cell_culture_id: number;
  start_date: string;
  end_date: string | null;
  status: ExperimentStatus;
  created_by: number | null;
  created_at: string;
}

export interface ExperimentDetail extends Experiment {
  observation_count: number;
}

// ---- Experiment Observations ----

export interface ExperimentObservation {
  id: number;
  experiment_id: number;
  observation_date: string;
  description: string;
  measurement_value: string | null;
  measurement_unit: string | null;
  recorded_by: number | null;
}

// ---- Dashboard ----

export interface RecentIncubatorReading {
  id: number;
  incubator_id: number;
  incubator_name: string;
  temperature_c: string;
  co2_percent: string;
  humidity_percent: string | null;
  recorded_at: string;
}

export interface UpcomingCultureSchedule {
  id: number;
  cell_culture_id: number;
  culture_name: string;
  task_type: string;
  scheduled_date: string;
  status: string;
}

export interface ExpiringMediaBatch {
  id: number;
  media_name: string;
  expiry_date: string;
  volume_remaining_ml: string;
}

export interface ActiveExperimentSummary {
  id: number;
  title: string;
  cell_culture_id: number;
  culture_name: string;
  start_date: string;
  status: string;
}

export interface RecentContaminationLog {
  id: number;
  cell_culture_id: number;
  culture_name: string;
  description: string;
  detected_at: string;
}

export interface DashboardSummary {
  generatedAt: string;
  cellCultures: {
    active: number;
    contaminated: number;
    discontinued: number;
    total: number;
  };
  incubators: {
    total: number;
    operational: number;
    maintenance: number;
    outOfOrder: number;
  };
  pendingSchedules: number;
  openContaminations: number;
  ongoingExperiments: number;
  mediaExpiringSoonCount: number;
  recentIncubatorReadings: RecentIncubatorReading[];
  upcomingCultureSchedules: UpcomingCultureSchedule[];
  mediaExpiringSoon: ExpiringMediaBatch[];
  activeExperiments: ActiveExperimentSummary[];
  recentOpenContaminations: RecentContaminationLog[];
}
