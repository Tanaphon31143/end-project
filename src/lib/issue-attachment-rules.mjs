export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENTS = 5;
export function validateIssueImage(mime, bytes) {
  if (!bytes?.length || bytes.length > MAX_ATTACHMENT_BYTES) return false;
  const starts = (signature) => signature.every((byte, index) => bytes[index] === byte);
  if (mime === 'image/jpeg') return starts([255, 216, 255]);
  if (mime === 'image/png') return starts([137, 80, 78, 71, 13, 10, 26, 10]);
  if (mime === 'image/webp') return starts([82, 73, 70, 70]) && [87, 69, 66, 80].every((byte, index) => bytes[index + 8] === byte);
  return false;
}
