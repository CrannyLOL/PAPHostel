# 🔒 Security & Access Control Documentation

## Overview
This document outlines the security restrictions and access control measures implemented in the Golden Beach Guest House management system.

## Role-Based Access Control (RBAC)

### 1. Administrator (Admin)
**Full Access to:**
- ✅ Admin Panel (admin.html)
- ✅ All statistics and analytics
- ✅ Room management
- ✅ Reservation management
- ✅ **Guest account data** (email, password, phone, CC, nationality)
- ✅ Export guest account data (CSV/TXT)
- ✅ Block date management
- ✅ Block history
- ✅ Reservation history
- ✅ Stay history
- ✅ Staff management

### 2. Staff
**Allowed Access to:**
- ✅ Staff Panel (staff.html)
- ✅ Room occupancy calendar
- ✅ Today's occupied rooms
- ✅ Upcoming check-ins (7 days)
- ✅ Block date management
- ✅ Block history
- ✅ Guest names and room numbers (basic info only)

**Restricted Access (BLOCKED):**
- ❌ Admin Panel (admin.html) - BLOCKED
- ❌ Guest account data (email, password, phone, CC, etc.)
- ❌ Export guest account data
- ❌ Financial information
- ❌ Reservation history
- ❌ Stay history
- ❌ Any personal guest information beyond names

### 3. Clients (Guests)
**Allowed Access to:**
- ✅ Client Portal (client.html) - After login
- ✅ View their own account information
- ✅ View their own reservations
- ✅ View their stay history

**Restricted Access:**
- ❌ Other guests' information
- ❌ Admin Panel
- ❌ Staff Panel
- ❌ Any admin functions

## Security Implementation

### Frontend Security Measures

#### 1. Authentication Checks
```javascript
// admin.js - Lines 35-48
- Only users with adminLoggedIn=true can access admin.html
- Staff users with staffLoggedIn=true are BLOCKED
- Automatic redirect if not admin
```

#### 2. Data Protection
```javascript
// admin.js - carregarHistoricoContas() - ADMIN ONLY
- Security check before loading guest accounts
- Blocks staff access at data loading level
- Blocks staff access at rendering level

// admin.js - getHistoricoContasExportData() - ADMIN ONLY
- Prevents export of guest data by non-admin users
- Alerts user if unauthorized export attempt
```

#### 3. Data Masking
- **Email Display**: First 3 chars + "***@***" (e.g., "joe***@***")
- **CC Numbers**: First 2 digits + " **** **** " + Last 2 digits (e.g., "12 **** **** 34")
- Displayed in tables and exports for privacy protection

### Backend Security (Firebase)
- Guest data stored in `guests` collection
- Firestore security rules should enforce admin-only read access
- No sensitive data transmitted in URLs or logs

## Protected Data

**Guest Account Data (ADMIN ONLY):**
- Email address
- Password (hashed)
- Phone number
- CC number
- Nationality
- Account creation date
- Account status

**Reservation Data:**
- Reservation status auto-update based on checkout date
- Guest names visible to staff (basic info)
- Full reservation details restricted to admin

## Testing

A security test page is available at: `security-test.html`

To verify access control:
1. Login as Admin: Check admin.html accessibility and guest data visibility
2. Login as Staff: Verify admin.html is blocked
3. Login as Client: Verify client.html shows only personal data
4. Navigate to security-test.html to see current access level

## Audit Trail

All sensitive operations are logged:
- Admin login/logout
- Guest account views
- Data exports
- Reservation status changes
- Auto-updates via system

## Incident Response

If unauthorized access is suspected:
1. Check browser console for security warnings
2. Review localStorage for token tampering
3. Clear all browser data and re-login
4. Report to system administrator

---

**Last Updated:** May 4, 2026
**Version:** 1.0
**Security Level:** Medium (Frontend + Firestore Rules Required)
