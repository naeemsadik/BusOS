export function getOrderStatusPdfColor(status: string): [number, number, number] {
  const statusColorMap: Record<string, [number, number, number]> = {
    pending: [245, 158, 11],
    confirmed: [59, 130, 246],
    processing: [59, 130, 246],
    shipped: [139, 69, 19],
    delivered: [34, 197, 94],
    cancelled: [239, 68, 68],
    returned: [239, 68, 68],
  }

  return statusColorMap[status] || [107, 114, 128]
}
