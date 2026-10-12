export async function resizeImage(file, size = 480, quality = 0.82) {
    const bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    canvas.getContext('2d').drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Gagal memproses gambar'))),
            'image/webp',
            quality
        );
    });
}