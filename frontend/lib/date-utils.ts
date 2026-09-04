const EN_US_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
}

const EN_US_DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  ...EN_US_DATE_OPTIONS,
  hour: '2-digit',
  minute: '2-digit',
}

export function formatLocalDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString()
}

export function formatEnUsDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', EN_US_DATE_OPTIONS)
}

export function formatEnUsDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', EN_US_DATE_TIME_OPTIONS)
}
