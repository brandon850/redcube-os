import { format, isToday, isYesterday } from 'date-fns'

/** "Today 2:30 PM" / "Yesterday 9:14 AM" / "Apr 3, 2:30 PM" — for activity timestamps. */
export function activityTimestamp(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const time = format(d, 'h:mm a')
  if (isToday(d)) return `Today ${time}`
  if (isYesterday(d)) return `Yesterday ${time}`
  return `${format(d, 'MMM d')}, ${time}`
}
