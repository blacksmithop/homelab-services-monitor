"""
FastAPI Backend for Docker Services Monitor

This script provides a REST API to fetch Docker container information
using the Docker SDK for Python.

Requirements:
- pip install fastapi uvicorn docker python-multipart

To run:
uvicorn main:app --reload --port 8000

API Endpoints:
- GET /docker-services: Returns list of all Docker containers with their details
- GET /health: Health check endpoint
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
import docker
from datetime import datetime, timezone
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Docker Services Monitor API",
    description="REST API for monitoring Docker containers",
    version="1.0.0"
)

# Add CORS middleware to allow requests from Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_docker_client():
    """Initialize Docker client with error handling"""
    try:
        client = docker.from_env()
        # Test connection
        client.ping()
        return client
    except docker.errors.DockerException as e:
        logger.error(f"Failed to connect to Docker: {e}")
        raise HTTPException(
            status_code=503, 
            detail="Unable to connect to Docker daemon. Make sure Docker is running."
        )

def format_uptime(created_timestamp: str) -> str:
    """Calculate and format container uptime"""
    try:
        created_time = datetime.fromisoformat(created_timestamp.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        uptime_delta = now - created_time
        
        days = uptime_delta.days
        hours, remainder = divmod(uptime_delta.seconds, 3600)
        minutes, _ = divmod(remainder, 60)
        
        if days > 0:
            return f"{days} days, {hours} hours"
        elif hours > 0:
            return f"{hours} hours, {minutes} minutes"
        else:
            return f"{minutes} minutes"
    except Exception as e:
        logger.warning(f"Error calculating uptime: {e}")
        return "Unknown"

def format_bytes(bytes_value: int) -> str:
    """Convert bytes to human readable format"""
    if bytes_value == 0:
        return "0 B"
    
    units = ['B', 'KB', 'MB', 'GB', 'TB']
    unit_index = 0
    size = float(bytes_value)
    
    while size >= 1024 and unit_index < len(units) - 1:
        size /= 1024
        unit_index += 1
    
    return f"{size:.1f} {units[unit_index]}"

def get_container_stats(container) -> Dict[str, Any]:
    """Get container resource usage statistics"""
    try:
        if container.status != 'running':
            return {
                'cpu_usage': 0,
                'memory_usage': 0,
                'network_rx': '0 B',
                'network_tx': '0 B'
            }
        
        # Get container stats (non-blocking)
        stats = container.stats(stream=False)
        
        # Calculate CPU usage percentage
        cpu_usage = 0
        if 'cpu_stats' in stats and 'precpu_stats' in stats:
            cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                       stats['precpu_stats']['cpu_usage']['total_usage']
            system_delta = stats['cpu_stats']['system_cpu_usage'] - \
                          stats['precpu_stats']['system_cpu_usage']
            
            if system_delta > 0:
                cpu_usage = (cpu_delta / system_delta) * \
                           len(stats['cpu_stats']['cpu_usage']['percpu_usage']) * 100
        
        # Get memory usage in MB
        memory_usage = 0
        if 'memory_stats' in stats and 'usage' in stats['memory_stats']:
            memory_usage = stats['memory_stats']['usage'] / (1024 * 1024)  # Convert to MB
        
        # Get network statistics
        network_rx = network_tx = 0
        if 'networks' in stats:
            for interface_stats in stats['networks'].values():
                network_rx += interface_stats.get('rx_bytes', 0)
                network_tx += interface_stats.get('tx_bytes', 0)
        
        return {
            'cpu_usage': round(cpu_usage, 1),
            'memory_usage': round(memory_usage, 1),
            'network_rx': format_bytes(network_rx),
            'network_tx': format_bytes(network_tx)
        }
    
    except Exception as e:
        logger.warning(f"Error getting container stats: {e}")
        return {
            'cpu_usage': 0,
            'memory_usage': 0,
            'network_rx': '0 B',
            'network_tx': '0 B'
        }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        client = get_docker_client()
        return {
            "status": "healthy",
            "docker_version": client.version()['Version'],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/docker-services")
async def get_docker_services():
    """Get all Docker containers with their details"""
    try:
        client = get_docker_client()
        containers = client.containers.list(all=True)  # Include stopped containers
        
        services = []
        
        for container in containers:
            try:
                # Get container attributes
                attrs = container.attrs
                
                # Extract port mappings
                ports = []
                if attrs.get('NetworkSettings', {}).get('Ports'):
                    for container_port, host_bindings in attrs['NetworkSettings']['Ports'].items():
                        if host_bindings:
                            for binding in host_bindings:
                                host_port = binding.get('HostPort', '')
                                if host_port:
                                    ports.append(f"{host_port}:{container_port}")
                        else:
                            ports.append(container_port)
                
                # Get container stats
                stats = get_container_stats(container)
                
                # Build service info
                service_info = {
                    'id': container.short_id,
                    'name': container.name,
                    'status': container.status,
                    'image': attrs['Config']['Image'],
                    'created': attrs['Created'],
                    'uptime': format_uptime(attrs['Created']) if container.status == 'running' else '0 minutes',
                    'ports': ports,
                    **stats
                }
                
                services.append(service_info)
                
            except Exception as e:
                logger.error(f"Error processing container {container.name}: {e}")
                continue
        
        return {
            'services': services,
            'total_count': len(services),
            'running_count': len([s for s in services if s['status'] == 'running']),
            'stopped_count': len([s for s in services if s['status'] == 'exited']),
            'timestamp': datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/docker-services/{container_id}")
async def get_docker_service_details(container_id: str):
    """Get detailed information for a specific container"""
    try:
        client = get_docker_client()
        
        try:
            container = client.containers.get(container_id)
        except docker.errors.NotFound:
            raise HTTPException(status_code=404, detail="Container not found")
        
        attrs = container.attrs
        stats = get_container_stats(container)
        
        # Extract detailed information
        detailed_info = {
            'id': container.id,
            'short_id': container.short_id,
            'name': container.name,
            'status': container.status,
            'image': attrs['Config']['Image'],
            'created': attrs['Created'],
            'started': attrs.get('State', {}).get('StartedAt', ''),
            'finished': attrs.get('State', {}).get('FinishedAt', ''),
            'uptime': format_uptime(attrs['Created']) if container.status == 'running' else '0 minutes',
            'restart_count': attrs.get('RestartCount', 0),
            'platform': attrs.get('Platform', 'unknown'),
            'architecture': attrs.get('Architecture', 'unknown'),
            'environment': attrs.get('Config', {}).get('Env', []),
            'command': attrs.get('Config', {}).get('Cmd', []),
            'working_dir': attrs.get('Config', {}).get('WorkingDir', ''),
            'ports': [],
            **stats
        }
        
        # Extract detailed port mappings
        if attrs.get('NetworkSettings', {}).get('Ports'):
            for container_port, host_bindings in attrs['NetworkSettings']['Ports'].items():
                port_info = {'container_port': container_port, 'host_bindings': []}
                if host_bindings:
                    for binding in host_bindings:
                        port_info['host_bindings'].append({
                            'host_ip': binding.get('HostIp', '0.0.0.0'),
                            'host_port': binding.get('HostPort', '')
                        })
                detailed_info['ports'].append(port_info)
        
        return detailed_info
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting container details: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    print("Starting Docker Services Monitor API...")
    print("API will be available at: http://localhost:8000")
    print("API documentation at: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
