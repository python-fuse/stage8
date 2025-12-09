# 💰 Wallet Service API

A production-ready digital wallet service built with NestJS, featuring Paystack payment integration, Google OAuth authentication, API key management, and wallet-to-wallet transfers.

## ✨ Features

- **🔐 Authentication**
  - Google OAuth 2.0 sign-in
  - JWT-based session management
  - API key authentication for service-to-service communication
  - Permission-based access control

- **💳 Payments**
  - Paystack payment gateway integration
  - Secure deposit processing with webhook verification
  - Manual transaction verification fallback
  - Transaction status tracking

- **👛 Wallet Management**
  - Auto-generated 13-digit wallet numbers
  - Real-time balance tracking
  - Atomic wallet-to-wallet transfers
  - Comprehensive transaction history

- **🔑 API Key Management**
  - Generate and manage API keys
  - Permission scopes (wallet:read, wallet:write, admin)
  - Configurable expiry (1H, 1D, 1M, 1Y)
  - Key rollover support
  - 5 active keys per user limit

- **📚 Documentation**
  - Interactive Swagger/OpenAPI documentation
  - Complete API examples
  - Authentication schemes documented

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm (or npm/yarn)
- Docker & Docker Compose
- Paystack account
- Google OAuth credentials

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd stage8

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Start database
docker compose up -d

# Run application
pnpm run start:dev
```

### Access Points

- **API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/health

## 📖 Documentation

- [Deployment Guide](DEPLOYMENT.md) - Production deployment instructions
- [API Documentation](http://localhost:3000/api) - Interactive Swagger docs

## 🏗️ Architecture

### Tech Stack

- **Framework**: NestJS 11.x
- **Language**: TypeScript
- **Database**: PostgreSQL 15
- **ORM**: TypeORM
- **Authentication**: Passport.js (Google OAuth, JWT, API Key)
- **Payment**: Paystack API
- **Documentation**: Swagger/OpenAPI
- **Container**: Docker

### Database Schema

```
users
├── id (uuid, PK)
├── email (unique)
├── googleId (unique)
├── name
└── timestamps

wallets
├── id (uuid, PK)
├── userId (FK → users.id)
├── walletNumber (13 digits, unique)
├── balance (decimal)
└── timestamps

transactions
├── id (uuid, PK)
├── walletId (FK → wallets.id)
├── type (deposit, transfer_in, transfer_out)
├── amount (decimal)
├── status (pending, completed, failed)
├── reference (unique)
├── recipientWalletId (FK → wallets.id, nullable)
├── metadata (jsonb)
└── timestamps

api_keys
├── id (uuid, PK)
├── userId (FK → users.id)
├── name
├── keyHash (sha256)
├── permissions (array)
├── expiresAt
└── timestamps
```

## 🔑 API Authentication

### Option 1: JWT (User Authentication)

```bash
# 1. Sign in with Google
GET /auth/google
# Redirects to Google → callback → returns JWT

# 2. Use JWT in requests
curl -H "Authorization: Bearer <your-jwt-token>" \
  http://localhost:3000/wallet/balance
```

### Option 2: API Key (Service Authentication)

```bash
# 1. Create API key (requires JWT first)
curl -X POST http://localhost:3000/keys/create \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Service",
    "permissions": ["wallet:read", "wallet:write"],
    "expiry": "1M"
  }'
# Returns: { "key": "sk_live_...", ... }

# 2. Use API key in requests
curl -H "x-api-key: sk_live_your-api-key" \
  http://localhost:3000/wallet/balance
```

## 📡 Core API Endpoints

### Authentication

```
GET  /auth/google           # Initiate Google OAuth
GET  /auth/google/callback  # OAuth callback
POST /auth/login            # Exchange code for JWT
```

### Wallets

```
GET  /wallet/balance                    # Get wallet balance
POST /wallet/deposit                    # Initiate deposit
POST /wallet/deposit/:reference/verify  # Verify deposit
GET  /wallet/deposit/:reference/status  # Check deposit status
POST /wallet/transfer                   # Transfer to another wallet
GET  /wallet/transactions               # Get transaction history
```

### API Keys

```
POST   /keys/create    # Create new API key
POST   /keys/rollover  # Rollover expired key
GET    /keys           # List user's API keys
DELETE /keys/:id       # Revoke API key
```

### Webhooks (Public)

```
POST /wallet/paystack/webhook  # Paystack payment webhook
```

## 💻 Development

### Project setup

```bash
$ pnpm install
```

### Running the app

```bash
# Development with watch mode
$ pnpm run start:dev

# Production mode
$ pnpm run start:prod
```

### Database

```bash
# Start PostgreSQL
$ docker compose up -d

# Stop database
$ docker compose down

# View logs
$ docker compose logs -f
```

### Testing

```bash
# Unit tests
$ pnpm run test

# E2E tests
$ pnpm run test:e2e

# Test coverage
$ pnpm run test:cov
```

## 🧪 Testing the API

### Using Swagger UI

1. Start the application: `pnpm run start:dev`
2. Open browser: http://localhost:3000/api
3. Click "Authorize" button
4. Test authentication:
   - Visit `/auth/google` to sign in
   - Copy JWT token from callback
   - Enter token in Swagger UI
5. Test endpoints directly in browser

### Using cURL

```bash
# 1. Health check
curl http://localhost:3000/health

# 2. Initiate Google login (use browser)
open http://localhost:3000/auth/google

# 3. Get wallet balance
curl -H "Authorization: Bearer <your-jwt>" \
  http://localhost:3000/wallet/balance

# 4. Initiate deposit
curl -X POST http://localhost:3000/wallet/deposit \
  -H "Authorization: Bearer <your-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000}'

# 5. Transfer funds
curl -X POST http://localhost:3000/wallet/transfer \
  -H "Authorization: Bearer <your-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientWalletNumber": "1234567890123",
    "amount": 1000
  }'
```

## 🔒 Security Features

- **Authentication**: Multi-strategy (OAuth, JWT, API Key)
- **Authorization**: Permission-based access control
- **HTTPS**: SSL/TLS encryption in production
- **Rate Limiting**: Configured in nginx (10 req/s with burst)
- **Input Validation**: Class-validator on all DTOs
- **SQL Injection**: Protected by TypeORM parameterized queries
- **XSS Protection**: Sanitized inputs, security headers
- **CORS**: Configurable origin whitelist
- **Webhook Security**: HMAC SHA512 signature verification
- **API Key Hashing**: SHA-256 hashed storage
- **Transaction Atomicity**: Database transactions for transfers

## 📊 Transaction Flow

### Deposit Flow

```
1. User initiates deposit → POST /wallet/deposit
2. System creates pending transaction
3. Paystack returns payment URL
4. User completes payment on Paystack
5. Paystack sends webhook → POST /wallet/paystack/webhook
6. System verifies signature, credits wallet atomically
7. Transaction status updated to 'completed'

Fallback: Manual verification via GET /wallet/deposit/:reference/verify
```

### Transfer Flow

```
1. User initiates transfer → POST /wallet/transfer
2. System validates recipient wallet exists
3. System checks sender has sufficient balance
4. Atomic transaction begins (QueryRunner)
5. Debit sender wallet
6. Credit recipient wallet
7. Create two transaction records (transfer_out, transfer_in)
8. Commit transaction
9. Rollback on any failure
```

## 🌐 Environment Variables

### Required

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5433
DATABASE_USER=wallet_user
DATABASE_PASSWORD=wallet_password
DATABASE_NAME=wallet_db

# JWT
JWT_SECRET=your-secret-min-32-chars

# Google OAuth
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Paystack
PAYSTACK_SECRET_KEY=sk_test_your-secret-key

# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
```

### Optional

```env
LOG_LEVEL=debug
DATABASE_LOGGING=true
```

## 🐛 Troubleshooting

### Common Issues

**Port 5432 already in use**

```bash
# Use different port (configured in compose.yml)
DATABASE_PORT=5433
```

**JWT token expired**

```bash
# Sign in again via /auth/google
```

**Paystack webhook not received**

```bash
# Use manual verification
GET /wallet/deposit/:reference/verify
```

**Database connection refused**

```bash
# Ensure Docker is running
docker compose ps
docker compose up -d
```

**Amount mismatch errors**

```bash
# Ensure amounts are in kobo (₦1 = 100 kobo)
# System handles conversion automatically
```

## 🚀 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete production deployment guide.

Quick deploy:

```bash
docker compose -f compose.prod.yml up -d --build
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👥 Support

- Documentation: http://localhost:3000/api
- Issues: Create GitHub issue

## 🎯 Roadmap

- [x] Google OAuth authentication
- [x] JWT session management
- [x] API key system with permissions
- [x] Paystack deposit integration
- [x] Wallet-to-wallet transfers
- [x] Transaction history
- [x] Swagger documentation
- [x] Docker deployment
- [ ] Withdrawals to bank accounts
- [ ] Transaction receipts (PDF)
- [ ] Email notifications
- [ ] Two-factor authentication
- [ ] Admin dashboard
- [ ] Analytics and reporting

---

Built with ❤️ using NestJS
