import mongoose, { Model, Schema } from 'mongoose';

export interface LabDocument {
  id: number;
  [key: string]: any;
}

function model(name: string, collection: string, fields: Record<string, unknown> = {}): Model<LabDocument> {
  const schema = new Schema<LabDocument>(
    { id: { type: Number, required: true, unique: true, index: true }, ...fields },
    { collection, versionKey: false, strict: false },
  );
  return (mongoose.models[name] as Model<LabDocument> | undefined) ||
    mongoose.model<LabDocument>(name, schema);
}

export const User = model('User', 'users', {
  full_name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password_hash: { type: String, required: true, select: false },
  role: { type: String, default: 'researcher' },
  created_at: { type: String, required: true },
});

export const Incubator = model('Incubator', 'incubators', {
  name: { type: String, required: true },
  target_temperature_c: { type: Number, default: 37 },
  target_co2_percent: { type: Number, default: 5 },
  target_humidity_percent: { type: Number, default: null },
  status: { type: String, default: 'operational', index: true },
  created_at: { type: String, required: true },
});

export const IncubatorReading = model('IncubatorReading', 'incubator_readings', {
  incubator_id: { type: Number, required: true, index: true },
  temperature_c: { type: Number, required: true },
  co2_percent: { type: Number, required: true },
  humidity_percent: { type: Number, default: null },
  recorded_by: { type: Number, default: null },
  recorded_at: { type: String, required: true, index: true },
});

export const MediaBatch = model('MediaBatch', 'media_batches', {
  media_name: { type: String, required: true },
  prepared_by: { type: Number, default: null },
  prepared_date: { type: String, required: true },
  volume_prepared_ml: { type: Number, required: true },
  volume_remaining_ml: { type: Number, required: true },
  expiry_date: { type: String, default: null, index: true },
  notes: { type: String, default: null },
  created_at: { type: String, required: true, index: true },
});

export const CellCulture = model('CellCulture', 'cell_cultures', {
  culture_name: { type: String, required: true },
  cell_line: { type: String, required: true },
  incubator_id: { type: Number, default: null, index: true },
  current_passage_number: { type: Number, default: 0 },
  status: { type: String, default: 'active', index: true },
  started_by: { type: Number, default: null },
  started_at: { type: String, required: true, index: true },
  passages: { type: [Schema.Types.Mixed], default: [] },
});

export const CultureSchedule = model('CultureSchedule', 'culture_schedules', {
  cell_culture_id: { type: Number, required: true, index: true },
  task_type: { type: String, required: true },
  scheduled_date: { type: String, required: true, index: true },
  assigned_to: { type: Number, default: null },
  status: { type: String, default: 'pending', index: true },
  notes: { type: String, default: null },
  created_at: { type: String, required: true },
});

export const ContaminationLog = model('ContaminationLog', 'contamination_logs', {
  cell_culture_id: { type: Number, required: true, index: true },
  reported_by: { type: Number, default: null },
  description: { type: String, required: true },
  detected_at: { type: String, required: true, index: true },
  resolution_notes: { type: String, default: null },
  status: { type: String, default: 'open', index: true },
});

export const Experiment = model('Experiment', 'experiments', {
  title: { type: String, required: true },
  objective: { type: String, default: null },
  cell_culture_id: { type: Number, required: true, index: true },
  start_date: { type: String, required: true, index: true },
  end_date: { type: String, default: null },
  status: { type: String, default: 'ongoing', index: true },
  created_by: { type: Number, default: null },
  created_at: { type: String, required: true },
  observations: { type: [Schema.Types.Mixed], default: [] },
});

export function plain<T extends Record<string, any>>(doc: any): T {
  if (!doc) return doc;
  const value = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const { _id, __v, ...result } = value;
  return result as T;
}
