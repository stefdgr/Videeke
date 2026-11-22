// Tekst herkennen op een foto van een kookboekpagina, volledig in de browser (gratis, geen API-sleutel).
// Tesseract wordt pas geladen als je deze functie gebruikt.
export async function readText(file, onProgress = () => {}) {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker(['nld', 'eng'], 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress(Math.round(m.progress * 100));
    },
  });
  try {
    const { data } = await worker.recognize(file);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
