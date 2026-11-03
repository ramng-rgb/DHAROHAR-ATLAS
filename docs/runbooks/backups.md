# Runbook: Database Backups & Disaster Recovery Restore

## 1. Backup Strategy Overview

| Tier | Backup Frequency | Retention Period | Storage Location | PITR (Point-in-Time Restore) Support |
| :--- | :--- | :--- | :--- | :--- |
| **Local / Dev** | Manual / Pre-migration snapshot | Ephemeral | Local `/tmp/dharohar_atlas_*.dump` | Not Applicable |
| **Supabase (Free Tier)** | Daily automated snapshot (midnight UTC) | 7 days retention | Supabase Managed Storage | **NO PITR on Free Tier** (PITR requires Pro Plan). In free tier, restores occur from daily base snapshots. |
| **Supabase (Pro Tier)** | Continuous WAL archiving + Daily base backup | 7 to 30 days configurable | AWS S3 encrypted multi-AZ | **Supported up to the second** within retention window. |
| **Render PostgreSQL** | Daily automated snapshot | 7 days | Encrypted internal block store | Manual restore to new instance from latest daily backup. |

---

## 2. Automated Backup Verification Script
The repository provides an automated disaster recovery verification tool at [apps/api/scripts/backup_restore.py](file:///Users/ramnarayangupta/Desktop/hac/apps/api/scripts/backup_restore.py).

### How to Run:
```bash
python apps/api/scripts/backup_restore.py
```

### Measured Execution Results (Tested 3 Nov 2026):
```text
=== 1. Creating Database Dump from dharohar_atlas ===
✓ Backup dump created at /tmp/dharohar_atlas_backup_1793701889.dump (1,305,781 bytes in 0.43s)

=== 2. Preparing Isolated Target Database: dharohar_atlas_restore_test ===
✓ Target database dharohar_atlas_restore_test created

=== 3. Restoring Backup into dharohar_atlas_restore_test ===
✓ Restore completed into dharohar_atlas_restore_test in 0.52s

=== 4. Verifying Restored Database Integrity ===
  - Table sites           : Source=25 | Restored=25 [MATCH]
  - Table documents       : Source=142 | Restored=142 [MATCH]
  - Table document_pages  : Source=112 | Restored=112 [MATCH]
  - Table ocr_lines       : Source=454 | Restored=454 [MATCH]
  - Table search_chunks   : Source=308 | Restored=308 [MATCH]
  - Table routes          : Source=2 | Restored=2 [MATCH]

=== 5. Cleaning up Temporary Resources ===
✓ Isolated restore DB dharohar_atlas_restore_test dropped and backup artifact removed.

🎉 BACKUP & RESTORE INTEGRITY VERIFICATION PASSED 100%!
```

---

## 3. Production Disaster Recovery Step-by-Step Procedure

### 3.1 Point-in-Time Restore (Supabase Pro Tier)
1. Navigate to **Supabase Dashboard $\rightarrow$ Project Settings $\rightarrow$ Database $\rightarrow$ Backups**.
2. Select **Point in Time (PITR)** tab.
3. Specify target UTC timestamp prior to incident (e.g. `2026-11-03 14:30:00 UTC`).
4. Click **Restore to New Project**. Supabase spins up a fresh clone with all data recovered up to the specified second.
5. Update `DATABASE_URL` and `SYNC_DATABASE_URL` in Render environment settings with the new host endpoint.
6. Trigger zero-downtime redeploy of API and Worker.

### 3.2 Manual CLI Disaster Recovery (Any Postgres Provider)
```bash
# 1. Download latest remote backup dump
export SOURCE_DUMP="production_backup_latest.dump"

# 2. Spin up fresh target PostgreSQL database
createdb -h [TARGET_HOST] -U [USER] dharohar_atlas_prod_recovered

# 3. Ensure required PostGIS & pgvector extensions are active
psql -h [TARGET_HOST] -U [USER] -d dharohar_atlas_prod_recovered -c "CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS unaccent;"

# 4. Restore custom-format dump with parallel jobs
pg_restore -h [TARGET_HOST] -U [USER] -d dharohar_atlas_prod_recovered --no-owner --no-acl -j 4 "$SOURCE_DUMP"

# 5. Verify row count reconciliation
psql -h [TARGET_HOST] -U [USER] -d dharohar_atlas_prod_recovered -c "SELECT count(*) FROM sites; SELECT count(*) FROM search_chunks;"

# 6. Point application services to recovered connection string
```

---

## 4. Honest Assessment of Provider Limitations
- **Supabase Free Tier:** Does **NOT** provide automated Point-in-Time Recovery (PITR); only daily snapshots are captured. If an accidental data corruption occurs at 23:00 UTC, restoring the daily snapshot loses changes made since 00:00 UTC. For mission-critical production with zero RPO (Recovery Point Objective), upgrading to Supabase Pro ($25/mo) is mandatory.
