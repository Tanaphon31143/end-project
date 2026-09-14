# Student face self-enrollment

## Setup

Apply the face-enrollment, identity/history and email-binding migrations:

```powershell
npm run db:student-face-self-enrollment
npm run db:student-face-identity
npm run db:student-face-email-binding
```

Google OAuth must already be configured with the existing `/api/auth/google/callback` redirect URI. Mobile devices need an HTTPS origin and browser camera permission. The application intentionally does not collect a new raw IP address for this flow until the privacy policy is confirmed.

## Flow

1. A signed student session and active student record are required; the student-session email must still match that active student record. The student accepts biometric-processing consent.
2. The existing Google OAuth callback checks a fresh state and obtains Google's verified email and stable account `sub`. The email may be personal or organizational, but must match the active student record exactly after normalization. This latest requirement supersedes the earlier any-email request. No client-provided student ID is accepted.
3. The browser obtains a camera feed and runs three different randomized Human liveness gestures. The server uses a one-time challenge token and checks gesture order, thresholds and timing. It records the result against the 10-minute identity verification.
4. The browser captures FRONT, LEFT, RIGHT, UP and DOWN with the existing Human face detector and descriptor, and requires the detected gesture to match each requested pose. The API requires five unique poses, checks file format, dimensions, luminance, sharpness, descriptor structure and same-person similarity. Server-side SHA-256 and perceptual dHash reject identical/near-identical submitted images, and compare them against active profiles belonging to other students along with the descriptors. Existing samples have SHA-256 backfilled; only newly enrolled samples have dHash.
5. A transaction writes five samples, a READY face profile (the existing schema's active/usable status) and a unique binding of one Google `sub`/verified email to one student and one current face profile. A student who already has a binding must reuse the same Google account and email; another email cannot replace it via self-service. Replacing a profile archives its old metadata as REVOKED, removes old samples and inserts a new profile. An INACTIVE profile cannot be self-reactivated. The identity verification is marked USED. Audit events are written to `audit_logs` with `user_id` equal to `student_id` and device user-agent; raw IP remains NULL pending privacy-policy approval.

## Important security limitation

Human detection and gesture inference currently run in the **client browser**. The server validates a one-time challenge but receives client-reported embeddings, scores, pose labels and gesture evidence. A modified client can forge those values or submit a different image that is not detected by the hashes. Sharp image checks and perceptual hashes do not prove that the image contains a live person or that every image of the same person will be matched. The duplicate threshold (`0.78`) is a conservative heuristic, not a calibrated production decision threshold. Also, Google email ownership does **not** prove that the Google account holder is the person in the school student record. This flow must not be represented as spoof-resistant production biometric verification until server-side or independently attested liveness/face analysis and an independent student-identity check are integrated, evaluated against real devices and attack samples, and reviewed under the school's biometric-data policy.

## Tests

```powershell
npm test
npm run build
$env:RUN_STUDENT_INTEGRATION='1'; node --env-file=.env.local --test tests/student-face-self-enrollment.integration.test.mjs
```

The integration test checks authorization and rendering, not a live Google login, physical camera, successful enrollment or replacement. Those must be exercised in a dedicated test database before production rollout.
