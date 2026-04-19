import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

function sanitizePathSegment(value: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'team';
}

async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () =>
        reject(new Error('No fue posible leer la imagen pegada.'));
      img.src = objectUrl;
    });

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function convertImageBlobToJpeg(blob: Blob): Promise<Blob> {
  const image = await loadImageFromBlob(blob);
  const canvas = document.createElement('canvas');

  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('No fue posible preparar la imagen para subirla.');
  }

  context.drawImage(image, 0, 0);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      convertedBlob => {
        if (!convertedBlob) {
          reject(new Error('No fue posible convertir la imagen a JPEG.'));
          return;
        }

        resolve(convertedBlob);
      },
      'image/jpeg',
      0.92,
    );
  });
}

export async function uploadPlayerImage(
  blob: Blob,
  teamKey: string,
  playerNumber: number,
): Promise<string> {
  const storage = getStorage();
  const convertedBlob = await convertImageBlobToJpeg(blob);
  const safeTeamKey = sanitizePathSegment(teamKey);
  const path = `players/${safeTeamKey}/${playerNumber}-${Date.now()}.jpg`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, convertedBlob, {
    contentType: 'image/jpeg',
  });

  return getDownloadURL(storageRef);
}

export async function readImageFromClipboard(): Promise<Blob> {
  if (!navigator.clipboard?.read) {
    throw new Error(
      'Este navegador no permite leer imágenes del portapapeles. Intenta pegar con Ctrl+V o Cmd+V en escritorio.',
    );
  }

  let clipboardItems: ClipboardItems;
  try {
    clipboardItems = await navigator.clipboard.read();
  } catch {
    throw new Error(
      'No fue posible leer el portapapeles. Revisa permisos del navegador y que la página esté en HTTPS.',
    );
  }

  if (clipboardItems.length === 0) {
    throw new Error('El portapapeles está vacío.');
  }

  for (const clipboardItem of clipboardItems) {
    const imageType = clipboardItem.types.find(type =>
      type.startsWith('image/'),
    );

    if (imageType) {
      return clipboardItem.getType(imageType);
    }
  }

  throw new Error('El portapapeles no contiene una imagen.');
}
