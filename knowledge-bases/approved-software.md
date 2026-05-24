# Approved Software Lists

## Standard Bundle (All Clients)
The following software is approved for installation on all Bulletproof-managed endpoints:

| Software | Version | Deployment | License |
|----------|---------|------------|---------|
| Microsoft 365 Apps | Latest | SCCM / Intune | Per-user (client's M365 tenant) |
| Adobe Acrobat Reader | Latest | SCCM / Manual | Free |
| Google Chrome | Latest | SCCM / Manual | Free |
| Mozilla Firefox | Latest | SCCM / Manual | Free |
| 7-Zip | Latest | Manual | Free |
| Zoom | Latest | SCCM / Manual | Client's Zoom license |
| Microsoft Teams | Latest | M365 bundle | Included with M365 |
| Slack | Latest | Manual | Client's Slack license |
| Notepad++ | Latest | Manual | Free |
| VLC Media Player | Latest | Manual | Free |

## GamingCo International — Additional Approved Software

| Software | Version | Deployment | License Pool | In Use |
|----------|---------|------------|-------------|--------|
| Adobe Creative Cloud | 2026 | SCCM | **50 licenses** | **12 in use** |
| Gaming Management System (GMS) Client | 4.2 | SCCM | Site license | N/A |
| Player Tracking Terminal | 3.8 | Manual (kiosk) | Site license | N/A |
| Cage Operations Suite | 2.1 | SCCM | 25 licenses | 18 in use |
| Tableau Desktop | 2025.4 | SCCM | 10 licenses | 7 in use |
| Surveillance Client (Avigilon) | 7.x | Manual | 15 licenses | 12 in use |

**GamingCo Prohibited Software:**
- Personal cloud storage: Dropbox, Google Drive, iCloud Drive, OneDrive (personal)
- Messaging: WhatsApp Desktop, Telegram Desktop, Signal Desktop
- Remote access: TeamViewer, AnyDesk, LogMeIn (unauthorized)
- Torrent clients: any
- Browser extensions: unapproved (must go through IT review)
- **Reason:** GLI compliance requires full audit trail on all data transfers. Personal cloud and messaging apps bypass DLP controls.

**Alternative for file sharing:** Use SharePoint Online via M365 (audited, DLP-enabled). For external sharing with auditors, use SharePoint External Sharing with expiring links.

## Maple Ridge Municipality — Additional Approved Software

| Software | Version | Deployment | License Pool | In Use |
|----------|---------|------------|-------------|--------|
| Cityworks (AMS) | 15.x | Citrix | 50 licenses | 42 in use |
| Amanda (Permits) | 7.x | Citrix | 30 licenses | 25 in use |
| TOMRMS (Records) | 6.x | Citrix | 20 licenses | 15 in use |
| ArcGIS Desktop | 10.9 | SCCM | 5 licenses | 4 in use |
| Blue Beam Revu | 2025 | SCCM | 15 licenses | 11 in use |

**Maple Ridge Prohibited Software:**
- Personal cloud storage (same as GamingCo — MFIPPA compliance)
- Social media apps: TikTok, Instagram, Facebook (on work devices)
- VPN clients other than GlobalProtect

## Northern Health Network — Additional Approved Software

| Software | Version | Deployment | License Pool | In Use |
|----------|---------|------------|-------------|--------|
| Epic Hyperspace (EMR) | Feb 2026 | Citrix | Site license | N/A |
| PACS Viewer (Sectra) | 22.x | SCCM | 200 licenses | 185 in use |
| Pyxis Connect | 4.x | Manual (med stations) | Site license | N/A |
| Dragon Medical One | 4.x | SCCM | 100 licenses | 72 in use |
| Imprivata OneSign | 7.x | SCCM | Site license | N/A |

**Northern Health Prohibited Software:**
- Screen capture/recording: Snagit, OBS, Loom (PHI risk)
- Personal cloud storage (PHIPA compliance)
- Any software that transmits data outside Canada (must be verified)

## Apex Financial Group — Additional Approved Software

| Software | Version | Deployment | License Pool | In Use |
|----------|---------|------------|-------------|--------|
| Bloomberg Terminal | Latest | Manual (trading floor) | 25 licenses | 25 in use |
| Reuters Eikon | Latest | SCCM | 10 licenses | 8 in use |
| Charles River IMS | 11.x | Citrix | 15 licenses | 12 in use |
| MATLAB | R2025b | SCCM | 5 licenses | 3 in use |
| Kx/kdb+ | 4.x | Manual (quant team) | 5 licenses | 4 in use |

**Apex Prohibited Software:**
- Personal email clients (Outlook personal accounts blocked)
- Personal cloud storage
- Unauthorized trading software
- Browser extensions (all must be IT-approved)
- **Trading floor:** Only Bloomberg and approved tools. No internet browser access.

## TechStart Innovation — Additional Approved Software

| Software | Version | Deployment | License |
|----------|---------|------------|---------|
| VS Code | Latest | Self-install | Free |
| Docker Desktop | Latest | Self-install | Business ($21/user/mo) |
| Postman | Latest | Self-install | Team plan |
| Figma | Latest | Web/Desktop | Team plan |
| 1Password | Latest | Self-install | Business plan |
| AWS CLI | Latest | Self-install | Free |
| Homebrew (Mac) | Latest | Self-install | Free |

**TechStart Policy:** Developers may install most development tools without approval. Exceptions: any tool that requires admin/root access on production systems (must go through CTO).

## Pinnacle Properties — Additional Approved Software

| Software | Version | Deployment | License Pool | In Use |
|----------|---------|------------|-------------|--------|
| Yardi Voyager | 7.x | Web-based | 30 licenses | 22 in use |
| DocuSign | Latest | Web-based | 20 licenses | 15 in use |
| Adobe Acrobat Pro | 2025 | Manual | 10 licenses | 8 in use |
| AutoCAD LT | 2025 | Manual | 3 licenses | 2 in use |

**Pinnacle Policy:** Relatively relaxed. USB storage allowed. No specific prohibited software list beyond standard security (no torrents, no unauthorized remote access).

## Software Request Process

### Approved Software
1. Verify software is on client's approved list (check this document)
2. Check license availability (license pool counts above)
3. If available: provide installation instructions or submit SCCM deployment request
4. Create Halo ticket documenting: software name, user, machine, license allocated
5. If license pool exhausted: escalate to client IT contact for purchase approval

### Non-Approved Software
1. Check if software is on the prohibited list — if yes, deny immediately with reason
2. If not prohibited but not approved: inform user of approval process
3. User must submit a Software Request Form via their company's internal portal
4. Client IT lead reviews and approves/denies
5. If approved: Bulletproof adds to approved list and deploys
6. Typical approval timeline: 3-5 business days
