# Vehicle Rental Marketplace — Architecture

## System Overview

A microservices-based vehicle rental platform enabling users to rent
cars, bikes, scooters, vans, SUVs, and trucks for self-drive use.

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENTS                               │
│   (Web App · Mobile App · Admin Dashboard)                   │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTPS
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                    API GATEWAY (:3000)                        │
│   Rate Limiting · JWT Validation · Request Routing           │
└──────────┬───────────┬───────────┬───────────┬──────────────┘
           │           │           │           │
     ┌─────▼─────┐ ┌──▼──────┐ ┌─▼────────┐ ┌▼──────────┐
     │   Auth    │ │ Vehicle │ │ Booking  │ │ Payment  │
     │  :3001   │ │  :3002  │ │  :3003   │ │  :3004   │
     └──────────┘ └─────────┘ └──────────┘ └──────────┘
     ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐
     │ Tracking │ │  Notif  │ │   Chat   │ │    AI    │
     │  :3005   │ │  :3006  │ │  :3007   │ │  :3008   │
     └──────────┘ └─────────┘ └──────────┘ └──────────┘
     ┌──────────┐ ┌─────────┐
     │  Admin   │ │   ML    │ (Python/FastAPI :8000)
     │  :3009   │ └─────────┘
     └──────────┘
           │
     ┌─────▼─────────────────────────────────────────────┐
     │              DATA STORES                           │
     │  MongoDB (primary) · Redis (cache/sessions)       │
     │  RabbitMQ (async messaging)                        │
     └───────────────────────────────────────────────────┘
```

## Service Responsibilities

| Service      | Port | Responsibility                                    |
|-------------|------|---------------------------------------------------|
| Gateway     | 3000 | Routing, rate limiting, JWT validation             |
| Auth        | 3001 | Login, register, OTP, Google OAuth, sessions       |
| Vehicle     | 3002 | CRUD listings, search, availability, approval      |
| Booking     | 3003 | Create/cancel bookings, inspections, lifecycle     |
| Payment     | 3004 | Stripe/PayHere, refunds, owner payouts             |
| Tracking    | 3005 | GPS tracking, geofencing, live location via WS     |
| Notification| 3006 | Push (FCM), email, SMS, WhatsApp, in-app           |
| Chat        | 3007 | Real-time messaging via Socket.IO                  |
| AI          | 3008 | Proxy to ML service, caching predictions           |
| Admin       | 3009 | Dashboard APIs, KYC review, dispute management     |
| ML          | 8000 | Pricing, fraud detection, demand forecasting       |

## Data Flow

1. **Booking Flow**: Client → Gateway → Booking Service → Payment Service → Notification Service
2. **Vehicle Search**: Client → Gateway → Vehicle Service → Redis Cache
3. **Live Tracking**: Client → Gateway (WS) → Tracking Service → Redis (location) → MongoDB (logs)
4. **Chat**: Client → Gateway (WS) → Chat Service → MongoDB (messages) → Notification Service
5. **KYC**: Client → Gateway → Auth Service → Admin Service (review queue)

## Tech Stack

- **Runtime**: Node.js 20 (TypeScript)
- **Framework**: Express.js
- **Database**: MongoDB 7 (Mongoose ODM)
- **Cache/Sessions**: Redis 7
- **Message Queue**: RabbitMQ 3
- **ML**: Python 3.11 / FastAPI
- **Frontend**: Next.js 14 / React 18 / Tailwind CSS
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions
