# Ali Capa Operational Diary

Purpose: a fast, non-artistic business handoff record showing what changed, what was decided, what remains open, and exactly where work should resume.

This diary is part of the Ali Capa Master Documentation source. It does not replace technical documentation, legal records, accounting records, customer records, or the artistic diary.

## Folder structure

```text
Operational Diary/
  README.md
  ENTRY-TEMPLATE.md
  2026/
    07-July/
      2026-07-21.md
```

New years receive their own folder. Each year is divided by numbered month folders. Entries are created only for meaningful business workdays, not merely because a calendar day passed.

## Entry rules

Each entry should remain quick to scan and should answer:

1. What was completed?
2. What decisions became authoritative?
3. What changed in production, Preview, documentation, or operations?
4. What external answers are still pending?
5. What is blocked, disabled, or deliberately not activated?
6. What is the exact next step?
7. Which branch, deployment, file, or system is currently authoritative?

## Privacy and security

The shareable diary must never contain passwords, API keys, webhook secrets, recovery codes, private keys, customer records, complete delivery addresses, private sender details, private Access identifiers, or instructions for bypassing approval gates.

Sensitive operational facts should be recorded only as statements such as “encrypted sender variables configured” or “credential stored in Cloudflare,” without exposing the value.

## Cadence

Create an entry at the end of a substantial business workday. A daily entry is not required when no meaningful business change occurred. Month and year folders provide the chronology; weekly folders are intentionally avoided.

## Relationship to other documentation

- **Layman folder:** explains how the business works in plain language.
- **Operational Diary:** records what happened and where the business currently stands.
- **Technical documentation:** explains implementation details and recovery procedures.
- **Accounting and order records:** remain in their dedicated restricted systems.
