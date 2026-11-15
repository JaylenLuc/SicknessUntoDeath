import sharp from "sharp";
import { fileURLToPath } from "node:url";

// Keep the original drawings untouched; pack centered frames for one small download.
const directory = new URL("../../public/station_zoom_animations/", import.meta.url);
const names = ["Drawing.png", "Drawing (1).png", "Drawing (2).png", "Drawing (3).png"];
const frameSize = 192;
const frames = await Promise.all(names.map(async (name, index) => {
  const source = sharp(fileURLToPath(new URL(name, directory)));
  const { data, info } = await source.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = 0, bottom = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 20) {
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
  }
  if (left > right || top > bottom) throw new Error(`Empty animation frame: ${name}`);
  const input = await source.extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize(168, 168, { fit: "contain", background: "#00000000" })
    .extend({ top: 12, bottom: 12, left: 12, right: 12, background: "#00000000" })
    .png().toBuffer();
  return { input, left: index * frameSize, top: 0 };
}));

await sharp({ create: { width: frameSize * frames.length, height: frameSize, channels: 4, background: "#00000000" } })
  .composite(frames).png().toFile(fileURLToPath(new URL("station-probe-sprite.png", directory)));
