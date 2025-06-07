"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Eye, Server, Clock, Activity } from "lucide-react"
import { ServiceDetailModal } from "@/components/service-detail-modal"
import { ThemeToggle } from "@/components/theme-toggle"

interface DockerService {
  id: string
  name: string
  status: "running" | "stopped" | "paused" | "restarting"
  image: string
  created: string
  uptime: string
  ports: string[]
  cpu_usage?: number
  memory_usage?: number
  network_rx?: string
  network_tx?: string
}

// DUMMY DATA FOR TESTING - Remove when connecting to real backend
const DUMMY_SERVICES: DockerService[] = [
  {
    id: "abc123",
    name: "nginx-proxy",
    status: "running",
    image: "nginx:latest",
    created: "2024-01-15T10:30:00Z",
    uptime: "5 days, 3 hours",
    ports: ["80:80", "443:443"],
    cpu_usage: 2.5,
    memory_usage: 45.2,
    network_rx: "1.2 GB",
    network_tx: "850 MB",
  },
  {
    id: "def456",
    name: "postgres-db",
    status: "running",
    image: "postgres:13",
    created: "2024-01-10T08:15:00Z",
    uptime: "10 days, 7 hours",
    ports: ["5432:5432"],
    cpu_usage: 1.8,
    memory_usage: 128.5,
    network_rx: "2.8 GB",
    network_tx: "1.2 GB",
  },
  {
    id: "ghi789",
    name: "redis-cache",
    status: "running",
    image: "redis:alpine",
    created: "2024-01-12T14:20:00Z",
    uptime: "8 days, 1 hour",
    ports: ["6379:6379"],
    cpu_usage: 0.5,
    memory_usage: 32.1,
    network_rx: "450 MB",
    network_tx: "320 MB",
  },
  {
    id: "jkl012",
    name: "api-server",
    status: "stopped",
    image: "node:18-alpine",
    created: "2024-01-14T16:45:00Z",
    uptime: "0 minutes",
    ports: ["3000:3000"],
    cpu_usage: 0,
    memory_usage: 0,
    network_rx: "0 B",
    network_tx: "0 B",
  },
  {
    id: "mno345",
    name: "mongodb",
    status: "running",
    image: "mongo:latest",
    created: "2024-01-08T12:00:00Z",
    uptime: "12 days, 15 hours",
    ports: ["27017:27017"],
    cpu_usage: 3.2,
    memory_usage: 256.8,
    network_rx: "5.1 GB",
    network_tx: "3.7 GB",
  },
]

export default function DockerServicesPage() {
  const [services, setServices] = useState<DockerService[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<DockerService | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchServices = async () => {
    setLoading(true)
    setError(null)

    try {
      // Try to fetch from FastAPI backend first
      const response = await fetch("/api/docker-services")

      if (response.ok) {
        const data = await response.json()
        setServices(data.services || [])
      } else {
        throw new Error("Backend not available")
      }
    } catch (err) {
      // Fallback to dummy data for testing
      console.log("Using dummy data for testing - Backend not available")
      setServices(DUMMY_SERVICES)
    } finally {
      setLoading(false)
      setLastRefresh(new Date())
    }
  }

  useEffect(() => {
    fetchServices()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchServices, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-green-500"
      case "stopped":
        return "bg-red-500"
      case "paused":
        return "bg-yellow-500"
      case "restarting":
        return "bg-blue-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "running":
        return "default"
      case "stopped":
        return "destructive"
      case "paused":
        return "secondary"
      case "restarting":
        return "outline"
      default:
        return "secondary"
    }
  }

  if (loading && services.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading Docker services...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Server className="h-8 w-8" />
                Docker Services Monitor
              </h1>
              <p className="text-muted-foreground mt-1">Monitor and manage your Docker containers</p>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="text-sm text-muted-foreground">Last updated: {lastRefresh.toLocaleTimeString()}</div>
              <Button onClick={fetchServices} disabled={loading} variant="outline" size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Running</p>
                  <p className="text-2xl font-bold text-green-600">
                    {services.filter((s) => s.status === "running").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Stopped</p>
                  <p className="text-2xl font-bold text-red-600">
                    {services.filter((s) => s.status === "stopped").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Services</p>
                  <p className="text-2xl font-bold text-blue-600">{services.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Avg Uptime</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {services.filter((s) => s.status === "running").length > 0 ? "8d" : "0d"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Services Grid */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="hover:shadow-lg transition-shadow border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold truncate text-foreground">{service.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`} />
                    <Badge variant={getStatusVariant(service.status)}>{service.status}</Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Image:</span>
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-foreground">
                      {service.image}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uptime:</span>
                    <span className="font-medium text-foreground">{service.uptime}</span>
                  </div>

                  {service.ports.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ports:</span>
                      <span className="font-mono text-xs text-foreground">
                        {service.ports.slice(0, 2).join(", ")}
                        {service.ports.length > 2 && "..."}
                      </span>
                    </div>
                  )}

                  {service.status === "running" && service.cpu_usage !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CPU:</span>
                      <span className="font-medium text-foreground">{service.cpu_usage}%</span>
                    </div>
                  )}

                  {service.status === "running" && service.memory_usage !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Memory:</span>
                      <span className="font-medium text-foreground">{service.memory_usage} MB</span>
                    </div>
                  )}
                </div>

                <Button variant="outline" size="sm" className="w-full" onClick={() => setSelectedService(service)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {services.length === 0 && !loading && (
          <div className="text-center py-12">
            <Server className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Docker services found</h3>
            <p className="text-muted-foreground">Make sure Docker is running and you have containers to monitor.</p>
          </div>
        )}
      </div>

      {/* Service Detail Modal */}
      {selectedService && (
        <ServiceDetailModal
          service={selectedService}
          isOpen={!!selectedService}
          onClose={() => setSelectedService(null)}
        />
      )}
    </div>
  )
}
