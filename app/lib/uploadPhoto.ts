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
  // On native we have to ask for photo-library permission first.
  // On web the picker is just a file input dialog — no permission needed.
  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      throw new Error(
        'Galeri erişimi verilmedi. Ayarlar üzerinden Sweetart için fotoğraflara izin verin.',
      );
    }
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

  // Pick a sensible extension + content type.
  const mime = asset.mimeType ?? guessMime(uri);
  const ext = mimeToExt(mime);
  const filename = `${userId}/${Date.now()}.${ext}`;

  // Read the picked file. On web we get a blob URL, on native a file:// URI.
  let body: ArrayBuffer | Blob;
  if (Platform.OS === 'web') {
    body = await fetch(uri).then((r) => r.blob());
  } else {
    body = await fetch(uri).then((r) => r.arrayBuffer());
  }

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
