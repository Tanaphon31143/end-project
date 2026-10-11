# Portal features

Run `node --env-file=.env.local scripts/migrate-portal-features.mjs` before using announcements and password recovery. The migration only creates the two new tables and can be repeated safely.

Admins publish or hide real announcements at `/admin/announcements`; published announcements appear on the student dashboard, newest first. No sample announcements are inserted.

Header search reads the database and caps results per category. Teachers can search active students in classrooms of their own active subjects, plus their own active subjects. Admins can search students, teachers, subjects and classrooms. Search includes keyboard selection, cancellation of outdated requests, and retry on errors.

Password recovery requires server environment variables:

```env
APP_URL=https://your-school.example
RESEND_API_KEY=your-resend-api-key
PASSWORD_RESET_FROM=School OS <no-reply@your-verified-domain.example>
```

The sender must be verified with Resend. The app uses the official email endpoint: https://resend.com/docs/api-reference/emails/send-email. Without configuration, the recovery form reports that email delivery is unavailable. Secrets must never use `NEXT_PUBLIC_`.

Check configuration without printing secrets with `node --env-file=.env.local scripts/check-password-recovery.mjs`. For local development, `APP_URL=http://localhost:3000` is supported. For deployment, use the actual HTTPS website URL and set the same three variables in the host's secret manager. The configuration check does not send email or prove that the API key and verified sender are accepted by the provider.

Reset links expire in 30 minutes. Only SHA-256 token hashes are stored. Resetting locks the token and account, updates the password, consumes all outstanding account tokens, and revokes existing sessions in one transaction. Public request responses do not disclose whether an account exists. Rate limits use the existing database-backed authentication limits. Email delivery failures invalidate the new token and produce a server log without the email or token.
