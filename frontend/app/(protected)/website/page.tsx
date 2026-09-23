import PermissionGuardPage from '@/components/permission-guard-page'
import { WebsiteBuilder } from '@/features/storefront/website-builder'
import { PermissionModuleType } from '@/lib/types'

export default function WebsitePage() {
  return <PermissionGuardPage module={PermissionModuleType.WEBSITE}><WebsiteBuilder /></PermissionGuardPage>
}
