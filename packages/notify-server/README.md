# Cinacoin Notify Server

A notification push system for dApp notifications, wallet alerts, and transaction status updates.

## Features
- Subscribe/unsubscribe to notification channels
- Rate limiting per user
- Notification deduplication
- History query with pagination
- Integration with push-server

## API Endpoints
- POST /v1/subscribe
- DELETE /v1/unsubscribe
- POST /v1/notify
- GET /v1/history
- GET /v1/health
- GET /v1/metrics
