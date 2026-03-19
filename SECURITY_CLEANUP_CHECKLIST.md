# Security Cleanup Checklist

Run this checklist before and after major production releases.

## 1) Secrets and Environment

- [ ] Rotate `JWT_SECRET` if it was ever shared or committed
- [ ] Ensure `MONGODB_URI` is only in Render/secure env storage
- [ ] Ensure no `.env` files are committed
- [ ] Confirm frontend uses only `VITE_API_URL` (no embedded secrets)

## 2) CORS and Origin Integrity

- [ ] API `CLIENT_URL` is set to exact deployed frontend origin
- [ ] Only trusted origins are allowed in CORS policy
- [ ] No wildcard origin in production (`*`)
- [ ] Verify preflight `OPTIONS` passes for authenticated routes

## 3) Auth and Session Controls

- [ ] JWT expiry is set (for example `7d`)
- [ ] Password policy is enforced through validators
- [ ] Inactive users cannot authenticate
- [ ] Role checks are enforced on all mutating endpoints

## 4) Data Integrity

- [ ] Seed script is idempotent and safe to re-run
- [ ] Required medicine fields are validated server-side
- [ ] QR code uniqueness is enforced per health center
- [ ] Audit logs are written for create/update/delete/dispense actions

## 5) Dependency and Runtime Hygiene

- [ ] Run `npm audit` in both `server` and `client`
- [ ] Update high/critical vulnerable dependencies
- [ ] Keep Node version aligned between local and Render
- [ ] Remove dead code and unused environment variables

## 6) Monitoring and Incident Readiness

- [ ] Render logs reviewed after each deploy
- [ ] Health endpoint monitored (`/api/health`)
- [ ] Error spikes trigger investigation path
- [ ] Backup/restore plan documented for MongoDB Atlas

## 7) Release Discipline

- [ ] Tag known-good release in git
- [ ] Keep a short rollback procedure in README
- [ ] Execute full post-deploy smoke test before sign-off
