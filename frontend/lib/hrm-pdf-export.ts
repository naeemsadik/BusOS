import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { AttendanceRecord, PayrollRun } from './hrm-service'

export function exportAttendancePdf(records: AttendanceRecord[]) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text('Attendance report', 14, 18)
  autoTable(doc, {
    startY: 24,
    head: [['Date', 'Code', 'Employee', 'Status', 'Worked', 'Late']],
    body: records.map((record) => [
      record.workDate,
      record.employee.employeeCode,
      `${record.employee.firstName} ${record.employee.lastName}`,
      record.status.replaceAll('_', ' '),
      `${record.workedMinutes} min`,
      `${record.lateMinutes} min`,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [214, 82, 60] },
  })
  doc.save(`attendance-${new Date().toISOString().slice(0, 10)}.pdf`)
}

export function exportPayrollPdf(run: PayrollRun) {
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(16)
  doc.text(`Payroll ${run.year}-${String(run.month).padStart(2, '0')}`, 14, 18)
  doc.setFontSize(10)
  doc.text(`Status: ${run.status} | Currency: ${run.currencyCode}`, 14, 25)
  autoTable(doc, {
    startY: 31,
    head: [['Code', 'Employee', 'Type', 'Base', 'Additions', 'Deductions', 'Net', 'Unresolved']],
    body: (run.items || []).map((item) => [
      item.employeeCode, item.employeeName, item.payType,
      Number(item.baseEarnings).toFixed(2), Number(item.additionsTotal).toFixed(2),
      Number(item.deductionsTotal).toFixed(2), Number(item.netPay).toFixed(2), item.unresolvedDays,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [214, 82, 60] },
  })
  doc.save(`payroll-${run.year}-${String(run.month).padStart(2, '0')}.pdf`)
}
