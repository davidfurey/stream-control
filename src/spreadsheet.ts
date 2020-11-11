import { tz } from 'moment-timezone';

export function dateFromSerial(serialNum: number): Date {
  const millis = Math.round((serialNum - 25569) * 86400 * 1000)
  const offset = tz.zone('Europe/London')?.utcOffset(millis) || 0;
  return new Date(millis + offset * 60 * 1000)
}

export function serialFromDate(date: Date): number {
  const offset = tz.zone('Europe/London')?.utcOffset(date.getTime()) || 0;
  return (date.getTime() / 1000 - offset * 60) / 86400 + 25569
}