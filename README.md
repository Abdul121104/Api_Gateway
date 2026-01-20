---

# API Gateway & Analytics Platform

A production-oriented API Gateway built with Node.js that supports authentication, dynamic routing, rate limiting, caching, asynchronous logging, and analytics aggregation.
The system is designed with scalability, performance, and observability in mind.

---

## Overview

This project implements a simplified API Management platform similar in spirit to Kong or AWS API Gateway.
It allows users to register backend services, route traffic dynamically, protect APIs using keys, enforce rate limits, cache responses, and analyze traffic patterns.

The gateway is built as a modular backend system with clear separation of concerns and asynchronous processing where required.

---

## Key Features

### Authentication & Authorization

* JWT-based authentication for users
* User-scoped resources (clients, routes, analytics)
* Secure access to management APIs

### API Clients & Keys

* Secure API key generation
* Hashed API key storage
* Key revocation and activation control
* Client ownership enforced per user

### Dynamic Routing & Proxy

* Runtime route registration
* Longest prefix path matching
* Method-based routing
* Transparent request forwarding
* Preserves headers, query params, and request body

### Rate Limiting

* Redis-backed rate limiting
* Per-client limits
* Sliding window / token bucket style enforcement
* Proper HTTP 429 handling with Retry-After headers

### Response Caching

* Redis-based caching for GET requests
* TTL-based expiration
* Cache key based on method, path, and query
* Cache invalidation on write operations
* Cache hit/miss visibility via headers

### Asynchronous Logging

* Non-blocking request logging using BullMQ
* Redis-backed queue
* Separate worker process
* Resilient to worker downtime
* Gateway remains unaffected by logging failures

### Analytics & Metrics

* MongoDB aggregation pipelines
* Time-window based analytics
* Per-client and per-route metrics
* Error rates, request volume, latency statistics
* Fully scoped to authenticated user

---

## Architecture

```
Client
  |
  |  HTTP Request
  v
API Gateway
  ├── JWT Authentication
  ├── API Key Validation
  ├── Rate Limiting (Redis)
  ├── Cache Check (Redis)
  ├── Dynamic Route Matching
  ├── Proxy to Target Service
  ├── Cache Response (GET only)
  └── Enqueue Log Job (BullMQ)
              |
              v
        Logging Worker
              |
              v
          MongoDB
```

---

## Tech Stack

* **Node.js** – Core runtime
* **Express.js** – HTTP server
* **MongoDB** – Persistent storage
* **Redis** – Rate limiting, caching, queues
* **BullMQ** – Asynchronous job processing
* **JWT** – Authentication
* **Axios / HTTP Proxy** – Request forwarding

---

## Project Structure

```
backend/
├── controllers/
├── models/
├── routes/
├── services/
├── middleware/
├── queues/
├── workers/
├── tests/
├── server.js
└── package.json
```

---

## Setup Instructions

### Prerequisites

* Node.js (v18+)
* MongoDB
* Redis

### Installation

```bash
git clone https://github.com/Abdul121104/Api_Gateway.git
cd Api_Gateway/backend
npm install
```

### Environment Variables

Create a `.env` file:

```
PORT=3000
MONGO_URI=mongodb://localhost:27017/api-gateway
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_secret
```

### Run Gateway

```bash
npm run dev
```

### Run Logging Worker

```bash
npm run worker
```

---

## API Overview

### Authentication

* `POST /api/auth/register`
* `POST /api/auth/login`

### API Clients

* `POST /api/clients`
* `GET /api/clients`
* `DELETE /api/clients/:id`

### Routes

* `POST /api/routes`
* `GET /api/routes`
* `DELETE /api/routes/:id`

### Gateway Proxy

* `ALL /*` (secured using `x-api-key`)

### Analytics

* `GET /api/analytics/overview`
* `GET /api/analytics/routes`
* `GET /api/analytics/clients`

All management APIs require JWT authentication.

---

## Testing

The project includes scripted tests for:

* API client lifecycle
* Dynamic routing
* Rate limiting behavior
* Cache hit/miss validation
* Async logging correctness
* Analytics aggregation

Tests simulate real gateway traffic and validate system behavior end-to-end.

---

## Design Decisions

* **Asynchronous logging** ensures request latency is unaffected by analytics.
* **Redis** is used for rate limiting and caching due to low latency requirements.
* **MongoDB aggregation pipelines** handle analytics efficiently at scale.
* **User-scoped data access** prevents cross-tenant data leakage.
* **Separation of gateway and worker** mirrors real-world production systems.

---

## Future Improvements

* API key rotation
* Route-level timeouts and retries
* Circuit breaker support
* Distributed tracing
* Dashboard UI
* Dockerized deployment
* CI/CD pipeline

---

## Author

Abdul Rahman

---
