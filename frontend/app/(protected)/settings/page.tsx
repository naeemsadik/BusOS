"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Building, CreditCard, Mail, Phone, Globe, Database, Key, Save, Truck, CheckCircle, AlertCircle, Eye, EyeOff, TestTube, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { settingsService, OrganizationSettings } from "@/lib/settings-service"
import PermissionGuardPage from "@/components/permission-guard-page"
import { PermissionModuleType } from "@/lib/types"
import { CurrencySelector } from "@/components/currency-selector"

export default function SettingsPage() {
  return (
    <PermissionGuardPage module={PermissionModuleType.SETTINGS}>
      <SettingsPageContent />
    </PermissionGuardPage>
  )
}

function SettingsPageContent() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [organization, setOrganization] = useState<OrganizationSettings | null>(null)
  
  // Steadfast state
  const [showSteadfastSecret, setShowSteadfastSecret] = useState(false)
  const [steadfastTesting, setSteadfastTesting] = useState(false)
  const [steadfastConnectionStatus, setSteadfastConnectionStatus] = useState<{
    tested: boolean
    success: boolean
    balance?: number | null
    error?: string
  }>({ tested: false, success: false })
  const [steadfastCredentials, setSteadfastCredentials] = useState({
    apiKey: "",
    secretKey: ""
  })

  // Pathao state
  const [showPathaoSecret, setShowPathaoSecret] = useState(false)
  const [pathaoTesting, setPathaoTesting] = useState(false)
  const [pathaoConnectionStatus, setPathaoConnectionStatus] = useState<{
    tested: boolean
    success: boolean
    stores?: any
    error?: string
  }>({ tested: false, success: false })
  const [pathaoCredentials, setPathaoCredentials] = useState({
    clientId: "",
    clientSecret: "",
    username: "",
    password: ""
  })

  useEffect(() => {
    loadOrganizationSettings()
  }, [])

  const loadOrganizationSettings = async () => {
    try {
      const settings = await settingsService.getOrganizationSettings()
      setOrganization(settings)
      setSteadfastCredentials({
        apiKey: settings.steadfastApiKey || "",
        secretKey: settings.steadfastSecretKey || ""
      })
      setPathaoCredentials({
        clientId: settings.pathaoClientId || "",
        clientSecret: settings.pathaoClientSecret || "",
        username: settings.pathaoUsername || "",
        password: settings.pathaoPassword || ""
      })
    } catch (error) {
      toast.error("Failed to load organization settings")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveOrganization = async () => {
    if (!organization) return
    
    setSaving(true)
    try {
      // Extract only the fields that can be updated (exclude read-only fields)
      const {
        id, 
        isActive, 
        pathaoAccessToken, 
        pathaoRefreshToken, 
        pathaoTokenExpiresAt, 
        createdAt, 
        updatedAt,
        ...updateData
      } = organization
      
      const updatedSettings = await settingsService.updateOrganizationSettings(updateData)
      setOrganization(updatedSettings)
      toast.success("Organization settings saved successfully")
    } catch (error) {
      toast.error("Failed to save organization settings")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSteadfastCredentials = async () => {
    if (!steadfastCredentials.apiKey || !steadfastCredentials.secretKey) {
      toast.error("Both Steadfast API key and secret key are required")
      return
    }

    setSaving(true)
    try {
      const updatedSettings = await settingsService.updateOrganizationSettings({
        steadfastApiKey: steadfastCredentials.apiKey,
        steadfastSecretKey: steadfastCredentials.secretKey,
      })
      setOrganization(updatedSettings)
      toast.success("Steadfast credentials saved successfully")
      setSteadfastConnectionStatus({ tested: false, success: false })
    } catch (error) {
      toast.error("Failed to save Steadfast credentials")
    } finally {
      setSaving(false)
    }
  }

  const handleTestSteadfastConnection = async () => {
    setSteadfastTesting(true)
    try {
      const result = await settingsService.testCourierConnection('steadfast')
      setSteadfastConnectionStatus({
        tested: true,
        success: result.success,
        balance: result.balance,
        error: result.error
      })
      
      if (result.success) {
        toast.success(`Steadfast connection successful! Current balance: ৳${result.balance || 0}`)
      } else {
        toast.error(`Steadfast connection failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Steadfast test error:', error)
      setSteadfastConnectionStatus({
        tested: true,
        success: false,
        error: 'Failed to test connection'
      })
      toast.error("Failed to test Steadfast connection")
    } finally {
      setSteadfastTesting(false)
    }
  }

  const handleRemoveSteadfastCredentials = async () => {
    setSaving(true)
    try {
      const updatedSettings = await settingsService.removeCourierCredentials('steadfast')
      setOrganization(updatedSettings)
      setSteadfastCredentials({ apiKey: "", secretKey: "" })
      setSteadfastConnectionStatus({ tested: false, success: false })
      toast.success("Steadfast credentials removed successfully")
    } catch (error) {
      toast.error("Failed to remove Steadfast credentials")
    } finally {
      setSaving(false)
    }
  }

  const handleSavePathaoCredentials = async () => {
    if (!pathaoCredentials.clientId || !pathaoCredentials.clientSecret || !pathaoCredentials.username || !pathaoCredentials.password) {
      toast.error("All Pathao credential fields are required")
      return
    }

    setSaving(true)
    try {
      const updatedSettings = await settingsService.updateOrganizationSettings({
        pathaoClientId: pathaoCredentials.clientId,
        pathaoClientSecret: pathaoCredentials.clientSecret,
        pathaoUsername: pathaoCredentials.username,
        pathaoPassword: pathaoCredentials.password,
      })
      setOrganization(updatedSettings)
      toast.success("Pathao credentials saved successfully")
      setPathaoConnectionStatus({ tested: false, success: false })
    } catch (error) {
      toast.error("Failed to save Pathao credentials")
    } finally {
      setSaving(false)
    }
  }

  const handleTestPathaoConnection = async () => {
    setPathaoTesting(true)
    try {
      const result = await settingsService.testCourierConnection('pathao')
      setPathaoConnectionStatus({
        tested: true,
        success: result.success,
        stores: result.stores,
        error: result.error
      })
      
      if (result.success) {
        toast.success(`Pathao connection successful! Found ${result.stores?.data?.length || 0} stores.`)
      } else {
        toast.error(`Pathao connection failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Pathao test error:', error)
      setPathaoConnectionStatus({
        tested: true,
        success: false,
        error: 'Failed to test connection'
      })
      toast.error("Failed to test Pathao connection")
    } finally {
      setPathaoTesting(false)
    }
  }

  const handleRemovePathaoCredentials = async () => {
    setSaving(true)
    try {
      const updatedSettings = await settingsService.removeCourierCredentials('pathao')
      setOrganization(updatedSettings)
      setPathaoCredentials({ clientId: "", clientSecret: "", username: "", password: "" })
      setPathaoConnectionStatus({ tested: false, success: false })
      toast.success("Pathao credentials removed successfully")
    } catch (error) {
      toast.error("Failed to remove Pathao credentials")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization, integrations, and system preferences.
        </p>
      </div>

      <Tabs defaultValue="organization" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="organization" className="text-xs sm:text-sm">Organization</TabsTrigger>
          <TabsTrigger value="currency" className="text-xs sm:text-sm">Currency</TabsTrigger>
          <TabsTrigger value="integrations" className="text-xs sm:text-sm">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Organization Details
              </CardTitle>
              <CardDescription>
                Basic information about your organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {organization && (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input
                      id="org-name"
                      value={organization.name}
                      onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
                      placeholder="Your Organization Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-phone">Phone Number</Label>
                    <Input
                      id="org-phone"
                      value={organization.phone || ""}
                      onChange={(e) => setOrganization({ ...organization, phone: e.target.value })}
                      placeholder="+8801XXXXXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-website">Website</Label>
                    <Input
                      id="org-website"
                      value={organization.website || ""}
                      onChange={(e) => setOrganization({ ...organization, website: e.target.value })}
                      placeholder="https://your-website.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-city">City</Label>
                    <Input
                      id="org-city"
                      value={organization.city || ""}
                      onChange={(e) => setOrganization({ ...organization, city: e.target.value })}
                      placeholder="Dhaka"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-state">State/Division</Label>
                    <Input
                      id="org-state"
                      value={organization.state || ""}
                      onChange={(e) => setOrganization({ ...organization, state: e.target.value })}
                      placeholder="Dhaka Division"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-country">Country</Label>
                    <Input
                      id="org-country"
                      value={organization.country || ""}
                      onChange={(e) => setOrganization({ ...organization, country: e.target.value })}
                      placeholder="Bangladesh"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-postal-code">Postal Code</Label>
                    <Input
                      id="org-postal-code"
                      value={organization.postalCode || ""}
                      onChange={(e) => setOrganization({ ...organization, postalCode: e.target.value })}
                      placeholder="1100"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="org-logo">Logo URL</Label>
                    <Input
                      id="org-logo"
                      value={organization.logo || ""}
                      onChange={(e) => setOrganization({ ...organization, logo: e.target.value })}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="org-description">Description</Label>
                    <Textarea
                      id="org-description"
                      value={organization.description || ""}
                      onChange={(e) => setOrganization({ ...organization, description: e.target.value })}
                      placeholder="Brief description of your organization"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="org-address">Address</Label>
                    <Textarea
                      id="org-address"
                      value={organization.address || ""}
                      onChange={(e) => setOrganization({ ...organization, address: e.target.value })}
                      placeholder="Full address"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSaveOrganization} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currency">
          <CurrencySelector />
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Courier Service Integration
              </CardTitle>
              <CardDescription>
                Configure courier services for automated delivery management.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Steadfast Courier */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Steadfast
                  </Badge>
                  <h3 className="font-semibold text-lg">Steadfast Courier</h3>
                </div>
                
                {steadfastConnectionStatus.tested && (
                  <Alert className={steadfastConnectionStatus.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                    <div className="flex items-center gap-2">
                      {steadfastConnectionStatus.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <AlertDescription className={steadfastConnectionStatus.success ? "text-green-700" : "text-red-700"}>
                        {steadfastConnectionStatus.success 
                          ? `Connection successful! Current balance: ৳${steadfastConnectionStatus.balance || 0}` 
                          : `Connection failed: ${steadfastConnectionStatus.error}`}
                      </AlertDescription>
                    </div>
                  </Alert>
                )}
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="steadfast-api-key">API Key</Label>
                    <Input
                      id="steadfast-api-key"
                      type="text"
                      value={steadfastCredentials.apiKey}
                      onChange={(e) => setSteadfastCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="Enter your Steadfast API Key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="steadfast-secret-key">Secret Key</Label>
                    <div className="relative">
                      <Input
                        id="steadfast-secret-key"
                        type={showSteadfastSecret ? "text" : "password"}
                        value={steadfastCredentials.secretKey}
                        onChange={(e) => setSteadfastCredentials(prev => ({ ...prev, secretKey: e.target.value }))}
                        placeholder="Enter your Steadfast Secret Key"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowSteadfastSecret(!showSteadfastSecret)}
                      >
                        {showSteadfastSecret ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSaveSteadfastCredentials} 
                    disabled={saving || !steadfastCredentials.apiKey || !steadfastCredentials.secretKey}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save Credentials"}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleTestSteadfastConnection}
                    disabled={steadfastTesting || !steadfastCredentials.apiKey || !steadfastCredentials.secretKey}
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    {steadfastTesting ? "Testing..." : "Test Connection"}
                  </Button>
                  
                  {(steadfastCredentials.apiKey || steadfastCredentials.secretKey) && (
                    <Button 
                      variant="destructive" 
                      onClick={handleRemoveSteadfastCredentials}
                      disabled={saving}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
                
                {steadfastCredentials.apiKey && steadfastCredentials.secretKey && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="h-4 w-4" />
                      <p className="text-sm font-medium">
                        Your Steadfast Courier integration is configured and ready to use.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Pathao Courier */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    Pathao
                  </Badge>
                  <h3 className="font-semibold text-lg">Pathao Courier</h3>
                </div>
                
                {pathaoConnectionStatus.tested && (
                  <Alert className={pathaoConnectionStatus.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                    <div className="flex items-center gap-2">
                      {pathaoConnectionStatus.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <AlertDescription className={pathaoConnectionStatus.success ? "text-green-700" : "text-red-700"}>
                        {pathaoConnectionStatus.success 
                          ? `Connection successful! Found ${pathaoConnectionStatus.stores?.data?.length || 0} stores.` 
                          : `Connection failed: ${pathaoConnectionStatus.error}`}
                      </AlertDescription>
                    </div>
                  </Alert>
                )}
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pathao-client-id">Client ID</Label>
                    <Input
                      id="pathao-client-id"
                      type="text"
                      value={pathaoCredentials.clientId}
                      onChange={(e) => setPathaoCredentials(prev => ({ ...prev, clientId: e.target.value }))}
                      placeholder="Enter your Pathao Client ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pathao-client-secret">Client Secret</Label>
                    <div className="relative">
                      <Input
                        id="pathao-client-secret"
                        type={showPathaoSecret ? "text" : "password"}
                        value={pathaoCredentials.clientSecret}
                        onChange={(e) => setPathaoCredentials(prev => ({ ...prev, clientSecret: e.target.value }))}
                        placeholder="Enter your Pathao Client Secret"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPathaoSecret(!showPathaoSecret)}
                      >
                        {showPathaoSecret ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pathao-username">Username</Label>
                    <Input
                      id="pathao-username"
                      type="text"
                      value={pathaoCredentials.username}
                      onChange={(e) => setPathaoCredentials(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Enter your Pathao Username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pathao-password">Password</Label>
                    <Input
                      id="pathao-password"
                      type="password"
                      value={pathaoCredentials.password}
                      onChange={(e) => setPathaoCredentials(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter your Pathao Password"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSavePathaoCredentials} 
                    disabled={saving || !pathaoCredentials.clientId || !pathaoCredentials.clientSecret || !pathaoCredentials.username || !pathaoCredentials.password}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save Credentials"}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleTestPathaoConnection}
                    disabled={pathaoTesting || !pathaoCredentials.clientId || !pathaoCredentials.clientSecret || !pathaoCredentials.username || !pathaoCredentials.password}
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    {pathaoTesting ? "Testing..." : "Test Connection"}
                  </Button>
                  
                  {(pathaoCredentials.clientId || pathaoCredentials.clientSecret) && (
                    <Button 
                      variant="destructive" 
                      onClick={handleRemovePathaoCredentials}
                      disabled={saving}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
                
                {pathaoCredentials.clientId && pathaoCredentials.clientSecret && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="h-4 w-4" />
                      <p className="text-sm font-medium">
                        Your Pathao Courier integration is configured and ready to use.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}