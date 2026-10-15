# Data Processing Addendum (DPA) - CoarAI Enterprise

This Data Processing Addendum ("DPA") supplements the Master Services Agreement between Customer ("Controller") and CoarAI ("Processor").

## 1. Scope and Processing
1.1 **Subject Matter**: Processing of customer data and conversation transcripts in connection with providing AI assistant services.  
1.2 **Duration**: Term of the Master Services Agreement plus retention period specified in tenant settings.  
1.3 **Categories of Data**: Tenant business documents, support conversation transcripts, customer queries, operator notes, and system logs.  
1.4 **Categories of Data Subjects**: Customer employees, customers, website visitors, and authorized users.

## 2. Technical and Organizational Security Measures (TOMs)
- **Encryption**: TLS 1.3 in transit with HSTS; AES-256-GCM envelope encryption at rest.
- **Tenant Isolation**: PostgreSQL Row-Level Security (RLS) on all 24 database models.
- **Access Control**: Role-Based Access Control (RBAC) with least-privilege scoping.
- **Auditability**: Immutable cryptographic hash chain audit logs recording all data access and modifications.
- **Disaster Recovery**: Automated point-in-time snapshots with restore testing.

## 3. Sub-Processors
CoarAI maintains an authorized list of cloud sub-processors:
- Cloud Infrastructure: AWS (ap-south-1, us-east-1) / Cloudflare R2
- Payment Processing: Razorpay Software Private Limited
- Email Delivery: Resend Technologies / AWS SES

## 4. Deletion and Return of Customer Data
Upon termination of services or via GDPR Art. 17 right-to-erasure invocation, CoarAI irreversibly deletes all customer tenant data within 30 days.
