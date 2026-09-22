"use client"

import { useState } from "react"
import { DashboardOverview } from "@/features/dashboard/dashboard-overview"
import PermissionGuardPage from "@/components/permission-guard-page"
import { VoiceCommandDialog } from "@/components/voice/voice-command-dialog"
import { useAuth } from "@/contexts/auth-context"
import { PermissionModuleType } from "@/lib/types"

export default function DashboardPage() {
  return <PermissionGuardPage module={PermissionModuleType.DASHBOARD}><DashboardContent /></PermissionGuardPage>
}

function DashboardContent() {
  const { user } = useAuth()
  const [voiceOpen, setVoiceOpen] = useState(false)
  if (!user) return null
  return <>
    <DashboardOverview user={user} onVoice={() => setVoiceOpen(true)} />
    <VoiceCommandDialog mode="assistant" open={voiceOpen} onOpenChange={setVoiceOpen} />
  </>
}
