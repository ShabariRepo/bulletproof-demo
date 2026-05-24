# VPN & Connectivity Procedures

## Cisco AnyConnect — GamingCo, Northern Health

### Error 401: Authentication Failed
**Symptoms:** "Authentication failed due to a problem verifying the server certificate" or login credentials rejected
**Troubleshooting:**
1. Verify credentials: ask user to try logging in to webmail/portal first
2. If credentials work elsewhere: certificate issue
   - Check certificate expiry: AnyConnect > Settings > Certificate Info
   - If expired: download new certificate bundle from https://vpn.{client}.com/cert
   - If not expired: clear AnyConnect profile cache
     - Windows: Delete `C:\ProgramData\Cisco\Cisco AnyConnect Secure Mobility Client\Profile\`
     - Mac: Delete `/opt/cisco/anyconnect/profile/`
3. If credentials don't work elsewhere: password issue → route to Password Specialist
4. **Northern Health special:** Duo MFA push must be approved within 60 seconds or connection fails

### Error 443: Connection Failed
**Symptoms:** "Connection attempt has failed due to server communication error"
**Troubleshooting:**
1. Check if VPN server is reachable: ask user to ping vpn.{client}.com
2. If unreachable: likely firewall or DNS issue
   - Try alternate DNS: 8.8.8.8 or 1.1.1.1
   - Check if user is on a restricted network (hotel, airport, corporate guest WiFi)
   - Try alternate VPN profile if available
3. If reachable but connection fails:
   - Check AnyConnect client version (minimum 4.10 required)
   - Update client from https://vpn.{client}.com/downloads
   - Disable third-party firewall/antivirus temporarily to test
4. If issue persists: check VPN concentrator status with Network Ops
5. **GamingCo special:** Split tunnel is disabled — all traffic routes through VPN. If user reports slow internet, this is expected.

### Split Tunnel Configuration
- **GamingCo:** Full tunnel (all traffic through VPN) — required for GLI compliance
- **Northern Health:** Split tunnel enabled — only clinical system traffic routes through VPN
  - Clinical subnet: 10.20.0.0/16
  - PACS/imaging: 10.30.0.0/24
  - Internet traffic: direct (no VPN)

### Certificate Renewal
- Certificates expire annually
- 30-day warning emails sent automatically
- Renewal: user visits https://vpn.{client}.com and clicks "Download Certificate"
- If expired: user cannot connect — must renew via alternate network first

## Palo Alto GlobalProtect — Maple Ridge Municipality

### Portal vs Gateway
- **Portal:** https://gp.mapleridge.ca — configuration download endpoint
- **Gateway:** vpn.mapleridge.ca — actual VPN connection point
- Users should connect to the Portal first, which auto-redirects to Gateway

### HIP (Host Information Profile) Check Failures
**Symptoms:** "HIP check failed" or connection refused after authentication
**Troubleshooting:**
1. HIP checks verify: antivirus running, OS patches current, disk encryption enabled
2. Check which HIP item failed: GlobalProtect > Settings > Connection > HIP Report
3. Common failures:
   - **Antivirus not running:** Start Windows Defender or CrowdStrike Falcon service
   - **OS patches outdated:** Run Windows Update, reboot, try again
   - **Disk encryption off:** This requires IT admin — escalate to Tier 2
4. After fixing: disconnect and reconnect GlobalProtect

### Certificate-Based Authentication
- Maple Ridge uses certificate + password (two-factor)
- Certificate issued via Active Directory Certificate Services
- Certificate valid for 2 years
- To check expiry: `certmgr.msc` > Personal > Certificates > look for "Maple Ridge VPN"
- Renewal: submit request via internal portal (requires domain-joined machine)

### Troubleshooting Connection Issues
1. Check GlobalProtect client version: minimum 6.1 required
2. Verify portal address: https://gp.mapleridge.ca (not vpn.mapleridge.ca)
3. Check if user's IP is in the blocked list (auto-blocked after 10 failed attempts)
4. Verify user's AD account is not locked/disabled
5. Check GP agent service: `services.msc` > "PanGP Service" should be Running

## Zscaler Private Access (ZPA) — Apex Financial Group

### App Segment Troubleshooting
**Symptoms:** "Application not accessible" or specific internal app won't load
**Troubleshooting:**
1. Verify Zscaler Client Connector is running (system tray icon)
2. Check ZPA status: Right-click Zscaler icon > "Open Zscaler" > Status tab
3. If disconnected: click "Reconnect"
4. If connected but app not working:
   - Check if app is in the user's access policy (Zscaler admin console)
   - Verify app connector is healthy in ZPA admin portal
   - Test with `nslookup {app-hostname}` — should resolve to Zscaler IP, not real IP
5. **Trading floor exception:** Trading floor systems are NOT accessible via ZPA (air-gapped network). Users must be physically on the trading floor.

### Connector Issues
- Apex has 2 ZPA connectors (primary + backup)
- If both are down: escalate to Network Ops immediately (P1)
- Connector health: check ZPA admin portal > Administration > Connectors

### Policy Sync Delays
- ZPA policy changes take up to 5 minutes to propagate
- If user was recently granted access: wait 5 minutes, then have user disconnect/reconnect Zscaler
- Conditional Access rules from Azure AD may also affect ZPA access

## WireGuard — TechStart Innovation

### New Peer Configuration
**For new employees or new devices:**
1. Generate key pair on user's device:
   ```
   wg genkey | tee privatekey | wg pubkey > publickey
   ```
2. Send public key to TechStart CTO (akim@techstart.io) for server-side config
3. CTO adds peer to WireGuard server and provides:
   - Server endpoint: wg.techstart.io:51820
   - Server public key
   - Allowed IPs: 10.100.0.0/24 (dev environment)
   - DNS: 10.100.0.1
4. User creates config file and imports into WireGuard client
5. **Note:** Bulletproof does NOT manage TechStart's WireGuard server — only assist users with client setup

### Key Rotation
- Keys should be rotated every 6 months
- Process: generate new key pair, send new public key to CTO, update config
- Old key is removed from server after confirmation of new key working

### MTU Tuning
- Default MTU: 1420
- If user experiences packet loss or slow speeds: try reducing MTU to 1380
- WireGuard client > Edit tunnel > set MTU field

### Common Issues
- **"Handshake did not complete":** Server unreachable or wrong public key. Verify endpoint and keys.
- **"Interface already exists":** Close and reopen WireGuard client
- **DNS not resolving:** Check DNS field in config, try adding 8.8.8.8 as fallback

## General Connectivity Troubleshooting

### Cannot reach any internal resources (all clients)
1. Verify VPN is connected (check client status)
2. Try `ping` to known internal IP (not hostname — rules out DNS)
3. If ping works but hostname doesn't: DNS issue
   - Flush DNS: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)
4. If ping fails: VPN tunnel issue
   - Disconnect and reconnect VPN
   - Try different network (switch from WiFi to mobile hotspot)
5. If still failing: escalate to Network Ops with traceroute output

### Slow VPN performance
1. Check user's base internet speed (speedtest.net without VPN)
2. Compare with VPN speed
3. If base speed is low: ISP issue, not VPN
4. If VPN significantly slower: check VPN server load, try alternate gateway if available
5. For full tunnel configs (GamingCo): slowdown is expected for internet traffic — explain to user
