import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { imageDifferenceHash, imageHashDistance } from '../src/lib/face-image-hash.mjs';

test('same picture retains its difference hash after JPEG re-encoding', async () => {
  const gradient = Buffer.alloc(90 * 80 * 3);
  for (let y = 0; y < 80; y++) for (let x = 0; x < 90; x++) {
    const index = (y * 90 + x) * 3;
    gradient[index] = x * 2; gradient[index + 1] = y * 2; gradient[index + 2] = 80;
  }
  const original = await sharp(gradient, { raw: { width: 90, height: 80, channels: 3 } }).jpeg({ quality: 95 }).toBuffer();
  const reencoded = await sharp(original).resize(450, 400).jpeg({ quality: 72 }).toBuffer();
  const a = await imageDifferenceHash(original), b = await imageDifferenceHash(reencoded);
  assert.ok(imageHashDistance(a, b) <= 6);
  assert.equal(imageHashDistance(a, 'bad'), 64);
});
