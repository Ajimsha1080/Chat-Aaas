# CoarAI Privacy Policy (Placeholder / Enterprise Baseline)

**Effective Date:** October 16, 2026  
**Last Updated:** October 16, 2026

## 1. Information We Collect
CoarAI provides an autonomous AI assistant and knowledge retrieval SaaS platform. In providing these services:
- **Tenant Customer Data**: Text, documents, FAQs, crawled web pages, chat transcripts, and customer metadata provided by authorized workspace administrators.
- **Account Credentials**: Names, email addresses, cryptographically hashed passwords (Argon2id/SHA256), and single-use authentication tokens.
- **Telemetry & Audit Logs**: Immutable SOC2 audit events, API call logs, request IDs, IP addresses, and performance metrics.

## 2. Multi-Tenant Isolation & Data Protection
- Tenant data is strictly isolated using PostgreSQL Row-Level Security (RLS) policies and tenant-specific object storage prefixes.
- Under no circumstances is customer tenant data used to train foundation models or shared across customer organizations.
- Sensitive data is encrypted at rest using AES-256-GCM envelope encryption and in transit using TLS 1.3.

## 3. GDPR Compliance Rights (Articles 15-22)
Users within the EEA/UK and applicable global jurisdictions retain:
- **Right to Access & Portability (Art. 15, 20)**: Self-service export via `GET /api/v1/companies/{id}/gdpr/export`.
- **Right to Erasure (Art. 17)**: Self-service permanent erasure via `DELETE /api/v1/companies/{id}/gdpr/delete`.
- **Right to Rectification (Art. 16)**: Modifiable via dashboard and settings endpoints.

## 4. Contact Information
For privacy inquiries, Data Protection Officer contact, or compliance certifications, contact `privacy@coarai.internal`.
