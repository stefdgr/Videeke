// Verklein een foto in de browser voor hij geüpload wordt (scheelt opslag en tijd op mobiel).
export async function resizeImage(file, maxSize = 1600, quality = 0.82) {
  const bitmap = await createImageBitmap(file).catch(() => null);
  const source = bitmap || (await loadImg(file));
  const scale = Math.min(1, maxSize / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

function loadImg(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
