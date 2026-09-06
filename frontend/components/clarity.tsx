'use client'
import { useEffect } from 'react'
import Clarity from '@microsoft/clarity'

type Props = { projectId?: string }

export default function ClarityInit({ projectId }: Props) {
  useEffect(() => {
    if (!projectId) return

    try {
      Clarity.init(projectId)
    } catch (e) {
      // ignore errors in non-browser environments
    }
  }, [projectId])

  return null
}
