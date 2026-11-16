/**
 * Shrinks a phone photo in the browser before upload. A 12 MP camera image
 * is 3-6 MB; a receipt stays perfectly legible at 1800 px on the long edge
 * and ~300 KB, which uploads fast on supermarket mobile data.
 */
const MAX_EDGE = 1800;

export async function downscaleImage(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    // "from-image" applies the EXIF rotation phones store instead of
    // rotating the pixels, so portrait receipts don't arrive sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Format the browser can't decode (e.g. HEIC on some desktops): send
    // the original and let the server validate it.
    return file;
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  return blob ? new File([blob], "receipt.jpg", { type: "image/jpeg" }) : file;
}
