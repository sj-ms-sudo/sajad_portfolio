// Re-export a map PNG as WebP.
//   npm i -D sharp
//   node scripts/compress-map.mjs [input.png] [output.webp] [quality]
// Defaults: public/maps/general-district-bg.png -> .webp at quality 92 (visually identical for this art).
import sharp from 'sharp';

const [
  input = 'public/maps/general-district-bg.png',
  output = input.replace(/\.png$/i, '.webp'),
  quality = '92',
] = process.argv.slice(2);

const info = await sharp(input).webp({ quality: Number(quality), effort: 6 }).toFile(output);
console.log(`${output}: ${(info.size / 1048576).toFixed(2)} MB (${info.width}x${info.height})`);
