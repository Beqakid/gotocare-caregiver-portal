# Security Hardening — Feature Branch

Branch: feature/security-hardening-core  
Date: 2026-05-27  
Purpose: All security hardening patches will be committed to this branch only.

Issues being addressed:
1. Session tokens in URL query params → move to Authorization header
2. search-caregivers exposes email/phone publicly
3. R2 document access missing ownership check
4. No Content Security Policy headers
5. Missing rate limiting on forgot-password endpoint
6. No explicit 401 → logout handler on frontend
7. Password reset token not confirmed single-use
