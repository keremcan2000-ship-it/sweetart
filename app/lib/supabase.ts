import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Copy app/.env.example to app/.env and fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

// gotrue-js uses navigator.locks under the hood on web. With React Strict
// Mode + remounts during dev, we hit the documented "Lock not released
// within 5000ms" deadlock that pauses every subsequent supabase call (DB
// updates, function invocations, you name it). Replace it with a
// minimal in-process lock so we keep the serialization guarantees the
// auth client expects without ever waiting on a cross-tab lock.
let _locks: Promise<unknown> = Promise.resolve();
const noWebLock = async <R,>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> => {
  const next = _locks.then(fn, fn);
  _locks = next.catch(() => {});
  return next;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    ...(Platform.OS === 'web' ? { lock: noWebLock as any } : {}),
  },
});
