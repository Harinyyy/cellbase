import { Experiment as ExperimentModel, plain } from '../../db/models';
import { nextId } from '../../db/db';
import { getExperimentById } from './experiments.service';

export interface ExperimentObservation { id: number; experiment_id: number; observation_date: string; description: string; measurement_value: string | null; measurement_unit: string | null; recorded_by: number | null; }
export class ObservationError extends Error { statusCode: number; constructor(message: string, statusCode: number) { super(message); this.name = 'ObservationError'; this.statusCode = statusCode; } }
export interface CreateObservationInput { description?: string; measurement_value?: number | null; measurement_unit?: string | null; }
export interface UpdateObservationInput extends CreateObservationInput {}
function shape(o: any, experimentId: number): ExperimentObservation { return { ...o, experiment_id: experimentId, measurement_value: o.measurement_value == null ? null : String(o.measurement_value) }; }
function validate(i: CreateObservationInput, update = false): void {
  if ((!update && !i.description?.trim()) || (update && i.description !== undefined && !i.description.trim())) throw new ObservationError(update ? 'description cannot be empty' : 'description is required', 400);
  if (i.measurement_value != null && (typeof i.measurement_value !== 'number' || !Number.isFinite(i.measurement_value))) throw new ObservationError('measurement_value must be a number', 400);
  if (i.measurement_unit != null && typeof i.measurement_unit !== 'string') throw new ObservationError('measurement_unit must be a string', 400);
}
async function locate(id: number): Promise<{ experiment: any; observation: any } | null> {
  const experiment = await ExperimentModel.findOne({ 'observations.id': id }).lean();
  if (!experiment) return null;
  return { experiment, observation: (experiment.observations ?? []).find((o: any) => o.id === id) };
}
export async function createObservation(experimentId: number, input: CreateObservationInput, recordedBy: number | null): Promise<ExperimentObservation> {
  validate(input);
  if (!await getExperimentById(experimentId)) throw new ObservationError('Experiment not found', 404);
  const observation = { id: await nextId('experiment_observations'), observation_date: new Date().toISOString(), description: input.description!.trim(), measurement_value: input.measurement_value ?? null, measurement_unit: input.measurement_unit ?? null, recorded_by: recordedBy };
  const result = await ExperimentModel.updateOne({ id: experimentId }, { $push: { observations: observation } });
  if (!result.matchedCount) throw new ObservationError('Experiment not found', 404);
  return shape(observation, experimentId);
}
export async function listObservations(experimentId: number): Promise<ExperimentObservation[]> {
  const experiment = await ExperimentModel.findOne({ id: experimentId }).lean();
  if (!experiment) throw new ObservationError('Experiment not found', 404);
  return (experiment.observations ?? []).slice().sort((a: any, b: any) => b.observation_date.localeCompare(a.observation_date)).map((o: any) => shape(plain(o), experimentId));
}
export async function getObservationById(id: number): Promise<ExperimentObservation | null> { const found = await locate(id); return found ? shape(found.observation, found.experiment.id) : null; }
export async function updateObservation(id: number, input: UpdateObservationInput): Promise<ExperimentObservation> {
  validate(input, true);
  if (input.description === undefined && input.measurement_value === undefined && input.measurement_unit === undefined) throw new ObservationError('No valid fields provided to update', 400);
  const found = await locate(id);
  if (!found) throw new ObservationError('Observation not found', 404);
  const set: Record<string, unknown> = {};
  if (input.description !== undefined) set['observations.$.description'] = input.description.trim();
  if (input.measurement_value !== undefined) set['observations.$.measurement_value'] = input.measurement_value;
  if (input.measurement_unit !== undefined) set['observations.$.measurement_unit'] = input.measurement_unit;
  const updated = await ExperimentModel.findOneAndUpdate({ id: found.experiment.id, 'observations.id': id }, { $set: set }, { new: true }).lean();
  const observation = updated?.observations?.find((o: any) => o.id === id);
  if (!updated || !observation) throw new ObservationError('Observation not found', 404);
  return shape(observation, found.experiment.id);
}
export async function deleteObservation(id: number): Promise<void> {
  const found = await locate(id);
  if (!found) throw new ObservationError('Observation not found', 404);
  await ExperimentModel.updateOne({ id: found.experiment.id }, { $pull: { observations: { id } } });
}
