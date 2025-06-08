document.addEventListener("DOMContentLoaded", () => {
  // Configuration
  const API_BASE_URL = "https://api.abhinavkm.com"
  const REFRESH_INTERVAL = 30000 // 30 seconds

  // DOM Elements
  const refreshBtn = document.getElementById("refresh-btn")
  const themeToggle = document.getElementById("theme-toggle")
  const lastUpdatedEl = document.getElementById("last-updated")
  const servicesGrid = document.getElementById("services-grid")
  const loadingEl = document.getElementById("loading")
  const emptyStateEl = document.getElementById("empty-state")
  const errorMessageEl = document.getElementById("error-message")
  const apiStatusEl = document.getElementById("api-status")
  const apiStatusTextEl = document.getElementById("api-status-text")
  const runningCountEl = document.getElementById("running-count")
  const stoppedCountEl = document.getElementById("stopped-count")
  const totalCountEl = document.getElementById("total-count")
  const avgUptimeEl = document.getElementById("avg-uptime")
  const serviceModal = document.getElementById("service-modal")
  const modalTitle = document.getElementById("modal-title")
  const modalBody = document.getElementById("modal-body")
  const closeModal = document.getElementById("close-modal")

  // State
  let refreshInterval = null
  let isLoading = false

  // Initialize Lucide icons
  const lucide = window.lucide
  lucide.createIcons()

  // Theme handling
  const getTheme = () => localStorage.getItem("theme") || "light"
  const setTheme = (theme) => {
    localStorage.setItem("theme", theme)
    document.documentElement.classList.toggle("dark", theme === "dark")
    updateThemeIcon(theme)
  }

  const updateThemeIcon = (theme) => {
    const moonIcon = `<i data-lucide="moon" class="icon"></i>`
    const sunIcon = `<i data-lucide="sun" class="icon"></i>`
    themeToggle.innerHTML = theme === "dark" ? sunIcon : moonIcon
    lucide.createIcons()
  }

  // Initialize theme
  setTheme(getTheme())

  // Theme toggle event
  themeToggle.addEventListener("click", () => {
    const newTheme = getTheme() === "dark" ? "light" : "dark"
    setTheme(newTheme)
  })

  // Close modal events
  closeModal.addEventListener("click", () => {
    serviceModal.classList.remove("active")
  })

  window.addEventListener("click", (e) => {
    if (e.target === serviceModal) {
      serviceModal.classList.remove("active")
    }
  })

  // Helper functions
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "running":
        return "status-running"
      case "stopped":
      case "exited":
        return "status-stopped"
      case "paused":
        return "status-paused"
      case "restarting":
        return "status-restarting"
      default:
        return ""
    }
  }

  const getStatusBadge = (status) => {
    switch (status.toLowerCase()) {
      case "running":
        return "badge-default"
      case "stopped":
      case "exited":
        return "badge-destructive"
      case "paused":
        return "badge-secondary"
      case "restarting":
        return "badge-outline"
      default:
        return "badge-secondary"
    }
  }

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString()
    } catch (error) {
      return dateString
    }
  }

  const updateApiStatus = (status, message) => {
    apiStatusEl.classList.remove("hidden", "success", "warning")

    if (status === "success") {
      apiStatusEl.classList.add("success")
      apiStatusTextEl.innerHTML = `<i data-lucide="wifi" class="icon"></i> Connected`
    } else if (status === "warning") {
      apiStatusEl.classList.add("warning")
      apiStatusTextEl.textContent = message || "API Warning"
    } else {
      apiStatusTextEl.textContent = message || "API Unavailable"
    }

    lucide.createIcons()
  }

  const hideApiStatus = () => {
    apiStatusEl.classList.add("hidden")
  }

  // Check API health
  const checkApiHealth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })

      if (response.ok) {
        const data = await response.json()
        if (data.status === "healthy") {
          updateApiStatus("success", "API Connected")
          setTimeout(hideApiStatus, 3000) // Hide after 3 seconds
          return true
        } else {
          updateApiStatus("warning", "API Unhealthy")
          return false
        }
      } else {
        updateApiStatus("error", `API Error: ${response.status}`)
        return false
      }
    } catch (error) {
      console.error("Health check failed:", error)
      updateApiStatus("error", "Cannot connect to Docker API")
      return false
    }
  }

  // Fetch services from API
  const fetchServices = async () => {
    if (isLoading) return

    isLoading = true
    refreshBtn.disabled = true

    // Update refresh button to show loading state
    const refreshIcon = refreshBtn.querySelector("i")
    if (refreshIcon) {
      refreshIcon.classList.add("spin")
    }

    loadingEl.classList.remove("hidden")
    errorMessageEl.classList.add("hidden")
    emptyStateEl.classList.add("hidden")

    try {
      // First check API health
      const isHealthy = await checkApiHealth()

      if (!isHealthy) {
        throw new Error("API health check failed")
      }

      // Fetch services data
      const response = await fetch(`${API_BASE_URL}/docker-services`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Validate response structure
      if (!data || typeof data !== "object") {
        throw new Error("Invalid response format")
      }

      const services = data.services || []
      const processedData = {
        services: services,
        running_count: data.running_count || services.filter((s) => s.status === "running").length,
        stopped_count:
          data.stopped_count || services.filter((s) => s.status === "exited" || s.status === "stopped").length,
        total_count: data.total_count || services.length,
      }

      renderServices(processedData)
      updateStats(processedData)
      updateLastRefreshed()
      loadingEl.classList.add("hidden")

      if (services.length === 0) {
        emptyStateEl.classList.remove("hidden")
      } else {
        emptyStateEl.classList.add("hidden")
      }

      hideApiStatus()
    } catch (error) {
      console.error("Error fetching services:", error)

      let errorMessage = "Failed to fetch Docker services from api.abhinavkm.com"

      if (error.name === "AbortError") {
        errorMessage = "Request timeout - API is taking too long to respond"
      } else if (error.message.includes("Failed to fetch")) {
        errorMessage = "Cannot connect to api.abhinavkm.com - Check if the API is running"
      } else if (error.message.includes("HTTP")) {
        errorMessage = `API Error: ${error.message}`
      }

      errorMessageEl.textContent = errorMessage
      errorMessageEl.classList.remove("hidden")
      loadingEl.classList.add("hidden")
      emptyStateEl.classList.add("hidden")

      // Clear stats on error
      updateStats({ running_count: 0, stopped_count: 0, total_count: 0 })
      servicesGrid.innerHTML = ""

      updateApiStatus("error", "API Connection Failed")
    } finally {
      isLoading = false
      refreshBtn.disabled = false
      const refreshIcon = refreshBtn.querySelector("i")
      if (refreshIcon) {
        refreshIcon.classList.remove("spin")
      }
    }
  }

  // Render services to the grid
  const renderServices = (data) => {
    servicesGrid.innerHTML = ""

    if (!data.services || data.services.length === 0) {
      return
    }

    data.services.forEach((service) => {
      const serviceCard = document.createElement("div")
      serviceCard.className = "card"

      // Safely access service properties with defaults
      const serviceName = service.name || "Unknown Service"
      const serviceStatus = service.status || "unknown"
      const serviceImage = service.image || "unknown"
      const serviceUptime = service.uptime || "Unknown"
      const servicePorts = service.ports || []
      const serviceCpuUsage = service.cpu_usage
      const serviceMemoryUsage = service.memory_usage

      serviceCard.innerHTML = `
        <div class="card-header">
          <div class="card-title">
            <div class="truncate">${serviceName}</div>
            <div class="status-indicator">
              <div class="status-dot ${getStatusColor(serviceStatus)}"></div>
              <span class="badge ${getStatusBadge(serviceStatus)}">${serviceStatus}</span>
            </div>
          </div>
        </div>
        <div class="card-content">
          <div class="service-details">
            <div class="service-detail-row">
              <span class="service-detail-label">Image:</span>
              <span class="service-detail-value">
                <span class="code-block truncate">${serviceImage}</span>
              </span>
            </div>
            
            <div class="service-detail-row">
              <span class="service-detail-label">Uptime:</span>
              <span class="service-detail-value">${serviceUptime}</span>
            </div>
            
            ${
              servicePorts.length > 0
                ? `
            <div class="service-detail-row">
              <span class="service-detail-label">Ports:</span>
              <span class="service-detail-value font-mono text-sm">
                ${servicePorts.slice(0, 2).join(", ")}
                ${servicePorts.length > 2 ? "..." : ""}
              </span>
            </div>
            `
                : ""
            }
            
            ${
              serviceStatus === "running" && serviceCpuUsage !== undefined
                ? `
            <div class="service-detail-row">
              <span class="service-detail-label">CPU:</span>
              <span class="service-detail-value">${serviceCpuUsage}%</span>
            </div>
            `
                : ""
            }
            
            ${
              serviceStatus === "running" && serviceMemoryUsage !== undefined
                ? `
            <div class="service-detail-row">
              <span class="service-detail-label">Memory:</span>
              <span class="service-detail-value">${serviceMemoryUsage} MB</span>
            </div>
            `
                : ""
            }
          </div>
          
          <button class="btn btn-outline w-full mt-2 view-details" data-id="${service.id || "unknown"}">
            <i data-lucide="eye" class="icon"></i>
            View Details
          </button>
        </div>
      `

      servicesGrid.appendChild(serviceCard)
    })

    // Initialize icons in the newly created elements
    setTimeout(() => {
      lucide.createIcons()
    }, 0)

    // Add event listeners to view details buttons
    document.querySelectorAll(".view-details").forEach((button) => {
      button.addEventListener("click", () => {
        const serviceId = button.getAttribute("data-id")
        const service = data.services.find((s) => s.id === serviceId)
        if (service) {
          showServiceDetails(service)
        }
      })
    })
  }

  // Update statistics
  const updateStats = (data) => {
    runningCountEl.textContent = data.running_count || 0
    stoppedCountEl.textContent = data.stopped_count || 0
    totalCountEl.textContent = data.total_count || 0

    // Calculate average uptime for running containers
    if (data.services && data.services.length > 0) {
      const runningServices = data.services.filter((s) => s.status === "running")
      if (runningServices.length > 0) {
        // In a real implementation, you would calculate this from actual uptime data
        avgUptimeEl.textContent = "8d"
      } else {
        avgUptimeEl.textContent = "0d"
      }
    } else {
      avgUptimeEl.textContent = "0d"
    }
  }

  // Update last refreshed timestamp
  const updateLastRefreshed = () => {
    const now = new Date()
    lastUpdatedEl.textContent = `Last updated: ${now.toLocaleTimeString()}`
  }

  // Show service details in modal
  const showServiceDetails = (service) => {
    const serviceName = service.name || "Unknown Service"
    const serviceStatus = service.status || "unknown"
    const serviceId = service.id || "unknown"
    const serviceImage = service.image || "unknown"
    const serviceCreated = service.created || ""
    const serviceUptime = service.uptime || "Unknown"
    const servicePorts = service.ports || []
    const serviceCpuUsage = service.cpu_usage
    const serviceMemoryUsage = service.memory_usage
    const serviceNetworkRx = service.network_rx || "0 B"
    const serviceNetworkTx = service.network_tx || "0 B"

    modalTitle.innerHTML = `
      <i data-lucide="server" class="icon-lg"></i>
      ${serviceName}
      <div class="status-indicator">
        <div class="status-dot ${getStatusColor(serviceStatus)}"></div>
        <span class="badge ${getStatusBadge(serviceStatus)}">${serviceStatus}</span>
      </div>
    `

    modalBody.innerHTML = `
      <div class="space-y-6">
        <!-- Basic Information -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <i data-lucide="server" class="icon"></i>
              Basic Information
            </div>
          </div>
          <div class="card-content">
            <div class="grid-cols-2">
              <div>
                <label class="text-sm font-medium text-muted">Container ID</label>
                <p class="code-block mt-1">${serviceId}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-muted">Status</label>
                <div class="flex items-center gap-2 mt-1">
                  <div class="status-dot ${getStatusColor(serviceStatus)}"></div>
                  <span style="text-transform: capitalize; font-weight: 500;">${serviceStatus}</span>
                </div>
              </div>
            </div>

            <div class="separator"></div>

            <div>
              <label class="text-sm font-medium text-muted flex items-center gap-2">
                <i data-lucide="image" class="icon"></i>
                Docker Image
              </label>
              <p class="code-block mt-1">${serviceImage}</p>
            </div>

            <div class="grid-cols-2 mt-2">
              <div>
                <label class="text-sm font-medium text-muted flex items-center gap-2">
                  <i data-lucide="clock" class="icon"></i>
                  Created
                </label>
                <p class="text-sm mt-1">${serviceCreated ? formatDate(serviceCreated) : "Unknown"}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-muted flex items-center gap-2">
                  <i data-lucide="clock" class="icon"></i>
                  Uptime
                </label>
                <p class="text-sm mt-1" style="font-weight: 500;">${serviceUptime}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Network Configuration -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <i data-lucide="network" class="icon"></i>
              Network Configuration
            </div>
          </div>
          <div class="card-content">
            <div>
              <label class="text-sm font-medium text-muted">Port Mappings</label>
              <div class="mt-2 space-y-1">
                ${
                  servicePorts.length > 0
                    ? servicePorts.map((port) => `<div class="code-block">${port}</div>`).join("")
                    : '<p class="text-sm text-muted">No port mappings configured</p>'
                }
              </div>
            </div>
          </div>
        </div>

        ${
          serviceStatus === "running" && (serviceCpuUsage !== undefined || serviceMemoryUsage !== undefined)
            ? `
        <!-- Resource Usage -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <i data-lucide="cpu" class="icon"></i>
              Resource Usage
            </div>
          </div>
          <div class="card-content">
            <div class="grid-cols-2">
              ${
                serviceCpuUsage !== undefined
                  ? `
              <div>
                <label class="text-sm font-medium text-muted flex items-center gap-2">
                  <i data-lucide="cpu" class="icon"></i>
                  CPU Usage
                </label>
                <div class="mt-2">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-2xl text-blue">${serviceCpuUsage}%</span>
                  </div>
                  <div class="progress-container">
                    <div class="progress-bar progress-bar-blue" style="width: ${Math.min(serviceCpuUsage || 0, 100)}%"></div>
                  </div>
                </div>
              </div>
              `
                  : ""
              }

              ${
                serviceMemoryUsage !== undefined
                  ? `
              <div>
                <label class="text-sm font-medium text-muted flex items-center gap-2">
                  <i data-lucide="memory-stick" class="icon"></i>
                  Memory Usage
                </label>
                <div class="mt-2">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-2xl text-green">${serviceMemoryUsage} MB</span>
                  </div>
                  <div class="progress-container">
                    <div class="progress-bar progress-bar-green" style="width: ${Math.min((serviceMemoryUsage || 0) / 10, 100)}%"></div>
                  </div>
                </div>
              </div>
              `
                  : ""
              }
            </div>

            <div class="separator"></div>

            <div>
              <label class="text-sm font-medium text-muted flex items-center gap-2">
                <i data-lucide="arrow-up-down" class="icon"></i>
                Network Traffic
              </label>
              <div class="grid-cols-2 mt-2">
                <div class="flex items-center gap-2">
                  <i data-lucide="arrow-down" class="icon text-blue"></i>
                  <div>
                    <p class="text-xs text-muted">Received</p>
                    <p style="font-weight: 500;">${serviceNetworkRx}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <i data-lucide="arrow-up" class="icon text-green"></i>
                  <div>
                    <p class="text-xs text-muted">Transmitted</p>
                    <p style="font-weight: 500;">${serviceNetworkTx}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        `
            : ""
        }
      </div>
    `

    // Initialize icons in the modal
    lucide.createIcons()

    // Show the modal
    serviceModal.classList.add("active")
  }

  // Start auto-refresh
  const startAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval)
    }
    refreshInterval = setInterval(fetchServices, REFRESH_INTERVAL)
  }

  const stopAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
  }

  // Event listeners
  refreshBtn.addEventListener("click", fetchServices)

  // Handle page visibility for auto-refresh
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAutoRefresh()
    } else {
      startAutoRefresh()
      // Refresh immediately when page becomes visible
      fetchServices()
    }
  })

  // Start auto-refresh
  startAutoRefresh()

  // Initial fetch
  fetchServices()
})
