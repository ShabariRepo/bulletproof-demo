# Bulletproof Client Directory

## GamingCo International
- **Vertical:** Gaming / Casino
- **Users:** 2,400
- **Identity Provider:** Azure AD (Entra ID)
- **VPN:** Cisco AnyConnect
- **SLA Tier:** Gold (4-hour response, 24/7 coverage)
- **Compliance:** GLI (Gaming Laboratories International)
- **Special Policies:**
  - No personal cloud storage (Dropbox, Google Drive, iCloud prohibited)
  - All user access audited quarterly
  - USB storage devices disabled via Group Policy
  - Two-factor authentication mandatory for all users
- **Primary Contact:** Janet Liu, IT Director — jliu@gamingco.com — 416-555-0101
- **Escalation Contact:** Robert Tran, VP Technology — rtran@gamingco.com — 416-555-0102
- **Business Hours:** 24/7 (casino operations never close)
- **Critical Systems:** Gaming Management System (GMS), Player Tracking, Cage Operations, Surveillance

## Maple Ridge Municipality
- **Vertical:** Government / Municipal
- **Users:** 850
- **Identity Provider:** On-premises Active Directory + Azure AD hybrid (sync via AD Connect)
- **VPN:** Palo Alto GlobalProtect
- **SLA Tier:** Silver (8-hour response, M-F business hours)
- **Compliance:** MFIPPA (Municipal Freedom of Information and Protection of Privacy Act)
- **Special Policies:**
  - 2FA mandatory for all remote access
  - No personal device access (BYOD prohibited)
  - Password expiry: 90 days
  - Minimum password length: 14 characters
  - Account lockout after 5 failed attempts (30-minute auto-unlock)
- **Primary Contact:** David Park, IT Manager — dpark@mapleridge.ca — 905-555-0201
- **Escalation Contact:** Angela Foster, Director of Digital Services — afoster@mapleridge.ca — 905-555-0202
- **Business Hours:** M-F 7:00 AM - 6:00 PM EST
- **Critical Systems:** Cityworks (asset management), Amanda (permits), TOMRMS (records), Council web streaming

## Northern Health Network
- **Vertical:** Healthcare
- **Users:** 3,100
- **Identity Provider:** Okta (federated with Epic EMR)
- **VPN:** Cisco AnyConnect (with Duo MFA integration)
- **SLA Tier:** Gold (4-hour response, 24/7 for clinical systems)
- **Compliance:** PHIPA (Personal Health Information Protection Act), HIPAA
- **Special Policies:**
  - Break-glass access procedure for emergency clinical situations
  - PHI (Protected Health Information) data handling rules
  - Shared workstation auto-logout after 5 minutes
  - All access to clinical systems logged and auditable
  - No screenshots or screen recording of patient data
- **Primary Contact:** Maria Santos, CISO — msantos@northernhealth.ca — 705-555-0301
- **Escalation Contact:** Dr. James Chen, Chief Medical Information Officer — jchen@northernhealth.ca — 705-555-0302
- **Business Hours:** 24/7 for clinical systems, M-F 8-5 for admin
- **Critical Systems:** Epic EMR, PACS (radiology imaging), Pyxis (medication dispensing), Nurse Call

## Apex Financial Group
- **Vertical:** Finance / Investment
- **Users:** 600
- **Identity Provider:** Azure AD (Entra ID) with Conditional Access
- **VPN:** Zscaler Private Access (ZPA)
- **SLA Tier:** Gold (4-hour response, extended hours M-F 6AM-10PM)
- **Compliance:** SOC 2 Type II, PCI-DSS
- **Special Policies:**
  - Trading floor on separate network segment (air-gapped from corporate)
  - Email encryption mandatory for external communications
  - DLP policies on all endpoints
  - Privileged access requires jump box + recorded session
- **Primary Contact:** Kevin Walsh, Head of IT — kwalsh@apexfin.com — 416-555-0401
- **Escalation Contact:** Sandra Mitchell, CTO — smitchell@apexfin.com — 416-555-0402
- **Business Hours:** M-F 6:00 AM - 10:00 PM EST (trading hours)
- **Critical Systems:** Bloomberg Terminal, FIX engine, OMS (Order Management), Compliance portal

## TechStart Innovation
- **Vertical:** Technology / Startup
- **Users:** 120
- **Identity Provider:** Google Workspace + Okta (SSO federation)
- **VPN:** WireGuard (self-managed)
- **SLA Tier:** Bronze (next business day, M-F)
- **Compliance:** SOC 2 Type I (in progress)
- **Special Policies:**
  - BYOD allowed with MDM enrollment
  - Relaxed software policy (devs can install most tools)
  - SSO required for all SaaS apps
  - GitHub Enterprise for source code
- **Primary Contact:** Alex Kim, CTO — akim@techstart.io — 647-555-0501
- **Escalation Contact:** Same (small team)
- **Business Hours:** M-F 9:00 AM - 6:00 PM EST
- **Critical Systems:** GitHub Enterprise, AWS Console, Jira, Slack, Figma

## Pinnacle Properties
- **Vertical:** Real Estate
- **Users:** 280
- **Identity Provider:** On-premises Active Directory (no cloud sync)
- **VPN:** None (office-only access)
- **SLA Tier:** Bronze (next business day, M-F)
- **Compliance:** Basic (no industry-specific requirements)
- **Special Policies:**
  - Shared accounts allowed on reception desks (generic login)
  - USB storage allowed
  - Basic antivirus only (no EDR)
  - No remote access — all work is in-office
- **Primary Contact:** Tom Wilson, Office Manager — twilson@pinnacleprop.com — 905-555-0601
- **Escalation Contact:** Karen Lee, VP Operations — klee@pinnacleprop.com — 905-555-0602
- **Business Hours:** M-F 8:30 AM - 5:30 PM EST
- **Critical Systems:** Yardi (property management), MLS access, DocuSign, Outlook
