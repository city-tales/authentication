# Docker Setup Guide

This document explains the Docker configuration for the Authentication Service, including the purpose of each component and how they work together.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Port Configuration](#port-configuration)
- [Docker Compose](#docker-compose)
- [Health Checks](#health-checks)
- [Environment Variables](#environment-variables)
- [Building and Running](#building-and-running)

## Architecture Overview

The Authentication Service uses a multi-port architecture to handle different types of traffic:

1. **HTTP Server (Port 2221)**: Handles HTTP/1.1 traffic for REST API endpoints
2. **gRPC Server (Port 5051)**: Handles gRPC (HTTP/2) traffic for internal service communication

## Port Configuration

### Why Two Ports?

1. **Separation of Concerns**:
    - **Port 2221 (HTTP)**: For external API communication (REST)
    - **Port 5051 (gRPC)**: For internal service-to-service communication

2. **Protocol Differences**:
    - HTTP/1.1 (Port 2221): Better for browser-based clients and external APIs
    - HTTP/2 (Port 5051): Better for internal microservice communication (lower latency, multiplexing)

3. **Security**:
    - Different security requirements for external vs internal traffic
    - Ability to expose only necessary ports to the outside world

## Docker Compose

The `docker-compose.yml` file defines how the Authentication Service runs in a containerized environment:

```yaml
services:
    auth:
        build:
            context: .
            dockerfile: Dockerfile
            args:
                NODE_VERSION: "20.19.2"
        image: city-tales/authentication:latest
        env_file:
            - ./.env
        environment:
            - NODE_ENV=production
            - HOST=0.0.0.0
            - GRPC_PORT=5051
        ports:
            - "2221:2221" # HTTP port
            - "5051:5051" # gRPC port
        restart: unless-stopped
        platform: linux/arm64
```

### Key Components:

1. **Build Configuration**:
    - Uses Node.js 20.19.2
    - ARM64 platform support (for M1/M2 Macs)

2. **Networking**:
    - Exposes both HTTP and gRPC ports
    - Uses host networking for better performance

3. **Health Checks**:
    - Monitors gRPC service health
    - Automatically restarts unhealthy containers

4. **Environment**:
    - Loads variables from `.env` file
    - Sets production mode by default

## Basic Commands

### Building the Docker Image

```bash
docker compose up -d --build
```

### Running the Service

```bash
docker compose up
```

### Stopping the Service

```bash
docker compose down
```

## Troubleshooting

1. **Port Conflicts**:
    - Ensure ports 2221 and 5051 are not in use
    - Check with: `lsof -i :2221,5051`

2. **Container Fails to Start**:
    - Check logs: `docker compose logs auth`
    - Verify environment variables are set correctly

3. **Service Failures**:
    - Ensure the gRPC server is starting correctly
    - Check for errors in the container logs

## Best Practices

1. **Security**:
    - Never commit sensitive data to version control
    - Use Docker secrets for production credentials
    - Limit exposed ports to only what's necessary

2. **Performance**:
    - Use `.dockerignore` to exclude unnecessary files
    - Leverage Docker layer caching for faster builds
    - Consider resource limits in production

3. **Development**:
    - Use volume mounts for live reloading
    - Configure proper logging for debugging
    - Set up proper health checks for all services
