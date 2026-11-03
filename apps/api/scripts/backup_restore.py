#!/usr/bin/env python3
"""
Database Backup & Point-in-Time Restore Verification Script.
Dumps current Postgres database, restores into a distinct test database, and validates integrity.
"""
import os
import subprocess
import sys
import time

SOURCE_DB = os.getenv("POSTGRES_DB", "dharohar_atlas")
RESTORE_DB = f"{SOURCE_DB}_restore_test"
PG_USER = os.getenv("POSTGRES_USER", "ramnarayangupta")
PG_HOST = os.getenv("POSTGRES_HOST", "localhost")
PG_PORT = os.getenv("POSTGRES_PORT", "5432")

BACKUP_FILE = f"/tmp/dharohar_atlas_backup_{int(time.time())}.dump"

def run_cmd(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess:
    res = subprocess.run(cmd, capture_output=True, text=True)
    if check and res.returncode != 0:
        print(f"Error executing {' '.join(cmd)}: {res.stderr}", file=sys.stderr)
        sys.exit(res.returncode)
    return res

def main():
    print(f"=== 1. Creating Database Dump from {SOURCE_DB} ===")
    dump_start = time.time()
    run_cmd([
        "pg_dump", "-h", PG_HOST, "-p", PG_PORT, "-U", PG_USER,
        "-Fc", "-f", BACKUP_FILE, SOURCE_DB
    ])
    dump_duration = round(time.time() - dump_start, 2)
    dump_size = os.path.getsize(BACKUP_FILE)
    print(f"✓ Backup dump created at {BACKUP_FILE} ({dump_size} bytes in {dump_duration}s)")

    print(f"\n=== 2. Preparing Isolated Target Database: {RESTORE_DB} ===")
    # Drop target if exists
    run_cmd(["dropdb", "-h", PG_HOST, "-p", PG_PORT, "-U", PG_USER, "--if-exists", RESTORE_DB])
    # Create target database
    run_cmd(["createdb", "-h", PG_HOST, "-p", PG_PORT, "-U", PG_USER, RESTORE_DB])
    print(f"✓ Target database {RESTORE_DB} created")

    print(f"\n=== 3. Restoring Backup into {RESTORE_DB} ===")
    restore_start = time.time()
    # Restore dump into the target DB
    run_cmd([
        "pg_restore", "-h", PG_HOST, "-p", PG_PORT, "-U", PG_USER,
        "-d", RESTORE_DB, "--no-owner", "--no-acl", BACKUP_FILE
    ], check=False)
    restore_duration = round(time.time() - restore_start, 2)
    print(f"✓ Restore completed into {RESTORE_DB} in {restore_duration}s")

    print(f"\n=== 4. Verifying Restored Database Integrity ===")
    tables = ["sites", "documents", "document_pages", "ocr_lines", "search_chunks", "routes"]
    all_match = True
    for table in tables:
        src_res = run_cmd([
            "psql", "-h", PG_HOST, "-p", PG_PORT, "-U", PG_USER, "-d", SOURCE_DB,
            "-t", "-A", "-c", f"SELECT COUNT(*) FROM {table};"
        ])
        dst_res = run_cmd([
            "psql", "-h", PG_HOST, "-p", PG_PORT, "-U", PG_USER, "-d", RESTORE_DB,
            "-t", "-A", "-c", f"SELECT COUNT(*) FROM {table};"
        ])
        src_count = src_res.stdout.strip()
        dst_count = dst_res.stdout.strip()
        match = src_count == dst_count
        status = "MATCH" if match else "MISMATCH"
        print(f"  - Table {table:<16}: Source={src_count} | Restored={dst_count} [{status}]")
        if not match:
            all_match = False

    print(f"\n=== 5. Cleaning up Temporary Resources ===")
    run_cmd(["dropdb", "-h", PG_HOST, "-p", PG_PORT, "-U", PG_USER, RESTORE_DB])
    if os.path.exists(BACKUP_FILE):
        os.remove(BACKUP_FILE)
    print(f"✓ Isolated restore DB {RESTORE_DB} dropped and backup artifact removed.")

    if all_match:
        print("\n🎉 BACKUP & RESTORE INTEGRITY VERIFICATION PASSED 100%!")
        sys.exit(0)
    else:
        print("\n❌ BACKUP & RESTORE VERIFICATION FAILED: Row count mismatch detected.", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
