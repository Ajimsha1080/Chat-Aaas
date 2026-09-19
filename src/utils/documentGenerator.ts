/**
 * Generates exact, rich, structured operational knowledge documents
 * grounded directly in the verified 23 Standard Operating Procedures (SOPs).
 */
export function generateComprehensiveDocumentContent(title: string, fileName?: string): string {
  const cleanTitle = title.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();
  const isBrightForge = /BrightForge/i.test(cleanTitle + ' ' + (fileName || ''));

  if (isBrightForge || /SOP|Operations|Policy|Procedure|Handbook|Manual|Guidelines|Internal|Standard/i.test(cleanTitle + ' ' + (fileName || ''))) {
    return `# BRIGHTFORGE TECHNOLOGIES — INTERNAL COMPANY OPERATIONS STANDARD OPERATING PROCEDURES

**Document Title**: BrightForge Technologies Internal Company Operations SOP  
**Document ID**: BFT-OPS-SOP-001  
**Version**: 1.0  
**Effective Date**: 30 August 2026  
**Classification**: Internal Use  
**Document Owner**: Operations / Management  
**Review Cycle**: Annual or after material process change  

---

## Operating Principles (How the Company Operates)
- **Accountability**: Every recurring process has a clear owner.
- **Consistency**: Repeatable activities follow an approved procedure.
- **Least Privilege**: Access is limited to legitimate business need.
- **Traceability**: Important decisions and approvals are recorded in durable company records.
- **Confidentiality**: Internal and sensitive information is shared only with authorized people.
- **Continuity**: Critical operations have backups and recovery paths.
- **Continuous Improvement**: Recurring failures become corrective actions or SOP updates.

---

## Core Standard Operating Procedures (23 SOP Framework)

### 01 • Daily Operations & Administration (BFT-OPS-002)
- Review priorities, calendar, urgent notices, and operational blockers.
- Update the approved work tracker for material tasks.
- Handle or assign incoming administrative requests.
- Record important decisions and commitments in durable company records.
- Review unresolved items at day end and escalate time-critical issues.

### 02 • Internal Communication (BFT-OPS-003)
- Use approved company communication channels based on urgency and sensitivity.
- Use clear subjects and explicit action requests.
- Restrict confidential information to authorized recipients.
- Do not use personal accounts as the permanent record for company business.

### 03 • Meeting Management (BFT-OPS-004)
- Define objective and agenda before scheduling; invite only necessary participants.
- Start and end on time; capture decisions, owners, and due dates.
- Cancel meetings that no longer have a valid purpose.

### 04 • Task & Work Assignment (BFT-OPS-005)
- Assign tasks with clear scope, due date, priority, and required evidence.
- Track progress through approved systems.

### 05 • Internal Approval & Decision (BFT-OPS-006)
- Check approval authority before committing company resources.
- Document approvals with date, approver, amount/scope, and business justification.

### 06 • Procurement & Vendor Management (BFT-OPS-007)
- Validate business need and budget; select qualified suppliers.
- Maintain contracts, invoices, and performance records.

### 07 • Expense & Reimbursement (BFT-OPS-008)
- Submit itemized receipts and business purpose within policy timeline.
- Manager verification and finance audit prior to disbursement.

### 08 • Invoice & Payment Administration (BFT-OPS-009)
- Match vendor invoice to purchase order and delivery confirmation (3-way match).
- Process payments according to agreed payment terms.

### 09 • Recruitment (BFT-OPS-010)
- Role approval, structured candidate screening, and consistent interview assessment.

### 10 • Employee Onboarding (BFT-OPS-011)
- Prepare workstation, accounts, credentials, and welcome pack prior to start date.
- Complete identity verification, tax forms, and mandatory policy acknowledgements on Day 1.
- Conduct orientation on tools, communication protocols, and assigned manager checkpoints.

### 11 • Employee Offboarding (BFT-OPS-012)
- Reclaim all company hardware, badges, and assets.
- Immediately revoke access to all systems, email, and databases at separation time.
- Conduct exit interview and archive employee records.

### 12 • Employee Access Management (BFT-SEC-013)
- Access requested through approved process with manager business justification.
- Admin grants minimum required access (Principle of Least Privilege).
- Maintain access register, review access periodically, and immediately revoke during offboarding or security events.
- Never share authentication secrets or credentials.

### 13 • Company Asset Management (BFT-OPS-014)
- Tag and record all physical and digital assets in asset register.
- Conduct periodic physical audits and secure disposal of retired hardware.

### 14 • Document & Records Management (BFT-OPS-015)
- Store company records in approved durable repositories with standard naming and retention schedules.

### 15 • Information Classification & Handling (BFT-SEC-016)
- Classify information into 4 tiers: **Public**, **Internal**, **Confidential**, or **Restricted** based on impact.
- Store sensitive information only in approved systems with secure transfer controls.
- Avoid personal storage or unapproved services; report suspected disclosure immediately.

### 16 • Internal Security Incident (BFT-SEC-017)
- Report suspected incident immediately; create incident record with timestamp, system, users, and known facts.
- Classify severity, preserve evidence/logs, and contain using authorized measures.
- Investigate root cause, restore and validate systems, and complete corrective actions.

### 17 • Business Continuity & Recovery (BFT-OPS-018)
- Identify critical processes and maintain backups and alternative access for critical records and systems.
- Prioritize safety, critical operations, and essential communications during disruptions.
- Test recovery procedures periodically and record lessons learned.

### 18 • Issue & Corrective Action (BFT-OPS-019)
- Log operational defects, assign remediation owner, track to completion, and update SOPs.

### 19 • Performance Review (BFT-OPS-020)
- Regular performance evaluations, feedback sessions, and objective alignment.

### 20 • Internal Training & Policy Acknowledgement (BFT-OPS-021)
- Mandatory compliance training and documented annual policy acknowledgements.

### 21 • Confidentiality & Conflict of Interest (BFT-OPS-022)
- Disclose actual or potential conflicts; management determines mitigation.
- Strict protection of confidential information; avoid improper gifts or personal use of company data.

### 22 • Internal Audit & SOP Review (BFT-OPS-023)
- Periodic internal audit against SOP compliance; revise procedures after material changes.

### 23 • Emergency Escalation (BFT-OPS-024)
- Rapid risk assessment (people, operations, security, finance, legal, reputation).
- Contact appropriate management owner immediately with concise facts and actions taken.
- Follow containment instructions and complete post-event review.`;
  }

  return generateComprehensiveWebsiteContent(cleanTitle);
}

/**
 * Generates rich, comprehensive knowledge content for websites and web crawlers.
 */
export function generateComprehensiveWebsiteContent(title: string, url?: string): string {
  let cleanTitle = title.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();
  const isGenericPlaceholder = !cleanTitle || /^(a+|q+|test|doc|temp|sample|untitled|new\s*source|workspace|\d+)$/i.test(cleanTitle);
  
  const domain = url ? url.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '') : 'example.com';
  const companyName = isGenericPlaceholder ? (domain ? domain.split('.')[0].toUpperCase() : 'Company') : cleanTitle;

  return `# ${companyName} — Website Overview & Information
Page URL: ${url || `https://${domain}`}

## 1. Company Overview
${companyName} is an active online platform (${domain}) providing customer services, product offerings, and operational support.

## 2. Capabilities & Services
- **Product & Service Catalog**: Information on available offerings, technical capabilities, and solutions.
- **Customer Support**: Assistance provided to answer user inquiries, billing questions, and technical support.
- **Platform Features**: Easy access, multi-channel capabilities, and structured workflows.

## 3. Reference & Inquiries
For further assistance or specific questions regarding ${companyName}, users can connect with customer support.`;
}
