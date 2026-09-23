"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
  Banknote, BriefcaseBusiness, CalendarDays, CheckCircle2, Clock3, Download,
  FileDown, MoreHorizontal, Pencil, Plus, Search, Settings2, UserRoundCheck, UsersRound,
} from "lucide-react"
import PermissionGuardPage from "@/components/permission-guard-page"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { DataState, MetricCard, PageHeader, PageSkeleton, PageToolbar, StatusBadge } from "@/components/ui/page-primitives"
import { useAuth } from "@/contexts/auth-context"
import { useCurrency } from "@/contexts/currency-context"
import { PermissionModuleType, UserRole } from "@/lib/types"
import {
  type AttendanceRecord, type AttendanceStatus, type Employee, type HrmSettings,
  type PayrollAdjustment, type PayrollItem, type PayrollRun, hrmService,
} from "@/lib/hrm-service"
import { exportAttendancePdf, exportPayrollPdf } from "@/lib/hrm-pdf-export"

const today = () => new Date().toISOString().slice(0, 10)
const currentMonth = () => new Date().toISOString().slice(0, 7)
const monthBounds = (value: string) => {
  const [year, month] = value.split("-").map(Number)
  return { startDate: `${value}-01`, endDate: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10) }
}

export function HrmPage() {
  return <PermissionGuardPage module={PermissionModuleType.HRM}><HrmWorkspace /></PermissionGuardPage>
}

function HrmWorkspace() {
  const t = useTranslations("hrm")
  const { user } = useAuth()
  const { formatCurrency } = useCurrency()
  const queryClient = useQueryClient()
  const isOwner = user?.role === UserRole.OWNER
  const [search, setSearch] = useState("")
  const [month, setMonth] = useState(currentMonth())
  const [employeeOpen, setEmployeeOpen] = useState(false)
  const [attendanceOpen, setAttendanceOpen] = useState(false)
  const [salaryEmployee, setSalaryEmployee] = useState<Employee | null>(null)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [adjustItem, setAdjustItem] = useState<PayrollItem | null>(null)
  const bounds = useMemo(() => monthBounds(month), [month])

  const overview = useQuery({ queryKey: ["hrm", "overview"], queryFn: hrmService.getOverview })
  const employees = useQuery({
    queryKey: ["hrm", "employees", search],
    queryFn: () => hrmService.getEmployees({ search: search || undefined, limit: 100 }),
  })
  const attendance = useQuery({
    queryKey: ["hrm", "attendance", bounds],
    queryFn: () => hrmService.getAttendance({ ...bounds, limit: 100 }),
  })
  const payroll = useQuery({
    queryKey: ["hrm", "payroll"], queryFn: () => hrmService.getPayrollRuns({ limit: 100 }), enabled: isOwner,
  })
  const settings = useQuery({ queryKey: ["hrm", "settings"], queryFn: hrmService.getSettings, enabled: isOwner })
  const departments = useQuery({ queryKey: ["hrm", "departments"], queryFn: hrmService.getDepartments })
  const designations = useQuery({ queryKey: ["hrm", "designations"], queryFn: hrmService.getDesignations })
  const holidays = useQuery({ queryKey: ["hrm", "holidays"], queryFn: hrmService.getHolidays })
  const selectedRun = useQuery({
    queryKey: ["hrm", "payroll", selectedRunId], queryFn: () => hrmService.getPayrollRun(selectedRunId!),
    enabled: !!selectedRunId && isOwner,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["hrm"] })
  const mutate = <T,>(fn: () => Promise<T>, success: string) => {
    return fn().then((value) => { toast.success(success); refresh(); return value }).catch((error) => {
      toast.error(error?.response?.data?.message || t("error")); throw error
    })
  }

  if (overview.isLoading || employees.isLoading) return <PageSkeleton />
  if (overview.isError || employees.isError) return <DataState kind="error" title={t("error")} description={t("description")} onAction={refresh} actionLabel="Retry" />

  const unresolved = selectedRun.data?.items?.reduce((sum, item) => sum + item.unresolvedDays, 0) || 0

  return (
    <div className="space-y-6 p-3 sm:p-4 lg:p-6">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")}
        actions={<Button onClick={() => setEmployeeOpen(true)}><Plus className="mr-2 size-4" />{t("addEmployee")}</Button>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t("activeEmployees")} value={overview.data?.activeEmployees || 0} icon={UsersRound} />
        <MetricCard label={t("attendanceToday")} value={overview.data?.todayAttendance || 0} icon={UserRoundCheck} tone="success" />
        <MetricCard label={t("draftPayroll")} value={overview.data?.currentDraftPayroll ? `${overview.data.currentDraftPayroll.year}-${String(overview.data.currentDraftPayroll.month).padStart(2, "0")}` : "—"} icon={Banknote} tone="accent" />
        <MetricCard label={t("unresolved")} value={unresolved} icon={Clock3} tone={unresolved ? "warning" : "success"} />
      </div>

      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1 sm:w-auto">
          <TabsTrigger value="employees">{t("employees")}</TabsTrigger>
          <TabsTrigger value="attendance">{t("attendance")}</TabsTrigger>
          {isOwner && <TabsTrigger value="payroll">{t("payroll")}</TabsTrigger>}
          {isOwner && <TabsTrigger value="settings">{t("settings")}</TabsTrigger>}
        </TabsList>

        <TabsContent value="employees" className="space-y-4">
          <PageToolbar>
            <div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("searchEmployees")} />
            </div>
            <p className="text-sm text-muted-foreground">{employees.data?.total || 0} {t("employees").toLowerCase()}</p>
          </PageToolbar>
          <Card><CardHeader><CardTitle>{t("employeeDirectory")}</CardTitle></CardHeader><CardContent className="p-0">
            {(employees.data?.employees.length || 0) === 0 ? <DataState kind="empty" title={t("noEmployees")} description={t("description")} /> :
              <div className="overflow-x-auto"><Table><TableHeader><TableRow>
                <TableHead>{t("code")}</TableHead><TableHead>{t("name")}</TableHead><TableHead>{t("department")}</TableHead>
                <TableHead>{t("joiningDate")}</TableHead><TableHead>{t("status")}</TableHead><TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow></TableHeader><TableBody>{employees.data?.employees.map((employee) => <TableRow key={employee.id}>
                <TableCell className="font-mono text-xs">{employee.employeeCode}</TableCell>
                <TableCell><p className="font-medium">{employee.firstName} {employee.lastName}</p><p className="text-xs text-muted-foreground">{employee.email || employee.phone || "—"}</p></TableCell>
                <TableCell>{employee.department?.name || "—"}<p className="text-xs text-muted-foreground">{employee.designation?.name}</p></TableCell>
                <TableCell>{employee.joiningDate}</TableCell>
                <TableCell><StatusBadge tone={employee.status === "active" ? "success" : employee.status === "terminated" ? "danger" : "neutral"}>{employee.status}</StatusBadge></TableCell>
                <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`${t("actions")} ${employee.firstName}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">{isOwner && <DropdownMenuItem onClick={() => setSalaryEmployee(employee)}><Banknote className="mr-2 size-4" />{t("payroll")}</DropdownMenuItem>}
                    <DropdownMenuItem onClick={() => mutate(() => hrmService.archiveEmployee(employee.id), "Employee archived")}><CheckCircle2 className="mr-2 size-4" />Archive</DropdownMenuItem>
                  </DropdownMenuContent></DropdownMenu></TableCell>
              </TableRow>)}</TableBody></Table></div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <PageToolbar><Input type="month" className="w-full sm:w-48" value={month} onChange={(event) => setMonth(event.target.value)} />
            <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => hrmService.exportAttendance(new URLSearchParams(bounds))}><Download className="mr-2 size-4" />CSV</Button>
              <Button variant="outline" onClick={() => exportAttendancePdf(attendance.data?.records || [])}><FileDown className="mr-2 size-4" />PDF</Button>
              <Button onClick={() => setAttendanceOpen(true)}><Plus className="mr-2 size-4" />{t("recordAttendance")}</Button></div>
          </PageToolbar>
          <Card><CardContent className="p-0">{(attendance.data?.records.length || 0) === 0 ? <DataState kind="empty" title={t("noAttendance")} description={t("description")} /> :
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>{t("date")}</TableHead><TableHead>{t("name")}</TableHead><TableHead>{t("status")}</TableHead><TableHead>{t("checkIn")}</TableHead><TableHead>{t("checkOut")}</TableHead><TableHead>{t("worked")}</TableHead><TableHead>{t("late")}</TableHead></TableRow></TableHeader>
              <TableBody>{attendance.data?.records.map((record) => <AttendanceRow key={record.id} record={record} />)}</TableBody></Table></div>}
          </CardContent></Card>
        </TabsContent>

        {isOwner && <TabsContent value="payroll" className="space-y-4">
          <PageToolbar><Input type="month" className="w-full sm:w-48" value={month} onChange={(event) => setMonth(event.target.value)} />
            <Button onClick={() => { const [year, payMonth] = month.split("-").map(Number); mutate(() => hrmService.generatePayroll(year, payMonth), "Payroll draft generated").then((run) => setSelectedRunId((run as PayrollRun).id)) }}>
              <Banknote className="mr-2 size-4" />{t("generatePayroll")}</Button></PageToolbar>
          <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
            <Card><CardHeader><CardTitle>{t("payrollRuns")}</CardTitle></CardHeader><CardContent className="space-y-2">
              {(payroll.data?.runs || []).map((run) => <button key={run.id} onClick={() => setSelectedRunId(run.id)} className="flex w-full items-center justify-between rounded-lg border p-3 text-left hover:bg-muted">
                <span><span className="block font-medium">{run.year}-{String(run.month).padStart(2, "0")}</span><span className="text-xs text-muted-foreground">{formatCurrency(Number(run.totalNetPay))}</span></span>
                <StatusBadge tone={run.status === "paid" ? "success" : run.status === "finalized" ? "info" : "warning"}>{run.status}</StatusBadge>
              </button>)}
              {!payroll.data?.runs.length && <p className="text-sm text-muted-foreground">{t("noPayroll")}</p>}
            </CardContent></Card>
            <PayrollDetails run={selectedRun.data} onAdjust={setAdjustItem} onChanged={refresh} />
          </div>
        </TabsContent>}

        {isOwner && <TabsContent value="settings"><SettingsPanel settings={settings.data} departments={departments.data || []} designations={designations.data || []} holidays={holidays.data || []} onChanged={refresh} /></TabsContent>}
      </Tabs>

      <EmployeeDialog open={employeeOpen} onOpenChange={setEmployeeOpen} departments={departments.data || []} designations={designations.data || []} onSaved={refresh} />
      <AttendanceDialog open={attendanceOpen} onOpenChange={setAttendanceOpen} employees={employees.data?.employees || []} onSaved={refresh} />
      {salaryEmployee && <SalaryDialog employee={salaryEmployee} open onOpenChange={(open: boolean) => !open && setSalaryEmployee(null)} onSaved={refresh} />}
      {adjustItem && selectedRunId && <AdjustmentDialog item={adjustItem} runId={selectedRunId} open onOpenChange={(open: boolean) => !open && setAdjustItem(null)} onSaved={refresh} />}
    </div>
  )
}

function AttendanceRow({ record }: { record: AttendanceRecord }) {
  const time = (value?: string) => value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"
  return <TableRow><TableCell>{record.workDate}</TableCell><TableCell className="font-medium">{record.employee.firstName} {record.employee.lastName}</TableCell>
    <TableCell><StatusBadge tone={record.status === "present" ? "success" : record.status === "absent" ? "danger" : "info"}>{record.status.replaceAll("_", " ")}</StatusBadge></TableCell>
    <TableCell>{time(record.checkInAt)}</TableCell><TableCell>{time(record.checkOutAt)}</TableCell><TableCell>{record.workedMinutes} min</TableCell><TableCell>{record.lateMinutes} min</TableCell></TableRow>
}

function EmployeeDialog({ open, onOpenChange, departments, designations, onSaved }: any) {
  const [draft, setDraft] = useState({ firstName: "", lastName: "", email: "", phone: "", joiningDate: today(), departmentId: "", designationId: "" })
  const save = useMutation({ mutationFn: () => hrmService.createEmployee({ ...draft, departmentId: draft.departmentId || undefined, designationId: draft.designationId || undefined }), onSuccess: () => { toast.success("Employee created"); onSaved(); onOpenChange(false) }, onError: (error: any) => toast.error(error?.response?.data?.message || "Employee could not be created") })
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Employee details</DialogTitle><DialogDescription>Create an HR profile. A login account can be linked later.</DialogDescription></DialogHeader>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="First name"><Input value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} /></Field><Field label="Last name"><Input value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} /></Field>
      <Field label="Email"><Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field><Field label="Phone"><Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
      <Field label="Joining date"><Input type="date" value={draft.joiningDate} onChange={(e) => setDraft({ ...draft, joiningDate: e.target.value })} /></Field>
      <Field label="Department"><Select value={draft.departmentId} onValueChange={(value) => setDraft({ ...draft, departmentId: value })}><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger><SelectContent>{departments.map((item: any) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Designation"><Select value={draft.designationId} onValueChange={(value) => setDraft({ ...draft, designationId: value })}><SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger><SelectContent>{designations.map((item: any) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
    </div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={!draft.firstName || !draft.lastName || save.isPending} onClick={() => save.mutate()}>Save employee</Button></DialogFooter>
  </DialogContent></Dialog>
}

function AttendanceDialog({ open, onOpenChange, employees, onSaved }: any) {
  const [draft, setDraft] = useState({ employeeId: "", workDate: today(), status: "present" as AttendanceStatus, checkInAt: "", checkOutAt: "", notes: "" })
  const save = useMutation({ mutationFn: () => hrmService.upsertAttendance({ ...draft, checkInAt: draft.checkInAt ? new Date(draft.checkInAt).toISOString() : undefined, checkOutAt: draft.checkOutAt ? new Date(draft.checkOutAt).toISOString() : undefined }), onSuccess: () => { toast.success("Attendance recorded"); onSaved(); onOpenChange(false) }, onError: (error: any) => toast.error(error?.response?.data?.message || "Attendance could not be recorded") })
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Record attendance</DialogTitle><DialogDescription>Manual entries override the daily employee record.</DialogDescription></DialogHeader><div className="space-y-4">
    <Field label="Employee"><Select value={draft.employeeId} onValueChange={(value) => setDraft({ ...draft, employeeId: value })}><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger><SelectContent>{employees.map((employee: Employee) => <SelectItem key={employee.id} value={employee.id}>{employee.employeeCode} · {employee.firstName} {employee.lastName}</SelectItem>)}</SelectContent></Select></Field>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Work date"><Input type="date" value={draft.workDate} onChange={(e) => setDraft({ ...draft, workDate: e.target.value })} /></Field><Field label="Status"><Select value={draft.status} onValueChange={(value: AttendanceStatus) => setDraft({ ...draft, status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["present", "absent", "paid_leave", "unpaid_leave", "holiday"].map((value) => <SelectItem key={value} value={value}>{value.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Check in"><Input type="datetime-local" value={draft.checkInAt} onChange={(e) => setDraft({ ...draft, checkInAt: e.target.value })} /></Field><Field label="Check out"><Input type="datetime-local" value={draft.checkOutAt} onChange={(e) => setDraft({ ...draft, checkOutAt: e.target.value })} /></Field></div>
    <Field label="Notes"><Textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={!draft.employeeId || save.isPending} onClick={() => save.mutate()}>Save attendance</Button></DialogFooter></DialogContent></Dialog>
}

function SalaryDialog({ employee, open, onOpenChange, onSaved }: any) {
  const [payType, setPayType] = useState<"monthly" | "daily">("monthly")
  const [baseRate, setBaseRate] = useState("")
  const [effectiveFrom, setEffectiveFrom] = useState(`${currentMonth()}-01`)
  const history = useQuery({ queryKey: ["hrm", "compensation", employee.id], queryFn: () => hrmService.getCompensations(employee.id) })
  const save = useMutation({ mutationFn: () => hrmService.createCompensation(employee.id, { payType, baseRate: Number(baseRate), effectiveFrom }), onSuccess: () => { toast.success("Salary revision saved"); history.refetch(); onSaved() }, onError: (error: any) => toast.error(error?.response?.data?.message || "Salary could not be saved") })
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{employee.firstName} {employee.lastName}</DialogTitle><DialogDescription>Salary history is owner-only and effective dated.</DialogDescription></DialogHeader>
    <div className="grid gap-4 sm:grid-cols-3"><Field label="Pay type"><Select value={payType} onValueChange={(value: "monthly" | "daily") => setPayType(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="daily">Daily</SelectItem></SelectContent></Select></Field><Field label="Base rate"><Input type="number" min="0" step="0.01" value={baseRate} onChange={(e) => setBaseRate(e.target.value)} /></Field><Field label="Effective from"><Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} /></Field></div>
    <div className="max-h-52 overflow-auto rounded-lg border">{history.data?.map((item) => <div key={item.id} className="flex items-center justify-between border-b p-3 last:border-0"><span className="text-sm">{item.effectiveFrom} – {item.effectiveTo || "current"}</span><span className="font-medium">{item.currencyCode} {Number(item.baseRate).toFixed(2)} / {item.payType}</span></div>)}</div>
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button><Button disabled={!baseRate || save.isPending} onClick={() => save.mutate()}>Add revision</Button></DialogFooter></DialogContent></Dialog>
}

function PayrollDetails({ run, onAdjust, onChanged }: { run?: PayrollRun; onAdjust: (item: PayrollItem) => void; onChanged: () => void }) {
  if (!run) return <DataState kind="empty" title="Select a payroll run" description="Generate or select a monthly payroll run to review it." />
  const action = (request: Promise<PayrollRun>, message: string) => request.then(() => { toast.success(message); onChanged() }).catch((error) => toast.error(error?.response?.data?.message || "Payroll could not be updated"))
  return <Card><CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>{run.year}-{String(run.month).padStart(2, "0")}</CardTitle><CardDescription>{run.currencyCode} · {run.status}</CardDescription></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => hrmService.exportPayroll(run.id)}><Download className="mr-2 size-4" />CSV</Button><Button variant="outline" onClick={() => exportPayrollPdf(run)}><FileDown className="mr-2 size-4" />PDF</Button>{run.status === "draft" && <Button onClick={() => action(hrmService.finalizePayroll(run.id), "Payroll finalized")}>Finalize</Button>}{run.status === "finalized" && <><Button variant="outline" onClick={() => action(hrmService.reopenPayroll(run.id), "Payroll reopened")}>Reopen</Button><Button onClick={() => action(hrmService.markPayrollPaid(run.id, {}), "Payroll marked paid")}>Mark paid</Button></>}</div></div></CardHeader>
    <CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Base</TableHead><TableHead>Additions</TableHead><TableHead>Deductions</TableHead><TableHead>Net</TableHead><TableHead>Unresolved</TableHead><TableHead /></TableRow></TableHeader><TableBody>{run.items?.map((item) => <TableRow key={item.id}><TableCell><span className="font-medium">{item.employeeName}</span><span className="block text-xs text-muted-foreground">{item.employeeCode}</span></TableCell><TableCell>{Number(item.baseEarnings).toFixed(2)}</TableCell><TableCell>{Number(item.additionsTotal).toFixed(2)}</TableCell><TableCell>{Number(item.deductionsTotal).toFixed(2)}</TableCell><TableCell className="font-semibold">{Number(item.netPay).toFixed(2)}</TableCell><TableCell>{item.unresolvedDays}</TableCell><TableCell>{run.status === "draft" && <Button variant="ghost" size="icon" aria-label={`Adjust ${item.employeeName}`} onClick={() => onAdjust(item)}><Pencil className="size-4" /></Button>}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>
}

function AdjustmentDialog({ item, runId, open, onOpenChange, onSaved }: any) {
  const [label, setLabel] = useState("")
  const [type, setType] = useState<"earning" | "deduction">("earning")
  const [amount, setAmount] = useState("")
  const [adjustments, setAdjustments] = useState<PayrollAdjustment[]>(item.adjustments || [])
  const save = useMutation({ mutationFn: () => hrmService.updatePayrollItem(runId, item.id, adjustments), onSuccess: () => { toast.success("Adjustments saved"); onSaved(); onOpenChange(false) }, onError: (error: any) => toast.error(error?.response?.data?.message || "Adjustments could not be saved") })
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Adjust {item.employeeName}</DialogTitle><DialogDescription>Add manual overtime, bonus, absence, or other adjustments.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-[1fr_9rem_8rem_auto]"><Input placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} /><Select value={type} onValueChange={(value: "earning" | "deduction") => setType(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="earning">Earning</SelectItem><SelectItem value="deduction">Deduction</SelectItem></SelectContent></Select><Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /><Button variant="outline" onClick={() => { if (label && Number(amount) >= 0) { setAdjustments([...adjustments, { label, type, amount: Number(amount) }]); setLabel(""); setAmount("") } }}><Plus className="size-4" /></Button></div>
    <div className="space-y-2">{adjustments.map((adjustment, index) => <div key={`${adjustment.label}-${index}`} className="flex items-center justify-between rounded-lg border p-3"><span><span className="font-medium">{adjustment.label}</span><span className="ml-2 text-xs text-muted-foreground">{adjustment.type}</span></span><Button variant="ghost" size="sm" onClick={() => setAdjustments(adjustments.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button></div>)}</div>
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={save.isPending} onClick={() => save.mutate()}>Save adjustments</Button></DialogFooter></DialogContent></Dialog>
}

function SettingsPanel({ settings, departments, designations, holidays, onChanged }: any) {
  const [draft, setDraft] = useState<HrmSettings | undefined>(settings)
  const [departmentName, setDepartmentName] = useState("")
  const [designationName, setDesignationName] = useState("")
  const [holiday, setHoliday] = useState({ name: "", holidayDate: today(), isPaid: true })
  useEffect(() => setDraft(settings), [settings])
  if (!draft) return <PageSkeleton />
  const notify = (request: Promise<any>, message: string) => request.then(() => { toast.success(message); onChanged() }).catch((error) => toast.error(error?.response?.data?.message || "Could not save"))
  return <div className="grid gap-4 xl:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="size-5" />HRM configuration</CardTitle><CardDescription>Confirm these values before employees clock in or payroll is generated.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
    <Field label="Timezone"><Input value={draft.timezone} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })} /></Field><Field label="Currency"><Input maxLength={3} value={draft.currencyCode} onChange={(e) => setDraft({ ...draft, currencyCode: e.target.value.toUpperCase() })} /></Field><Field label="Work starts"><Input type="time" value={draft.workStartTime} onChange={(e) => setDraft({ ...draft, workStartTime: e.target.value })} /></Field><Field label="Work ends"><Input type="time" value={draft.workEndTime} onChange={(e) => setDraft({ ...draft, workEndTime: e.target.value })} /></Field><Field label="Grace minutes"><Input type="number" min="0" value={draft.graceMinutes} onChange={(e) => setDraft({ ...draft, graceMinutes: Number(e.target.value) })} /></Field><Field label="Work days (0–6)"><Input value={draft.workDays.join(",")} onChange={(e) => setDraft({ ...draft, workDays: e.target.value.split(",").map(Number).filter((value) => Number.isInteger(value)) })} /></Field><div className="sm:col-span-2"><Button onClick={() => notify(hrmService.updateSettings({ timezone: draft.timezone, currencyCode: draft.currencyCode, workDays: draft.workDays, workStartTime: draft.workStartTime, workEndTime: draft.workEndTime, graceMinutes: draft.graceMinutes }), "Settings saved")}>Save settings</Button></div>
  </CardContent></Card>
  <Card><CardHeader><CardTitle>Organization structure</CardTitle></CardHeader><CardContent className="space-y-5"><div><Label>Department</Label><div className="mt-2 flex gap-2"><Input value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} /><Button onClick={() => notify(hrmService.createDepartment({ name: departmentName }), "Department added").then(() => setDepartmentName(""))}><Plus className="size-4" /></Button></div><div className="mt-2 flex flex-wrap gap-2">{departments.map((item: any) => <StatusBadge key={item.id}>{item.name}</StatusBadge>)}</div></div>
    <div><Label>Designation</Label><div className="mt-2 flex gap-2"><Input value={designationName} onChange={(e) => setDesignationName(e.target.value)} /><Button onClick={() => notify(hrmService.createDesignation({ name: designationName }), "Designation added").then(() => setDesignationName(""))}><Plus className="size-4" /></Button></div><div className="mt-2 flex flex-wrap gap-2">{designations.map((item: any) => <StatusBadge key={item.id}>{item.name}</StatusBadge>)}</div></div></CardContent></Card>
  <Card className="xl:col-span-2"><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="size-5" />Holidays</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-[1fr_12rem_8rem_auto]"><Input placeholder="Holiday name" value={holiday.name} onChange={(e) => setHoliday({ ...holiday, name: e.target.value })} /><Input type="date" value={holiday.holidayDate} onChange={(e) => setHoliday({ ...holiday, holidayDate: e.target.value })} /><Select value={holiday.isPaid ? "paid" : "unpaid"} onValueChange={(value) => setHoliday({ ...holiday, isPaid: value === "paid" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="paid">Paid</SelectItem><SelectItem value="unpaid">Unpaid</SelectItem></SelectContent></Select><Button onClick={() => notify(hrmService.createHoliday(holiday), "Holiday added")}><Plus className="size-4" /></Button></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{holidays.map((item: any) => <div key={item.id} className="rounded-lg border p-3"><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.holidayDate} · {item.isPaid ? "Paid" : "Unpaid"}</p></div>)}</div></CardContent></Card>
  </div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>
}
