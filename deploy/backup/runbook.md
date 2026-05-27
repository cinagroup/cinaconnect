# Cinacoin — Backup & Recovery Runbook

## Overview

This document describes backup procedures, recovery processes, and operational guidelines for Cinacoin data stores.

## Data Stores

| Store | Type | Backup Method | Frequency | Retention |
|-------|------|--------------|-----------|-----------|
| PostgreSQL (keys-server) | Relational DB | pg_dump + gzip | Daily (02:00 UTC) | 30 days |
| Redis (caching/session) | In-memory | RDB snapshot | Daily (03:00 UTC) | 30 days |
| NATS JetStream | Message queue | File store backup | Continuous | 7 days |
| Blockchain nodes | Full nodes | Snapshot sync | N/A (re-syncable) | N/A |

## Backup Verification

### Daily Checks

1. **Verify backup completion** — Check CronJob status:
   ```bash
   kubectl get cronjob -n cinacoin | grep backup
   kubectl get jobs -n cinacoin -l component=backup --sort-by=.status.startTime
   ```

2. **Verify S3 uploads** — Check latest backups in S3:
   ```bash
   aws s3 ls s3://cinacoin-backups/postgres/ --human-readable --sort date | tail -5
   aws s3 ls s3://cinacoin-backups/redis/ --human-readable --sort date | tail -5
   ```

3. **Test restore (weekly)** — Restore latest backup to staging:
   ```bash
   # PostgreSQL
   aws s3 cp s3://cinacoin-backups/postgres/postgres_latest.sql.gz - \
     | gunzip | psql -h staging-db -U cinacoin -d cinacoin_test

   # Redis
   aws s3 cp s3://cinacoin-backups/redis/redis_latest.rdb.gz - \
     | gunzip > /tmp/dump.rdb
   redis-cli -h staging-redis CONFIG SET dbfilename dump.rdb
   redis-cli -h staging-redis BGSAVE
   ```

## Recovery Procedures

### PostgreSQL Recovery

**Scenario 1: Full database restore**

1. Identify the recovery point:
   ```bash
   aws s3 ls s3://cinacoin-backups/postgres/ --human-readable --sort date
   ```

2. Stop keys-server to prevent writes:
   ```bash
   kubectl scale deployment keys-server --replicas=0 -n production
   ```

3. Restore from backup:
   ```bash
   BACKUP_FILE="postgres_YYYYMMDD_HHMMSS.sql.gz"
   aws s3 cp "s3://cinacoin-backups/postgres/${BACKUP_FILE}" - \
     | gunzip | psql -h production-db -U cinacoin -d cinacoin
   ```

4. Verify restoration:
   ```bash
   psql -h production-db -U cinacoin -d cinacoin -c "SELECT count(*) FROM keys;"
   psql -h production-db -U cinacoin -d cinacoin -c "SELECT count(*) FROM sessions;"
   ```

5. Restart keys-server:
   ```bash
   kubectl scale deployment keys-server --replicas=2 -n production
   kubectl rollout status deployment/keys-server -n production
   ```

**Scenario 2: Point-in-time recovery (accidental data deletion)**

1. Restore latest full backup to temporary database
2. Apply WAL logs up to the target timestamp
3. Extract and re-insert the deleted data
4. Verify data integrity

### Redis Recovery

**Scenario 1: Full Redis restore**

1. Stop dependent services:
   ```bash
   kubectl scale deployment relay-server --replicas=0 -n production
   kubectl scale deployment rpc-proxy --replicas=0 -n production
   ```

2. Clear existing data:
   ```bash
   redis-cli -h production-redis FLUSHALL
   ```

3. Restore from backup:
   ```bash
   BACKUP_FILE="redis_YYYYMMDD_HHMMSS.rdb.gz"
   aws s3 cp "s3://cinacoin-backups/redis/${BACKUP_FILE}" - \
     | gunzip > /data/dump.rdb

   redis-cli -h production-redis SHUTDOWN NOSAVE
   # Redis will load dump.rdb on restart
   kubectl rollout restart statefulset redis-cluster -n production
   ```

4. Verify data:
   ```bash
   redis-cli -h production-redis DBSIZE
   redis-cli -h production-redis INFO memory
   ```

5. Restart dependent services

**Scenario 2: Cache-only loss (acceptable)**

If Redis is used only for caching (no persistent data):
1. Scale Redis to 0, then back up
2. Let caches warm up naturally
3. Monitor for increased latency during warm-up

### NATS JetStream Recovery

1. Check stream health:
   ```bash
   nats stream ls
   nats stream info <stream-name>
   ```

2. If stream corrupted, recreate from scratch:
   ```bash
   nats stream delete <stream-name>
   nats stream add <stream-name> --subjects "<subjects>"
   ```

3. Verify message replay:
   ```bash
   nats consumer info <stream-name> <consumer-name>
   ```

## Emergency Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| On-call Engineer | PagerDuty: #cinacoin-oncall | 5 min |
| Platform Lead | Slack: @platform-lead | 15 min |
| Database Admin | Slack: @dba-team | 30 min |
| VP Engineering | Phone (last resort) | 1 hour |

## Testing Schedule

| Test Type | Frequency | Last Run | Next Run |
|-----------|-----------|----------|----------|
| Full restore test | Monthly | _TBD_ | _TBD_ |
| Partial restore test | Weekly | _TBD_ | _TBD_ |
| Backup integrity check | Daily | Automated | Automated |
| DR drill | Quarterly | _TBD_ | _TBD_ |
