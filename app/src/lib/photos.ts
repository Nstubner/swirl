import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

/** Let the user pick a photo, upload it to their folder in the `photos` bucket, return its public URL. */
export async function pickAndUploadPhoto(userId: string): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 5],
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const contentType = asset.mimeType ?? 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : contentType.includes('heic') ? 'heic' : 'jpg';
  const body = await (await fetch(asset.uri)).arrayBuffer();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('photos').upload(path, body, { contentType, upsert: false });
  if (error) throw error;
  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
}

/** Remove a photo from storage given its public URL (best effort). */
export async function deletePhoto(url: string) {
  const marker = '/object/public/photos/';
  const i = url.indexOf(marker);
  if (i < 0) return;
  await supabase.storage.from('photos').remove([url.slice(i + marker.length)]);
}
