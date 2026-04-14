# Multi-Vendor E-Commerce Platform

A full-stack multivendor marketplace built with a microservices architecture using Node.js, Express, React, and MongoDB. The platform supports three distinct user roles (buyer, seller, admin) with OAuth2 authentication, escrow-based payments, real-time messaging, and an AI-powered shopping assistant.

## Architecture Overview

The platform follows a **split-flow architecture**: order and payment flow goes through the marketplace, while physical goods ship directly from seller to buyer. The marketplace controls the money and information but never touches the product.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         REACT FRONTEND                              │
│         Buyer Flow  │  Seller Dashboard  │  Admin Analytics         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY (:3000)                          │
│     JWT Validation │ Scope Enforcement │ Rate Limiting │ Routing    │
└──┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬─────────┘
   │      │      │      │      │      │      │      │      │
   ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼
┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐
│ Auth ││Catalog││Seller││ Inv. ││Order ││ Pay  ││ Ship ││Review││Search│
│:4001 ││:4003 ││:4002 ││:4004 ││:4005 ││:4006 ││:4007 ││:4008 ││:4010 │
└──────┘└──────┘└──────┘└──────┘└──────┘└──────┘└──────┘└──────┘└──────┘

┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Messaging│  │  Notify  │  │Analytics │  │   Chat   │
│  :4009   │  │  :4012   │  │  :4011   │  │  :4013   │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

Each service owns its own MongoDB database — no service reads or writes another service's database directly.

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Node.js 20 LTS | All microservices |
| Web Framework | Express.js | REST APIs and middleware |
| Database | MongoDB 7 + Mongoose | Per-service databases, text indexes |
| Auth | jsonwebtoken, bcrypt | JWT signing, password hashing, OAuth2 |
| Real-time | ws (WebSocket) | Messaging service push delivery |
| Rate Limiting | express-rate-limit | Per-client API throttling at gateway |
| Email | Nodemailer | Transactional notifications |
| Frontend | React 18 | Single-page application |
| Containerization | Docker + docker-compose | Multi-service local orchestration |
| Search | MongoDB text index | Full-text search on products |

## Microservices (13 Total)

### Buyer-Facing Services
| Service | Port | Responsibilities |
|---|---|---|
| Auth Service | 4001 | OAuth2 authorization code flow, JWT issuance, refresh token rotation, scope validation |
| Catalog Service | 4003 | Product browsing, CRUD, search, filtering by category/price/rating |
| Order Service | 4005 | Multi-seller cart, order lifecycle state machine, event emission |
| Payment Service | 4006 | Escrow hold on order placed, split payout per seller on delivery |
| Chat Service | 4013 | AI shopping assistant — answers order, tracking, payment queries using real order data |

### Seller-Facing Services
| Service | Port | Responsibilities |
|---|---|---|
| Seller Service | 4002 | Seller registration, store profile, dashboard stats |
| Inventory Service | 4004 | Stock levels, atomic reservation on order.placed, release on cancellation |
| Shipping Service | 4007 | Shipment creation, carrier tracking, status webhook endpoint |
| Review Service | 4008 | Verified-purchase gate, moderation queue (pending/approved/flagged) |

### Platform Services
| Service | Port | Responsibilities |
|---|---|---|
| Messaging Service | 4009 | Buyer-seller threaded chat via WebSocket, scoped to product/order |
| Notification Service | 4012 | Email on order confirmation, shipment update, low stock, payout |
| Analytics Service | 4011 | Revenue by day, top products, top sellers, admin dashboard |
| Search Service | 4010 | Full-text search on title + description, faceted filtering, relevance ranking |

### API Gateway
| Service | Port | Responsibilities |
|---|---|---|
| API Gateway | 3000 | JWT validation, scope enforcement, rate limiting, request routing, error formatting |

## Authentication & Authorization

### OAuth2 Authorization Code Flow
The platform implements the full OAuth2 authorization code flow:

1. `GET /auth/authorize` — Client redirects with `response_type=code`, `client_id`, `scope`, `redirect_uri`
2. Server validates credentials and checks scopes against user role
3. `GET /callback?code=...` — Short-lived authorization code returned to redirect_uri (5-min expiry)
4. `POST /auth/token` — Exchange code + client_secret for access_token and refresh_token
5. All routes — API Gateway decodes JWT, enforces scope, returns 403 on mismatch

### Refresh Token Rotation
- Each refresh token is single-use with replay attack detection
- On rotation, the old token is marked `used` and a new token is issued
- 7-day refresh token TTL, 24-hour access token TTL

### Roles and Scopes
| Role | Scopes | Notes |
|---|---|---|
| Buyer | catalog:read, orders:create, orders:read, reviews:write, messages:read+write | reviews:write requires verified delivery |
| Seller | catalog:write, inventory:write, orders:fulfil, shipping:write, analytics:read | analytics:read scoped to own store |
| Admin | orders:\*, sellers:\*, payments:\*, reviews:moderate, analytics:\* | Full platform access |

### JWT Payload
```json
{
  "sub": "userId123",
  "role": "seller",
  "storeId": "storeXYZ",
  "scopes": ["catalog:write", "inventory:write"],
  "exp": 1715000000
}
```

The `storeId` claim enforces resource ownership — inventory and catalog endpoints validate that the requested resource belongs to the token's storeId.

## Order Lifecycle

```
pending → paid → processing → shipped → delivered
   │                                        │
   └──── cancelled                          └──→ review unlocked
```

### Event Chain for a Single Order
| Event | Services That React |
|---|---|
| order.placed | Payment (hold escrow), Inventory (reserve stock), Notification (confirm to buyer) |
| payment.captured | Order service (advance to processing), Seller service (alert seller) |
| shipment.created | Order service (advance to shipped), Notification (alert buyer with tracking) |
| shipment.delivered | Order service (advance to delivered), Payment (release escrow), Review (unlock for buyer) |
| review.approved | Catalog service (recompute product.avgRating) |
| inventory.stock_low | Notification (alert seller), Analytics (log event) |

## Payment System

The platform uses an **escrow model**:
- On `order.placed`: full amount is held in escrow
- A single order may contain items from multiple sellers
- On `shipment.delivered`: each seller's portion is released separately
- On `order.cancelled`: full refund from escrow

## MongoDB Schemas

### Products (Catalog Service)
`_id`, `sellerId`, `storeId`, `title`, `description`, `category`, `price` (cents), `images`, `attributes` (flexible Map), `avgRating`, `status` (active/paused/deleted)

### Orders (Order Service)
`_id`, `buyerId`, `items[]` (productId, sellerId, qty, price), `status`, `shippingAddress`, `timeline[]` (status + timestamp), `totalAmount`, `createdAt`

### Inventory (Inventory Service)
`_id`, `productId`, `sellerId`, `storeId`, `quantity`, `reserved`, `lowStockThreshold`, `updatedAt`

### Reviews (Review Service)
`_id`, `productId`, `buyerId`, `orderId` (verified purchase), `rating` (1-5), `body`, `status` (pending/approved/flagged), `createdAt`

### Shipments (Shipping Service)
`_id`, `orderId`, `sellerId`, `carrier`, `trackingNumber`, `status` (created/in_transit/out_for_delivery/delivered), `estimatedDelivery`, `updatedAt`

### Messages (Messaging Service)
`_id`, `threadId`, `senderId`, `recipientId`, `productId`, `body`, `readAt`, `createdAt`

## React Frontend

### Buyer Flow
- Browse products with search and filtering
- Product detail page with reviews
- Shopping cart with multi-seller support
- Checkout with order placement and payment
- Order tracking with status timeline
- AI chat assistant for order queries

### Seller Flow
- Store registration and profile management
- Product management (add, edit, delete)
- Order management with Ship Now functionality
- Dashboard with revenue and order stats

### Admin Flow
- Analytics dashboard with real-time data
- Total GMV, orders, active sellers, pending reviews
- Daily revenue chart
- Top products and top sellers

## Getting Started

### Prerequisites
- Node.js 20+
- MongoDB 7+ (or Docker)
- npm

### Quick Start with Docker

```bash
# Start MongoDB
docker run --name mongodb -p 27017:27017 -d mongo:latest

# Clone and install
git clone <repo-url>
cd multivendor

# Install dependencies for all services
npm install                          # root dependencies
cd auth-service && npm install && cd ..
cd seller-service && npm install && cd ..
cd catalog-service && npm install && cd ..
cd inventory-service && npm install && cd ..
cd order-service && npm install && cd ..
cd payment-service && npm install && cd ..
cd shipping-service && npm install && cd ..
cd review-service && npm install && cd ..
cd messaging-service && npm install && cd ..
cd search-service && npm install && cd ..
cd analytics-service && npm install && cd ..
cd notification-service && npm install && cd ..
cd chat-service && npm install && cd ..
cd frontend && npm install && cd ..

# Start all services
start-all.bat          # Windows
# OR start each service individually:
# cd <service-name> && node index.js

# Start frontend
cd frontend && npm start
```

### Environment Variables
Each service has its own `.env` file. Required variables:
```
PORT=<service-port>
MONGO_URI=mongodb://localhost:27017/<service-db>
JWT_SECRET=super-secret-change-me    # Must match across all services
```

## Inter-Service Communication

Services communicate via:
- **Synchronous REST** — Direct HTTP calls for queries and commands
- **In-process Event Bus** — EventEmitter-based pub/sub within each service
- **HTTP Event Relay** — Cross-service event delivery via HTTP POST

The event bus interface is abstracted so it can be swapped for RabbitMQ or Kafka without changing any service code.

## Project Structure

```
multivendor/
├── api-gateway/           # Central entry point, JWT + rate limiting
├── auth-service/          # OAuth2, JWT, refresh tokens
├── catalog-service/       # Product CRUD, text search
├── seller-service/        # Store registration, profiles
├── inventory-service/     # Stock management, reservations
├── order-service/         # Order state machine
├── payment-service/       # Escrow payments
├── shipping-service/      # Shipment tracking
├── review-service/        # Verified purchase reviews
├── messaging-service/     # WebSocket chat
├── notification-service/  # Email notifications
├── analytics-service/     # Admin dashboards
├── search-service/        # Full-text search
├── chat-service/          # AI shopping assistant
├── shared/                # Common middleware, utils, event bus
│   ├── middleware/         # auth.js, errorHandler.js
│   ├── events/            # eventBus.js
│   └── utils/             # apiError.js
├── frontend/              # React SPA
├── docker-compose.yml
└── start-all.bat
```

## Demo Flow

### Buyer Journey
1. Register as buyer → Browse products → Add to cart
2. Checkout → Order created → Payment captured (escrow)
3. Track order status updates
4. Receive delivery → Leave verified review
5. Chat with AI assistant about orders

### Seller Journey
1. Register as seller → Create store → Add products
2. View incoming orders → Ship order with tracking
3. Monitor dashboard stats and revenue

### Admin Journey
1. Login as admin → View platform analytics
2. Monitor GMV, orders, top sellers, top products
3. Review moderation queue
