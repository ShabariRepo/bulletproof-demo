# Password & Account Procedures

## Azure AD (Entra ID) — GamingCo, Apex Financial, Maple Ridge (hybrid)

### Self-Service Password Reset (SSPR)
1. User navigates to https://passwordreset.microsoftonline.com
2. Enters username (UPN format: user@domain.com)
3. Completes MFA verification (Authenticator app, SMS, or phone call)
4. Sets new password (must meet complexity: 14+ chars, upper/lower/number/special)
5. Password syncs to on-prem AD within 2 minutes (hybrid environments)

### Admin-Initiated Password Reset
**When to use:** User cannot complete SSPR (locked out of MFA, no recovery methods)
1. Verify user identity: ask security questions (mother's maiden name, employee ID, manager name)
2. Navigate to Azure AD Admin Center > Users > [user] > Reset Password
3. Generate temporary password (auto-generated, force change at next login)
4. Communicate temporary password via secure channel (phone call only, never email)
5. Confirm user can log in and set new password
6. Document in Halo ticket

### MFA Reset / Re-enrollment
**When to use:** User lost phone, changed phone number, or Authenticator app not working
1. Verify user identity (same as above)
2. Azure AD Admin Center > Users > [user] > Authentication Methods
3. Delete existing MFA methods (phone, authenticator)
4. User will be prompted to re-enroll at next login
5. For Authenticator app: user scans QR code from https://aka.ms/mfasetup
6. For SMS: user enters new phone number during enrollment
7. **GamingCo special:** Must re-enable Conditional Access compliance check after re-enrollment

### Account Lockout (Azure AD)
- Azure AD Smart Lockout: 10 failed attempts, 60-second lockout (auto-resets)
- If persistent lockout: check Azure AD Sign-in logs for suspicious activity
- To manually unlock: Azure AD Admin Center > Users > [user] > no manual unlock needed (auto-unlocks)
- If Conditional Access blocking: check compliance state, device enrollment, location policy

## Okta — Northern Health Network, TechStart

### Admin Console Password Reset
1. Verify user identity: employee ID + date of birth
2. Okta Admin Console > Directory > People > [user]
3. Click "Reset Password" > choose "Set by admin" or "Email reset link"
4. **Northern Health:** Always use "Set by admin" for clinical staff (no email access during patient care)
5. Set temporary password, check "User must change password on next login"
6. Communicate via phone call

### Factor Reset (MFA)
1. Okta Admin Console > Directory > People > [user] > Multifactor
2. Click "Reset" next to each enrolled factor
3. User will be prompted to re-enroll at next login
4. **Northern Health:** If clinical staff needs immediate access, use break-glass procedure (see below)

### Break-Glass Access (Northern Health ONLY)
**CRITICAL: Only for clinical emergencies where patient care is at risk**
1. Verify: caller is clinical staff, patient care situation is active
2. Log break-glass access request in Halo with: requester name, patient context (no PHI), time
3. Okta Admin Console > Directory > People > [user]
4. Under "More Actions" > "Unlock Account" if locked
5. Issue temporary bypass code: Admin Console > Security > Multifactor > [user] > Generate Bypass Code
6. Bypass code valid for 1 hour, single use
7. Notify CISO (Maria Santos) within 15 minutes of break-glass activation
8. Schedule follow-up: user must re-enroll MFA within 24 hours

### Account Lockout (Okta)
- Lockout after 5 failed attempts, 30-minute auto-unlock
- Manual unlock: Admin Console > Directory > People > [user] > "Unlock"
- Check System Log for failed login source IPs

## On-Premises Active Directory — Maple Ridge, Pinnacle Properties

### Password Reset via ADUC
1. Open Active Directory Users and Computers (ADUC)
2. Find user: right-click domain > Find > enter username or display name
3. Right-click user > Reset Password
4. Enter new temporary password (must meet domain policy)
5. Check "User must change password at next logon"
6. Click OK
7. **Maple Ridge:** Password must be 14+ characters (Group Policy enforced)
8. **Pinnacle:** Password must be 8+ characters (basic policy)

### Account Unlock via ADUC
1. Open ADUC > Find user
2. Double-click user > Account tab
3. Check "Unlock account" checkbox
4. Click Apply > OK
5. **Maple Ridge:** Account locks after 5 failed attempts, auto-unlock after 30 minutes
6. **Pinnacle:** Account locks after 10 failed attempts, auto-unlock after 15 minutes

### Remote Reset (Maple Ridge — hybrid)
- If user is remote and AD Connect is syncing: reset in Azure AD, wait 2 min for sync
- If AD Connect sync is delayed: reset directly in on-prem ADUC via VPN to domain controller
- Verify sync status: Azure AD Connect Health dashboard

### Shared Account Password Reset (Pinnacle ONLY)
- Reception desk shared accounts: reset password, notify all users of that desk
- Document new password in Pinnacle's internal password sheet (physical binder in IT office)
- Shared accounts are exempt from expiry policy

## Common Scenarios

### "I forgot my password and I'm locked out of MFA"
1. Verify identity via security questions or employee ID + manager confirmation
2. For Azure AD: Admin reset password + clear MFA methods + user re-enrolls
3. For Okta: Admin reset password + generate bypass code + user re-enrolls MFA
4. For On-prem AD: ADUC reset + unlock account
5. Always create Halo ticket with resolution details

### "My account shows as disabled"
1. Check if user is terminated (HR system integration)
2. If not terminated: re-enable account (Azure AD/Okta/ADUC)
3. Check if disabled by automated policy (e.g., 90-day inactivity)
4. Escalate to Tier 2 if cause is unclear

### "I'm getting 'Your account has been compromised' in Azure AD"
1. This is Azure AD Identity Protection risk detection
2. Do NOT reset password yet — escalate to SOC team
3. Check Azure AD > Security > Risky Users for details
4. SOC will investigate and determine if account was actually compromised
5. Log everything in Halo ticket
