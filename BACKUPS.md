# BizlInbox Backup & Restore Guide

## PostgreSQL

### Backup
```bash
docker exec -it bizlinbox-postgres pg_dump -U bizlinbox -d bizlinbox -Fc > bizlinbox-backup-$(date +%Y%m%d-%H%M%S).dump
```

### Restore
```bash
# Stop the app to avoid write conflicts
docker compose stop app

# Drop and recreate the database
docker exec -it bizlinbox-postgres psql -U bizlinbox -c "DROP DATABASE IF EXISTS bizlinbox;"
docker exec -it bizlinbox-postgres psql -U bizlinbox -c "CREATE DATABASE bizlinbox;"

# Restore from dump
docker exec -i bizlinbox-postgres pg_restore -U bizlinbox -d bizlinbox --no-owner --no-privileges < bizlinbox-backup-YYYYMMDD-HHMMSS.dump

# Restart the app
docker compose start app
```

## Redis

### Backup
```bash
docker exec -it bizlinbox-redis redis-cli BGSAVE
# The RDB file is saved to /data inside the container (persisted via redis_data volume)
```

### Restore
Redis data is restored automatically from the RDB file when the container starts, as long as the `redis_data` volume is preserved.

## Uploads

### Backup
```bash
tar -czvf uploads-backup-$(date +%Y%m%d-%H%M%S).tar.gz -C /var/lib/docker/volumes/bizlinbox_uploads/_data .
```

### Restore
```bash
tar -xzvf uploads-backup-YYYYMMDD-HHMMSS.tar.gz -C /var/lib/docker/volumes/bizlinbox_uploads/_data
```

## Automated Backups (Recommended)

Set up a cron job on the host:
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * docker exec bizlinbox-postgres pg_dump -U bizlinbox -d bizlinbox -Fc > /backups/bizlinbox-$(date +\%Y\%m\%d).dump 2>> /backups/backup.log
```

## Offsite Storage

For production environments, copy backup files to an offsite location (e.g., S3, B2, or another server) immediately after creation.
