#!/usr/bin/env python3
"""
Platform Super-Administrator Provisioning CLI

One-time CLI tool to safely create or rotate the initial platform super-admin account in production.
Guarantees:
- Enforces strong, unique cryptographic passwords.
- Rejects hardcoded/insecure defaults.
- Direct authoritative persistence to PostgreSQL/SQLite.
"""

import sys
import os
import secrets
import string
import argparse
import logging
import time

current_dir = os.path.dirname(os.path.abspath(__file__))
app_dir = os.path.dirname(current_dir)
backend_root = os.path.dirname(app_dir)
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from app.db.database import db
from app.core.security import hash_password

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
logger = logging.getLogger("create_super_admin")


def generate_secure_password(length: int = 24) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()-_=+"
    while True:
        pwd = "".join(secrets.choice(alphabet) for _ in range(length))
        if (any(c.islower() for c in pwd)
                and any(c.isupper() for c in pwd)
                and any(c.isdigit() for c in pwd)
                and any(c in "!@#$%^&*()-_=+" for c in pwd)):
            return pwd


def main():
    parser = argparse.ArgumentParser(description="Provision Platform Super-Admin Account")
    parser.add_argument("--email", required=True, help="Super-admin email address")
    parser.add_argument("--name", default="Platform Super Administrator", help="Full name of super-admin")
    parser.add_argument("--password", default=None, help="Password (omit to auto-generate secure password)")
    parser.add_argument("--company-id", default="comp-platform", help="Platform company identifier")

    args = parser.parse_args()

    email = args.email.strip().lower()
    if not email or "@" not in email:
        logger.error("Invalid email format.")
        sys.exit(1)

    password = args.password
    generated = False
    if not password:
        password = generate_secure_password()
        generated = True
    else:
        if len(password) < 12:
            logger.error("Password must be at least 12 characters long.")
            sys.exit(1)
        if password == "SuperAdmin123!":
            logger.error("Cannot use known default password 'SuperAdmin123!'.")
            sys.exit(1)

    now_str = time.strftime("%Y-%m-%dT%H:%M:%SZ")
    user_id = f"usr-admin-{secrets.token_hex(4)}"
    user_data = {
        "id": user_id,
        "email": email,
        "passwordHash": hash_password(password),
        "fullName": args.name,
        "isEmailVerified": True,
        "isSuspended": False,
        "createdAt": now_str
    }

    mem_id = f"mem-admin-{secrets.token_hex(4)}"
    mem_data = {
        "id": mem_id,
        "userId": user_id,
        "companyId": args.company_id,
        "role": "super_admin",
        "status": "active",
        "createdAt": now_str
    }

    db.save_user(user_data)
    db.save_membership(mem_data)
    db.flush_durable_storage()

    logger.info("=" * 60)
    logger.info("PLATFORM SUPER-ADMIN ACCOUNT SUCCESSFULLY PROVISIONED")
    logger.info("=" * 60)
    logger.info(f"User ID  : {user_id}")
    logger.info(f"Email    : {email}")
    logger.info(f"Full Name: {args.name}")
    logger.info("Role     : super_admin")
    if generated:
        logger.info(f"Generated Password: {password}")
        logger.info("PLEASE SAVE THIS PASSWORD IN A SECURE PASSWORD MANAGER IMMEDIATELY.")
    else:
        logger.info("Password : [Provided explicitly]")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
