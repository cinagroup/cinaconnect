# Troubleshooting

> Common issues and solutions for Cinacoin.

## Connection Issues

### Wallet not connecting

1. Check Relay Server is running: `curl https://relay.yourdomain.com/health`
2. Verify WebSocket connection in browser dev tools
3. Ensure projectId matches your Relay Server config

### QR code not working

1. Check network connectivity between devices
2. Verify Relay Server public endpoint is accessible
3. Check for CORS issues

### Chain switching fails

1. Ensure the target chain is in your `chains` config
2. Check the chain's RPC endpoint is available in your RPC Proxy

## Performance Issues

### Slow connection

- Enable caching in RPC Proxy
- Use geographically closer Relay Server
- Check NATS cluster health

### High memory usage

- Configure appropriate cache TTL
- Monitor Redis memory usage
- Set connection limits on Relay Server

## Related

- [Configuration](/guide/configuration)
- [Error Codes](/api/core-sdk)
