"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Search,
  Plus,
  MoreHorizontal,
  Gift,
  Star,
  TrendingUp,
  Users,
  Settings,
  Award,
  Coins,
  Edit,
  Trash2,
} from "lucide-react"

interface LoyaltyCustomer {
  id: string
  name: string
  email: string
  phone: string
  tier: "Bronze" | "Silver" | "Gold" | "Platinum"
  totalPoints: number
  usedPoints: number
  availablePoints: number
  totalSpent: number
  joinDate: string
  lastActivity: string
  status: "Active" | "Inactive"
}

interface LoyaltyTransaction {
  id: string
  customerId: string
  customerName: string
  type: "Earned" | "Redeemed" | "Expired" | "Adjusted"
  points: number
  orderId?: string
  description: string
  date: string
}

const sampleCustomers: LoyaltyCustomer[] = [
  {
    id: "CUST-001",
    name: "John Doe",
    email: "john@example.com",
    phone: "+880 1712-345678",
    tier: "Gold",
    totalPoints: 2500,
    usedPoints: 750,
    availablePoints: 1750,
    totalSpent: 250000,
    joinDate: "2023-06-15",
    lastActivity: "2024-01-15",
    status: "Active",
  },
  {
    id: "CUST-002",
    name: "Jane Smith",
    email: "jane@example.com",
    phone: "+880 1812-345678",
    tier: "Silver",
    totalPoints: 1200,
    usedPoints: 300,
    availablePoints: 900,
    totalSpent: 120000,
    joinDate: "2023-08-20",
    lastActivity: "2024-01-12",
    status: "Active",
  },
  {
    id: "CUST-003",
    name: "Mike Johnson",
    email: "mike@business.com",
    phone: "+880 1912-345678",
    tier: "Platinum",
    totalPoints: 5000,
    usedPoints: 2000,
    availablePoints: 3000,
    totalSpent: 500000,
    joinDate: "2023-03-10",
    lastActivity: "2024-01-10",
    status: "Active",
  },
  {
    id: "CUST-004",
    name: "Sarah Wilson",
    email: "sarah@example.com",
    phone: "+880 1612-345678",
    tier: "Bronze",
    totalPoints: 450,
    usedPoints: 150,
    availablePoints: 300,
    totalSpent: 45000,
    joinDate: "2023-11-05",
    lastActivity: "2023-12-20",
    status: "Inactive",
  },
]

const sampleTransactions: LoyaltyTransaction[] = [
  {
    id: "TXN-001",
    customerId: "CUST-001",
    customerName: "John Doe",
    type: "Earned",
    points: 125,
    orderId: "ORD-001",
    description: "Points earned from purchase ORD-001",
    date: "2024-01-15",
  },
  {
    id: "TXN-002",
    customerId: "CUST-002",
    customerName: "Jane Smith",
    type: "Redeemed",
    points: -50,
    orderId: "ORD-002",
    description: "Points redeemed for discount",
    date: "2024-01-12",
  },
  {
    id: "TXN-003",
    customerId: "CUST-001",
    customerName: "John Doe",
    type: "Adjusted",
    points: 100,
    description: "Manual adjustment - Customer service",
    date: "2024-01-10",
  },
  {
    id: "TXN-004",
    customerId: "CUST-003",
    customerName: "Mike Johnson",
    type: "Earned",
    points: 210,
    orderId: "ORD-003",
    description: "Points earned from purchase ORD-003",
    date: "2024-01-10",
  },
]

export default function LoyaltyPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [customers] = useState<LoyaltyCustomer[]>(sampleCustomers)
  const [transactions] = useState<LoyaltyTransaction[]>(sampleTransactions)
  const [activeTab, setActiveTab] = useState("customers")
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true)

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm),
  )

  const filteredTransactions = transactions.filter(
    (transaction) =>
      transaction.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getTierBadge = (tier: LoyaltyCustomer["tier"]) => {
    const colors = {
      Bronze: "bg-orange-100 text-orange-800",
      Silver: "bg-gray-100 text-gray-800",
      Gold: "bg-yellow-100 text-yellow-800",
      Platinum: "bg-purple-100 text-purple-800",
    }

    return (
      <Badge variant="outline" className={colors[tier]}>
        {tier}
      </Badge>
    )
  }

  const getTransactionBadge = (type: LoyaltyTransaction["type"]) => {
    const colors = {
      Earned: "bg-green-100 text-green-800",
      Redeemed: "bg-blue-100 text-blue-800",
      Expired: "bg-red-100 text-red-800",
      Adjusted: "bg-purple-100 text-purple-800",
    }

    return (
      <Badge variant="outline" className={colors[type]}>
        {type}
      </Badge>
    )
  }

  const loyaltyStats = {
    totalCustomers: customers.length,
    activeCustomers: customers.filter((c) => c.status === "Active").length,
    totalPointsIssued: customers.reduce((sum, c) => sum + c.totalPoints, 0),
    totalPointsRedeemed: customers.reduce((sum, c) => sum + c.usedPoints, 0),
  }

  const tierDistribution = {
    Bronze: customers.filter((c) => c.tier === "Bronze").length,
    Silver: customers.filter((c) => c.tier === "Silver").length,
    Gold: customers.filter((c) => c.tier === "Gold").length,
    Platinum: customers.filter((c) => c.tier === "Platinum").length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Loyalty Points System</h1>
          <p className="text-muted-foreground">Manage customer loyalty program and rewards</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center space-x-2">
            <Switch id="loyalty-enabled" checked={loyaltyEnabled} onCheckedChange={setLoyaltyEnabled} />
            <Label htmlFor="loyalty-enabled">Enable Loyalty Program</Label>
          </div>
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Points
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loyaltyStats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">{loyaltyStats.activeCustomers} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points Issued</CardTitle>
            <Coins className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{loyaltyStats.totalPointsIssued.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points Redeemed</CardTitle>
            <Gift className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{loyaltyStats.totalPointsRedeemed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total used</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Redemption Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {((loyaltyStats.totalPointsRedeemed / loyaltyStats.totalPointsIssued) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Points utilization</p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Tier Distribution</CardTitle>
          <CardDescription>Customer distribution across loyalty tiers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {Object.entries(tierDistribution).map(([tier, count]) => (
              <div key={tier} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Award className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{tier}</p>
                    <p className="text-sm text-muted-foreground">{count} members</p>
                  </div>
                </div>
                {getTierBadge(tier as LoyaltyCustomer["tier"])}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Loyalty Management</CardTitle>
          <CardDescription>Manage customer loyalty points and transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers or transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>

            <TabsContent value="customers" className="mt-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Available Points</TableHead>
                      <TableHead>Total Earned</TableHead>
                      <TableHead>Total Spent</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-muted-foreground">{customer.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getTierBadge(customer.tier)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Coins className="h-4 w-4 text-yellow-600" />
                            <span className="font-medium">{customer.availablePoints.toLocaleString()}</span>
                          </div>
                        </TableCell>
                        <TableCell>{customer.totalPoints.toLocaleString()}</TableCell>
                        <TableCell>৳{customer.totalSpent.toLocaleString()}</TableCell>
                        <TableCell>{customer.lastActivity}</TableCell>
                        <TableCell>
                          <Badge variant={customer.status === "Active" ? "default" : "secondary"}>
                            {customer.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Points
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Gift className="mr-2 h-4 w-4" />
                                Award Bonus
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Star className="mr-2 h-4 w-4" />
                                Change Tier
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="transactions" className="mt-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">{transaction.customerName}</TableCell>
                        <TableCell>{getTransactionBadge(transaction.type)}</TableCell>
                        <TableCell>
                          <div
                            className={`flex items-center gap-1 ${transaction.points > 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            <Coins className="h-4 w-4" />
                            <span className="font-medium">
                              {transaction.points > 0 ? "+" : ""}
                              {transaction.points.toLocaleString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {transaction.orderId ? (
                            <Badge variant="outline">{transaction.orderId}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                        <TableCell>{transaction.date}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {transaction.type === "Adjusted" && (
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Reverse
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
