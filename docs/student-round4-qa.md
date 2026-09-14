# Student round 4 verification

## Automated

- `npm run test:student`: all student rule tests; integration tests skip unless explicitly enabled.
- PowerShell: `$env:RUN_STUDENT_INTEGRATION='1'; node --env-file=.env.local --test tests/student-round4.integration.test.mjs`
  - Requires the local server and matching AUTH_SECRET.
  - 12 endpoint/method combinations × 5 denied authentication scenarios.
  - Malformed notification pagination and PATCH bodies return 400 before writes.
  - Round 4 integration does not create or modify database fixtures.
- `npm run build` and `npm run lint`.

Existing round 1–3 integration tests require database access and some create temporary fixtures. Use a test database/server with matching configuration; do not enable them indiscriminately against production.

## Manual browser acceptance (not yet verified)

- Navigate all student routes on desktop/mobile; confirm loading/error fallback without exposing server details. Retry must re-fetch the failed page.
- Tab to the skip link, then content. Open the mobile drawer: Tab/Shift+Tab stay within it, Escape closes it and focus returns to its trigger. Closed mobile navigation must not receive focus.
- Open each profile edit/password/request modal and attachment preview. Check initial focus, Tab/Shift+Tab, Escape, focus restoration and long-content scrolling at narrow widths.
- Submit a valid profile edit or issue report: success toast appears without moving focus. Disconnect network: form remains editable after failure and error can be read/dismissed.
- During profile submission, close/cancel must remain disabled. Verify assistive technology reads field labels and errors.
- Verify reduced-motion preference removes student animations.
- Real-camera permission, liveness accuracy and real-device behavior remain manual acceptance tests, not covered by HTTP tests.

Student-level loading/error boundaries cover descendant pages, not failures in the same student layout's session/identity fetch (a Next.js boundary limitation).
