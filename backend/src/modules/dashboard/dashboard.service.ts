import { CellCulture, ContaminationLog, CultureSchedule, Experiment, Incubator, IncubatorReading, MediaBatch, plain } from '../../db/models';

export class DashboardError extends Error { statusCode: number; constructor(message: string, statusCode: number) { super(message); this.name = 'DashboardError'; this.statusCode = statusCode; } }
export interface RecentIncubatorReading { id: number; incubator_id: number; incubator_name: string; temperature_c: string; co2_percent: string; humidity_percent: string | null; recorded_at: string; }
export interface UpcomingCultureSchedule { id: number; cell_culture_id: number; culture_name: string; task_type: string; scheduled_date: string; status: string; }
export interface ExpiringMediaBatch { id: number; media_name: string; expiry_date: string; volume_remaining_ml: string; }
export interface ActiveExperimentSummary { id: number; title: string; cell_culture_id: number; culture_name: string; start_date: string; status: string; }
export interface RecentContaminationLog { id: number; cell_culture_id: number; culture_name: string; description: string; detected_at: string; }
export interface DashboardSummary {
  generatedAt: string;
  cellCultures: { active: number; contaminated: number; discontinued: number; total: number };
  incubators: { total: number; operational: number; maintenance: number; outOfOrder: number };
  pendingSchedules: number; openContaminations: number; ongoingExperiments: number; mediaExpiringSoonCount: number;
  recentIncubatorReadings: RecentIncubatorReading[]; upcomingCultureSchedules: UpcomingCultureSchedule[]; mediaExpiringSoon: ExpiringMediaBatch[];
  activeExperiments: ActiveExperimentSummary[]; recentOpenContaminations: RecentContaminationLog[];
}

export async function getDashboard(): Promise<DashboardSummary> {
  try {
    const soon = new Date(); soon.setDate(soon.getDate() + 7);
    const soonDate = soon.toISOString().slice(0, 10);
    const [cultures, incubators, pendingSchedules, openContaminations, ongoingExperiments, expiringCount, readings, schedules, media, experiments, logs] = await Promise.all([
      Promise.all(['active', 'contaminated', 'discontinued'].map((status) => CellCulture.countDocuments({ status }))),
      Promise.all(['operational', 'maintenance', 'out_of_order'].map((status) => Incubator.countDocuments({ status }))),
      CultureSchedule.countDocuments({ status: 'pending' }), ContaminationLog.countDocuments({ status: 'open' }), Experiment.countDocuments({ status: 'ongoing' }),
      MediaBatch.countDocuments({ expiry_date: { $ne: null, $lte: soonDate } }),
      IncubatorReading.find().sort({ recorded_at: -1 }).limit(10).lean(),
      CultureSchedule.find({ status: 'pending' }).sort({ scheduled_date: 1 }).limit(10).lean(),
      MediaBatch.find({ expiry_date: { $ne: null, $lte: soonDate } }).sort({ expiry_date: 1 }).limit(10).lean(),
      Experiment.find({ status: 'ongoing' }).sort({ start_date: -1 }).limit(10).lean(),
      ContaminationLog.find({ status: 'open' }).sort({ detected_at: -1 }).limit(5).lean(),
    ]);
    const cultureIds = [...new Set([...schedules, ...experiments, ...logs].map((x: any) => x.cell_culture_id))];
    const incubatorIds = [...new Set(readings.map((x: any) => x.incubator_id))];
    const [cultureDocs, incubatorDocs] = await Promise.all([
      CellCulture.find({ id: { $in: cultureIds } }).select({ id: 1, culture_name: 1 }).lean(),
      Incubator.find({ id: { $in: incubatorIds } }).select({ id: 1, name: 1 }).lean(),
    ]);
    const cultureNames = new Map(cultureDocs.map((x: any) => [x.id, x.culture_name]));
    const incubatorNames = new Map(incubatorDocs.map((x: any) => [x.id, x.name]));
    return {
      generatedAt: new Date().toISOString(),
      cellCultures: { active: cultures[0], contaminated: cultures[1], discontinued: cultures[2], total: cultures.reduce((a, b) => a + b, 0) },
      incubators: { total: incubators.reduce((a, b) => a + b, 0), operational: incubators[0], maintenance: incubators[1], outOfOrder: incubators[2] },
      pendingSchedules, openContaminations, ongoingExperiments, mediaExpiringSoonCount: expiringCount,
      recentIncubatorReadings: readings.map((x: any) => { const d = plain<any>(x); return { id: d.id, incubator_id: d.incubator_id, incubator_name: incubatorNames.get(d.incubator_id) ?? 'Unknown incubator', temperature_c: String(d.temperature_c), co2_percent: String(d.co2_percent), humidity_percent: d.humidity_percent == null ? null : String(d.humidity_percent), recorded_at: d.recorded_at }; }),
      upcomingCultureSchedules: schedules.map((x: any) => ({ id: x.id, cell_culture_id: x.cell_culture_id, culture_name: cultureNames.get(x.cell_culture_id) ?? 'Unknown culture', task_type: x.task_type, scheduled_date: x.scheduled_date, status: x.status })),
      mediaExpiringSoon: media.map((x: any) => ({ id: x.id, media_name: x.media_name, expiry_date: x.expiry_date, volume_remaining_ml: String(x.volume_remaining_ml) })),
      activeExperiments: experiments.map((x: any) => ({ id: x.id, title: x.title, cell_culture_id: x.cell_culture_id, culture_name: cultureNames.get(x.cell_culture_id) ?? 'Unknown culture', start_date: x.start_date, status: x.status })),
      recentOpenContaminations: logs.map((x: any) => ({ id: x.id, cell_culture_id: x.cell_culture_id, culture_name: cultureNames.get(x.cell_culture_id) ?? 'Unknown culture', description: x.description, detected_at: x.detected_at })),
    };
  } catch (err) {
    console.error('Unexpected dashboard MongoDB error:', err);
    throw new DashboardError('An unexpected database error occurred', 500);
  }
}
