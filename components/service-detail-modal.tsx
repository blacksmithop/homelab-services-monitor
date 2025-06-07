import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Server, Clock, ImageIcon, Network, Cpu, MemoryStick, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

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

interface ServiceDetailModalProps {
  service: DockerService
  isOpen: boolean
  onClose: () => void
}

export function ServiceDetailModal({ service, isOpen, onClose }: ServiceDetailModalProps) {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Server className="h-6 w-6" />
            {service.name}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`} />
              <Badge variant={getStatusVariant(service.status)}>{service.status}</Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Server className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Container ID</label>
                  <p className="font-mono text-sm bg-gray-100 p-2 rounded mt-1">{service.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`} />
                    <span className="capitalize font-medium">{service.status}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Docker Image
                </label>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded mt-1">{service.image}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Created
                  </label>
                  <p className="text-sm mt-1">{formatDate(service.created)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Uptime
                  </label>
                  <p className="text-sm mt-1 font-medium">{service.uptime}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Network Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Network className="h-5 w-5" />
                Network Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="text-sm font-medium text-gray-600">Port Mappings</label>
                <div className="mt-2 space-y-1">
                  {service.ports.length > 0 ? (
                    service.ports.map((port, index) => (
                      <div key={index} className="font-mono text-sm bg-gray-100 p-2 rounded">
                        {port}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No port mappings configured</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resource Usage (only show if running) */}
          {service.status === "running" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  Resource Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Cpu className="h-4 w-4" />
                      CPU Usage
                    </label>
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-2xl font-bold text-blue-600">{service.cpu_usage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(service.cpu_usage || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <MemoryStick className="h-4 w-4" />
                      Memory Usage
                    </label>
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-2xl font-bold text-green-600">{service.memory_usage} MB</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((service.memory_usage || 0) / 10, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    Network Traffic
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <ArrowDown className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-xs text-gray-600">Received</p>
                        <p className="font-medium">{service.network_rx}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowUp className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-xs text-gray-600">Transmitted</p>
                        <p className="font-medium">{service.network_tx}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
