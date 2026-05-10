// Sweetart — delete-account Edge Function
//
// Required for App Store / Play Store submission (Apple Guideline
// 5.1.1(v)) — apps that allow account creation must allow in-app
// deletion. This function:
//
//   1. Authenticates the caller via their JWT
//   2. Removes their photos from Storage (objects don't cascade with
//      the auth.users row delete)
//   3. Deletes the auth user via the admin client; this cascades to
//      profiles, swipes, matches, messages, briefs, brief_groups,
//      brief_group_members, profile_photos, blocks, reports — all of
//      which reference profiles(id) on delete cascade.
//
// Env (set as Supabase secrets):
//   SUPABASE_URL                 (auto-set by Supabase)
//   SUPABASE_SERVICE_ROLE_KEY    (auto-set by Supabase)
//   SUPABASE_ANON_KEY            (auto-set by Supabase)
//
// Returns:
//   { status: 'deleted' }
//   { status: 'error', reason: '...' }

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // 1) Verify the caller — they must present a valid JWT.
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return json({ status: 'error', reason: 'missing_auth' }, 401);
    }
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) {
      return json({ status: 'error', reason: 'invalid_auth' }, 401);
    }
    const userId = userRes.user.id;

    // 2) Wipe storage objects under <userId>/ in profile-photos.
    const admin = createClient(url, serviceKey);
    const { data: objs } = await admin.storage
      .from('profile-photos')
      .list(userId, { limit: 100 });
    if (objs && objs.length > 0) {
      const paths = objs.map((o: { name: string }) => `${userId}/${o.name}`);
      await admin.storage.from('profile-photos').remove(paths);
    }

    // 3) Delete the auth user. FKs cascade through profiles → all
    // dependent rows.
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      return json({ status: 'error', reason: delErr.message }, 500);
    }

    return json({ status: 'deleted' });
  } catch (e) {
    return json(
      { status: 'error', reason: (e as Error).message ?? 'unknown' },
      500,
    );
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
