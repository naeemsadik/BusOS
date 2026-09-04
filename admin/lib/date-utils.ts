export function formatLocalDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString()
}
