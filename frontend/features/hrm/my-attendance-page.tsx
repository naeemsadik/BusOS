"use client"

import { useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Clock3, LogIn, LogOut, UserRoundCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DataState, MetricCard, PageHeader, PageSkeleton, StatusBadge } from "@/components/ui/page-primitives"
import { hrmService } from "@/lib/hrm-service"

export function MyAttendancePage() {
  const t = useTranslations("hrm")
  const queryClient = useQueryClient()
  const employee = useQuery({ queryKey: ["hrm", "me"], queryFn: hrmService.getMyEmployee })
  const attendance = useQuery({ queryKey: ["hrm", "my-attendance"], queryFn: () => hrmService.getMyAttendance({ limit: 100 }) })
  const openRecord = useMemo(() => attendance.data?.records.find((record) => record.checkInAt && !record.checkOutAt), [attendance.data])
  const clock = useMutation({
    mutationFn: () => openRecord ? hrmService.clockOut() : hrmService.clockIn(),
    onSuccess: () => {
      toast.success(openRecord ? "Checked out" : "Checked in")
      queryClient.invalidateQueries({ queryKey: ["hrm", "my-attendance"] })
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || t("error")),
  })

  if (employee.isLoading || attendance.isLoading) return <div className="p-4 sm:p-6"><PageSkeleton /></div>
  if (employee.isError || attendance.isError) return <div className="p-4 sm:p-6"><DataState kind="error" title={t("error")} description={t("myDescription")} /></div>

  const records = attendance.data?.records || []
  const present = records.filter((record) => record.status === "present").length
  const lateMinutes = records.reduce((sum, record) => sum + record.lateMinutes, 0)

  return <div className="space-y-6 p-3 sm:p-4 lg:p-6">
    <PageHeader eyebrow={employee.data?.employeeCode} title={t("myTitle")} description={t("myDescription")}
      actions={<Button size="lg" onClick={() => clock.mutate()} disabled={clock.isPending}>
        {openRecord ? <LogOut className="mr-2 size-4" /> : <LogIn className="mr-2 size-4" />}
        {openRecord ? t("clockOutNow") : t("clockInNow")}
      </Button>} />

    <div className="grid gap-4 sm:grid-cols-3">
      <MetricCard label={openRecord ? t("clockedIn") : t("notClockedIn")} value={openRecord?.checkInAt ? new Date(openRecord.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"} icon={Clock3} tone={openRecord ? "success" : "warning"} />
      <MetricCard label={t("present")} value={present} icon={UserRoundCheck} tone="success" />
      <MetricCard label={t("late")} value={`${lateMinutes} min`} icon={Clock3} tone="warning" />
    </div>

    <Card><CardHeader><CardTitle>{t("attendance")}</CardTitle><CardDescription>{employee.data?.firstName} {employee.data?.lastName}</CardDescription></CardHeader><CardContent className="p-0">
      {!records.length ? <DataState kind="empty" title={t("noAttendance")} description={t("myDescription")} /> :
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>{t("date")}</TableHead><TableHead>{t("status")}</TableHead><TableHead>{t("checkIn")}</TableHead><TableHead>{t("checkOut")}</TableHead><TableHead>{t("worked")}</TableHead><TableHead>{t("late")}</TableHead></TableRow></TableHeader><TableBody>
          {records.map((record) => <TableRow key={record.id}><TableCell>{record.workDate}</TableCell><TableCell><StatusBadge tone={record.status === "present" ? "success" : record.status === "absent" ? "danger" : "info"}>{record.status.replaceAll("_", " ")}</StatusBadge></TableCell><TableCell>{record.checkInAt ? new Date(record.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</TableCell><TableCell>{record.checkOutAt ? new Date(record.checkOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</TableCell><TableCell>{record.workedMinutes} min</TableCell><TableCell>{record.lateMinutes} min</TableCell></TableRow>)}
        </TableBody></Table></div>}
    </CardContent></Card>
  </div>
}
