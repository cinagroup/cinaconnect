# @cinacoin/push-server

Push notification server for Cinacoin — APNs, FCM, and retry handling.

## Installation

This is a server package. Clone the repo and run:

```bash
cd packages/push-server
npm install
npm run build
```

## Usage

```bash
npm start
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `PushHandler` | class | Main push notification handler |
| `ApnsClient` | class | Apple Push Notification client |
| `FcmClient` | class | Firebase Cloud Messaging client |
| `DeliveryManager` | class | Message delivery manager |
| `RetryManager` | class | Retry logic for failed sends |
| `RateLimiter` | class | Rate limiting |
| `PushConfig` | type | Server configuration |
| `PushNotification` | type | Notification payload type |
