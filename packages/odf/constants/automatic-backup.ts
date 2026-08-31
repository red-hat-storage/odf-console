export enum CronTime {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export const CRON_MAP: Record<CronTime, string> = {
  [CronTime.DAILY]: '0 0 * * *', // Every day at 12:00 AM
  [CronTime.WEEKLY]: '0 0 * * 6', // Every Saturday at 12:00 AM
  [CronTime.MONTHLY]: '0 0 1-7 * 6', // First Saturday of each month at 12:00 AM
};

export const getCronTimeFromSchedule = (schedule: string): CronTime => {
  const entry = Object.entries(CRON_MAP).find(
    ([, value]) => value === schedule
  );
  return entry ? (entry[0] as CronTime) : CronTime.DAILY;
};
