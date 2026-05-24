# Escalation Matrix

## Severity Levels

### P1 — Critical
**Definition:** Complete service outage or security incident affecting all or most users
**Examples:** Email system down, network outage, ransomware, data breach, all users locked out
**Response:**
- Immediate phone call to client IT lead AND Bulletproof Tier 2 lead
- Slack alert to #incidents channel
- 15-minute status updates until resolved
- Post-incident review within 24 hours
**SLA:** Gold: 30 min response / 4 hour resolution. Silver: 1 hour / 8 hours. Bronze: 2 hours / next business day.

### P2 — High
**Definition:** Service degradation or issue affecting multiple users or critical business function
**Examples:** VPN down for department, shared mailbox not working, printer fleet offline, application crash affecting team
**Response:**
- Slack notification to Tier 2 within 15 minutes
- Email to client IT contact
- Hourly status updates
**SLA:** Gold: 1 hour / 8 hours. Silver: 2 hours / 16 hours. Bronze: 4 hours / 2 business days.

### P3 — Medium
**Definition:** Issue affecting single user, workaround available
**Examples:** Software not working (but can use web version), single printer offline, slow VPN
**Response:**
- Add to Tier 2 queue
- Email acknowledgment to user
**SLA:** Gold: 4 hours / 24 hours. Silver: 8 hours / 2 business days. Bronze: next business day / 5 business days.

### P4 — Low
**Definition:** Request or minor issue, no business impact
**Examples:** How-to question, cosmetic issue, feature request, password reset (routine)
**Response:**
- Self-service guidance or Tier 1 resolution
- Halo ticket for tracking
**SLA:** Gold: 8 hours / 3 business days. Silver: next business day / 5 business days. Bronze: 2 business days / 10 business days.

## Always Escalate (Regardless of Severity)

The following situations MUST be escalated to a human immediately. AI agents should NOT attempt resolution:

1. **User explicitly asks for a human** — "Let me talk to a real person", "I want to speak to someone"
2. **Suspected security incident** — unauthorized access, data breach, malware, phishing (confirmed)
3. **Executive reporter** — C-suite, VP, or director reporting an issue (route to senior Tier 2)
4. **Organization-wide outage** — affecting all or most users at a client site
5. **Data loss or corruption** — "My files are gone", "Database is corrupted"
6. **Compliance-related** — anything involving regulatory requirements (PHIPA, PCI-DSS, MFIPPA)
7. **Client "no AI" policy** — some clients may opt out of AI-assisted support
8. **Three or more failed resolution attempts** — if AI has tried 3 approaches and user still has the issue
9. **Physical security** — badge access, physical break-in, alarm system issues
10. **HR/legal involvement** — termination-related access changes, legal hold requests

## Per-Client Escalation Contacts

### GamingCo International (Gold SLA — 24/7)
| Situation | Contact | Method |
|-----------|---------|--------|
| General IT issues | Janet Liu, IT Director | Email: jliu@gamingco.com, Phone: 416-555-0101 |
| Security incidents | Robert Tran, VP Technology | Phone: 416-555-0102 (immediate) |
| After-hours critical | GamingCo NOC | Phone: 416-555-0199 |
| GLI compliance questions | Compliance team | Email: compliance@gamingco.com |

### Maple Ridge Municipality (Silver SLA — M-F)
| Situation | Contact | Method |
|-----------|---------|--------|
| General IT issues | David Park, IT Manager | Email: dpark@mapleridge.ca, Phone: 905-555-0201 |
| Security incidents | Angela Foster, Director Digital | Phone: 905-555-0202 (immediate) |
| After-hours P1 only | David Park (cell) | Phone: 905-555-0210 |
| MFIPPA questions | Privacy Officer | Email: privacy@mapleridge.ca |

### Northern Health Network (Gold SLA — 24/7 clinical)
| Situation | Contact | Method |
|-----------|---------|--------|
| Clinical system issues | Help Desk Tier 2 | Phone: 705-555-0310 (24/7) |
| Security / PHIPA incidents | Maria Santos, CISO | Phone: 705-555-0301 (immediate) |
| EMR / Epic issues | Dr. James Chen, CMIO | Phone: 705-555-0302 |
| Break-glass requests | On-call security admin | Phone: 705-555-0320 |

### Apex Financial Group (Gold SLA — Extended hours)
| Situation | Contact | Method |
|-----------|---------|--------|
| General IT issues | Kevin Walsh, Head of IT | Email: kwalsh@apexfin.com, Phone: 416-555-0401 |
| Trading floor issues | Trading floor support (on-site) | Phone: 416-555-0410 (P1 immediate) |
| Security / compliance | Sandra Mitchell, CTO | Phone: 416-555-0402 |
| PCI-DSS questions | Compliance Officer | Email: compliance@apexfin.com |

### TechStart Innovation (Bronze SLA — M-F)
| Situation | Contact | Method |
|-----------|---------|--------|
| All issues | Alex Kim, CTO | Email: akim@techstart.io, Slack: @alex |
| After-hours | Not covered (Bronze SLA) | N/A |

### Pinnacle Properties (Bronze SLA — M-F)
| Situation | Contact | Method |
|-----------|---------|--------|
| General IT issues | Tom Wilson, Office Manager | Email: twilson@pinnacleprop.com, Phone: 905-555-0601 |
| Escalation | Karen Lee, VP Operations | Phone: 905-555-0602 |
| After-hours | Not covered (Bronze SLA) | N/A |

## Bulletproof Internal Escalation

| Role | Contact | When |
|------|---------|------|
| Tier 2 Lead (on-call) | Rotates weekly — check #tier2-oncall Slack | Any P1/P2, security incident |
| Network Operations | noc@bulletproof.com, #noc Slack | Network/connectivity issues unresolved by Tier 1 |
| Security Operations (SOC) | soc@bulletproof.com, #soc Slack | All security alerts, suspected breaches |
| Service Delivery Manager | Assigned per client (check Halo) | SLA breach risk, client complaints |

## Escalation Handoff Format

When escalating to a human, provide:
1. **Ticket ID** and **client name**
2. **Summary** of the issue (1-2 sentences)
3. **Steps already taken** (what was tried, what failed)
4. **KB articles referenced** (which procedures were consulted)
5. **Suggested resolution** (if you have one, even if uncertain)
6. **Severity assessment** with justification
7. **User contact info** (how to reach the affected user)
