# Elyra — Disaster Recovery Runbook

## Backup Schedule

| Data Store    | Method                        | Frequency   | Retention | Location              |
|---------------|-------------------------------|-------------|-----------|------------------------|
| PostgreSQL    | `pg_dump -F c` (custom format)| Nightly 02:00 UTC | 30 days | s3://elyra-backups/postgres/ |
| MongoDB       | `mongodump` → .tar.gz         | Nightly 02:00 UTC | 30 days | s3://elyra-backups/mongodb/ |
| Redis         | RDB snapshot + AOF            | Continuous  | N/A       | Persistent volume (transient data — not restored) |
| S3 (photos)   | S3 Versioning + Lifecycle     | Continuous  | 90d → Glacier → 365d expire | Same bucket |

All S3 backups are server-side encrypted (SSE-KMS).

## RTO / RPO Targets

| Component     | RTO (Recovery Time) | RPO (Data Loss) |
|---------------|---------------------|-----------------|
| PostgreSQL    | < 2 hours           | < 24 hours      |
| MongoDB       | < 2 hours           | < 24 hours      |
| Redis         | < 10 minutes        | Acceptable (cache only) |
| Application   | < 30 minutes        | N/A             |

## PostgreSQL Restore Procedure

```bash
# 1. Identify the backup to restore
aws s3 ls s3://elyra-backups/postgres/ --recursive | sort | tail -5

# 2. Download the backup
aws s3 cp s3://elyra-backups/postgres/pg_backup_YYYYMMDD_HHMMSS.dump /tmp/

# 3. Restore (drops and recreates target DB)
PGPASSWORD=<password> pg_restore \
  -h <pg-host> -U elyra_user \
  -d elyra_db \
  --clean --if-exists \
  /tmp/pg_backup_YYYYMMDD_HHMMSS.dump

# 4. Re-run migrations to ensure schema is current
alembic upgrade head

# 5. Verify row counts
psql -h <pg-host> -U elyra_user -d elyra_db \
  -c "SELECT 'users' as tbl, COUNT(*) FROM users UNION ALL SELECT 'matches', COUNT(*) FROM matches;"
```

## MongoDB Restore Procedure

```bash
# 1. Download + extract the backup
aws s3 cp s3://elyra-backups/mongodb/mongo_backup_YYYYMMDD_HHMMSS.tar.gz /tmp/
tar -xzf /tmp/mongo_backup_YYYYMMDD_HHMMSS.tar.gz -C /tmp/

# 2. Restore
mongorestore \
  --uri="<MONGODB_URL>" \
  --drop \
  /tmp/mongo_backup_YYYYMMDD_HHMMSS/

# 3. Verify
mongosh <MONGODB_URL>/elyra_chat --eval "db.messages.countDocuments()"
```

## Full Platform Recovery Sequence

1. Restore PostgreSQL from latest backup (see above)
2. Restore MongoDB from latest backup (see above)
3. Redis: no restore needed — Redis is cache + transient WS state, rebuilt automatically
4. Apply Kubernetes manifests: `kubectl apply -k infra/k8s/overlays/prod`
5. Run migrations: `kubectl exec -n elyra deploy/backend -- alembic upgrade head`
6. Run smoke test: `BASE_URL=https://elyra.app bash infra/scripts/smoke-test.sh`
7. Verify AI services healthy: check `/health` on all four ports

## Quarterly Restore Drill

Every quarter, perform a full restore to a staging environment:
1. Take latest prod backup
2. Restore to `elyra-staging` namespace
3. Run smoke test against staging
4. Document the time taken and any errors in `infra/docs/restore-drill-log.md`