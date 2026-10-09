/**
 * PROFILE PHOTO helpers — file ko compressed base64 WebP mein badalta hai
 * (max 400px width, 0.8 quality) taake jsonb column mein chhoti rahe.
 * Student ke saath-saath Teacher/Coordinator/Principal/Developer photos bhi
 * isi se aati hain (Admin Hub / Settings / Developer portal upload se).
 */
export function convertToWebP(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Failed to get canvas context');

        // Balanced size to save sync bandwidth while maintaining clarity
        const maxWidth = 400;
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // 0.8 quality provides high fidelity for portrait photos
        const webpBase64 = canvas.toDataURL('image/webp', 0.8);
        resolve(webpBase64);
      };
      img.onerror = () => reject('Image load error');
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject('File read error');
    reader.readAsDataURL(file);
  });
}

/** Common validation + conversion for photo uploads (5MB cap, toast-friendly errors). */
export async function processPhotoFile(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image size must be less than 5MB');
  }
  return convertToWebP(file);
}