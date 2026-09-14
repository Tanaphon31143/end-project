import assert from 'node:assert/strict';
import test from 'node:test';
import { validateIssueImage, MAX_ATTACHMENT_BYTES } from '../src/lib/issue-attachment-rules.mjs';
test('attachments reject disguised files, empty files and oversized images', () => {
  assert.equal(validateIssueImage('image/png', Buffer.from('<script>bad</script>')), false);
  assert.equal(validateIssueImage('image/jpeg', Buffer.alloc(0)), false);
  const bytes = Buffer.alloc(MAX_ATTACHMENT_BYTES + 1); bytes.set([255,216,255]);
  assert.equal(validateIssueImage('image/jpeg', bytes), false);
  assert.equal(validateIssueImage('image/svg+xml', Buffer.from('<svg/>')), false);
  assert.equal(validateIssueImage('image/png', Buffer.from([137,80,78,71,13,10,26,10])), true);
  assert.equal(validateIssueImage('image/webp', Buffer.from('RIFF1234WEBP')), true);
});
