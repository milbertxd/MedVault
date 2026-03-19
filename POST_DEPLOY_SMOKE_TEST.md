# Post-Deploy Smoke Test

Use this checklist after every Render deployment.

## 1) Service Health

- [ ] Open API health endpoint: `https://<api-domain>/api/health`
- [ ] Confirm response includes `status: ok`
- [ ] Confirm response includes `database: connected`

## 2) Frontend Connectivity

- [ ] Open app login page: `https://<web-domain>/login`
- [ ] Hard refresh browser (`Ctrl+F5`) to avoid stale frontend bundle
- [ ] Login with CHO Admin credentials
- [ ] Confirm Dashboard loads without API errors in browser console

## 3) Seed Baseline Data (Fresh DB Only)

- [ ] Run seed from local machine against production database:

```bash
cd server
npm run seed
```

- [ ] Confirm console shows:
  - `Health centers upserted`
  - `Default users upserted`
  - `Default medicines upserted`

## 4) Core Functional Smoke Tests

- [ ] Inventory list loads
- [ ] Two default medicines are visible
- [ ] Add a medicine successfully
- [ ] Edit an existing medicine successfully
- [ ] Adjust stock (+) successfully
- [ ] Adjust stock (-) successfully
- [ ] QR dispense succeeds and decrements stock
- [ ] Low-stock warning appears when expected

## 5) Audit + Reports Validation

- [ ] Logs page opens
- [ ] Recent actions appear in audit trail
- [ ] Dispensing history contains QR dispense event
- [ ] Reports PDF endpoint returns a downloadable file

## 6) RBAC Validation

- [ ] `barangay_staff` can manage stock for assigned center
- [ ] `cho_admin` can view/manage all centers
- [ ] `cho_monitor` can view data but cannot mutate inventory

## 7) Failure Triage (Fast)

If anything fails:

- [ ] Check Render API logs for failed endpoint and stack trace
- [ ] Check browser Network tab response body (status + message)
- [ ] Verify `VITE_API_URL` points to the correct API `/api` URL
- [ ] Verify API `CLIENT_URL` exactly matches deployed web origin
- [ ] Re-run seed if DB was reset or migrated
