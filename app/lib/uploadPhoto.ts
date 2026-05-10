import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

/**
 * Opens the device photo library, lets the user pick + crop an image,
 * uploads it to the `profile-photos` Supabase Storage bucket, and
 * returns the public URL. Returns null if the user cancels.
 *
 * Throws on permission denial or upload failure.
 */
export async function pickAndUploadPhoto(userId: string): Promise<string | null> {
  // -----------------------------------------------------------------
  // Web path: use a direct <input type="file"> instead of the expo
  // image-picker. Reason: expo's web shim does not reliably resolve
  // when the user dismisses the file dialog without picking — the
  // promise hangs forever, leaving the caller's `busy` state stuck.
  // A native input + window-focus heuristic gets us a clean cancel.
  // -----------------------------------------------------------------
  if (Platform.OS === 'web') {
    const file = await pickFileWeb();
    if (!file) return null;
    return uploadBlob(userId, file, file.type || guessMime(file.name));
  }

  // -----------------------------------------------------------------
  // Native path: expo-image-picker, with permission check + cropper.
  // -----------------------------------------------------------------
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error(
      'Galeri erişimi verilmedi. Ayarlar üzerinden Sweetart için fotoğraflara izin verin.',
    );
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    // 'images' is the new SDK 50+ form; falls back gracefully on older.
    mediaTypes: ImagePicker.MediaTypeOptions
      ? ImagePicker.MediaTypeOptions.Images
      : ('images' as any),
    allowsEditing: true,
    aspect: [3, 4],
    quality: 0.85,
  });

  if (result.canceled || !result.assets || !result.assets[0]) return null;

  const asset = result.assets[0];
  const uri = asset.uri;
  const mime = asset.mimeType ?? guessMime(uri);
  const buf = await fetch(uri).then((r) => r.arrayBuffer());
  return uploadBlob(userId, buf, mime);
}

// ---------------------------------------------------------------
// Web file-picker shim. Resolves with the picked File, or null if
// the user cancels.
//
// We don't attach the input to the DOM — `input.click()` works on
// detached elements and avoids weird focus / pointer-events races
// that broke the previous version. Cancel is detected via the
// modern `cancel` event, with a window-focus fallback for browsers
// (older Safari) that don't dispatch it.
// ---------------------------------------------------------------
function pickFileWeb(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/heic';

    let done = false;
    const finish = (val: File | null) => {
      if (done) return;
      done = true;
      window.removeEventListener('focus', onWindowFocus);
      resolve(val);
    };

    input.onchange = () => {
      finish(input.files && input.files[0] ? input.files[0] : null);
    };
    // Modern Chromium dispatches `cancel` when user dismisses dialog.
    (input as any).oncancel = () => finish(null);

    // Fallback: when the picker dialog closes the page regains focus.
    // Wait a tick for a possible `change` event to win the race.
    const onWindowFocus = () => {
      setTimeout(() => {
        if (!input.files || input.files.length === 0) finish(null);
      }, 350);
    };
    window.addEventListener('focus', onWindowFocus);

    // Note: do NOT append to DOM. `click()` works on detached inputs
    // in all modern browsers and avoids style/pointer-events bugs.
    input.click();
  });
}

async function uploadBlob(
  userId: string,
  body: Blob | ArrayBuffer,
  mime: string,
): Promise<string> {
  const ext = mimeToExt(mime);
  const filename = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('profile-photos')
    .upload(filename, body, { contentType: mime, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('profile-photos').getPublicUrl(filename);
  return data.publicUrl;
}

function guessMime(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  return 'image/jpeg';
}

function mimeToExt(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/heic') return 'heic';
  return 'jpg';
}
