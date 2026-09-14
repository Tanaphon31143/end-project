import sharp from 'sharp';

/** Difference hash for detecting reuse of the same photo after resizing/re-encoding. */
export async function imageDifferenceHash(image) {
  const { data, info } = await sharp(image, { limitInputPixels: 2_560_000 })
    .greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  if (info.width !== 9 || info.height !== 8 || info.channels !== 1) throw new Error('Invalid image for hashing');
  let bits = 0n;
  for (let row = 0; row < 8; row++) {
    for (let column = 0; column < 8; column++) {
      bits = (bits << 1n) | BigInt(data[row * 9 + column] > data[row * 9 + column + 1] ? 1 : 0);
    }
  }
  return bits.toString(16).padStart(16, '0');
}

export function imageHashDistance(left, right) {
  if (!/^[0-9a-f]{16}$/i.test(left) || !/^[0-9a-f]{16}$/i.test(right)) return 64;
  let difference = BigInt(`0x${left}`) ^ BigInt(`0x${right}`);
  let bits = 0;
  while (difference) { bits += Number(difference & 1n); difference >>= 1n; }
  return bits;
}
