// Sweetart — moderate-photo Edge Function
//
// Called by the app after a photo upload. Downloads the photo, runs
// AWS Rekognition's DetectModerationLabels AND DetectLabels in parallel,
// then applies art-aware logic:
//
//   - moderation confidence >= STRICT_REJECT (default 88)  → reject always
//   - moderation confidence >= ART_CHECK (default 50):
//         if image is detected as art (painting/drawing/sketch/...) → approve
//         else                                                       → reject
//   - moderation confidence <  ART_CHECK                              → approve
//
// This lets classical paintings of nudes pass while still catching
// explicit modern photographs.
//
// Auth model:
//   - Function invoked with the user's JWT.
//   - We verify the photo belongs to that user before doing anything.
//
// Env (set as Supabase secrets):
//   AWS_ACCESS_KEY_ID
//   AWS_SECRET_ACCESS_KEY
//   AWS_REGION                  // e.g. eu-central-1
//   STRICT_REJECT_CONFIDENCE    // optional; default 88
//   ART_CHECK_CONFIDENCE        // optional; default 50
//
// Returns:
//   { status: 'approved', labels: [...] }
//   { status: 'rejected', reason: '...', labels: [...] }

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  RekognitionClient,
  DetectModerationLabelsCommand,
  DetectLabelsCommand,
} from 'https://esm.sh/@aws-sdk/client-rekognition@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Body = { photoId: string };

// Names that signal the image is fine art rather than a real photograph.
// Rekognition uses these (case-sensitive) labels.
const ART_LABEL_NAMES = new Set([
  'Painting',
  'Art',
  'Modern Art',
  'Drawing',
  'Sketch',
  'Doodle',
  'Cartoon',
  'Comics',
  'Manga',
  'Anime',
  'Illustration',
  'Pottery',
  'Sculpture',
]);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Identify caller via their JWT.
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) {
      return json({ error: 'Invalid user' }, 401);
    }

    const body = (await req.json()) as Body;
    if (!body?.photoId) return json({ error: 'photoId required' }, 400);

    // Service-role client bypasses RLS for the moderation update.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Look up the photo, verify ownership.
    const { data: photo, error: photoErr } = await adminClient
      .from('profile_photos')
      .select('id, profile_id, url, moderation_status')
      .eq('id', body.photoId)
      .maybeSingle();
    if (photoErr || !photo) return json({ error: 'photo not found' }, 404);
    if (photo.profile_id !== user.id) {
      return json({ error: 'forbidden' }, 403);
    }

    // Download the photo bytes.
    const imageRes = await fetch(photo.url);
    if (!imageRes.ok) {
      return json(
        { error: `Failed to fetch photo: ${imageRes.status}` },
        500,
      );
    }
    const imageBytes = new Uint8Array(await imageRes.arrayBuffer());

    const rekognition = new RekognitionClient({
      region: Deno.env.get('AWS_REGION') ?? 'eu-central-1',
      credentials: {
        accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!,
      },
    });

    const strictThreshold = Number(
      Deno.env.get('STRICT_REJECT_CONFIDENCE') ?? '88',
    );
    const artCheckThreshold = Number(
      Deno.env.get('ART_CHECK_CONFIDENCE') ?? '50',
    );

    // Two API calls in parallel: moderation + general labels.
    const [modResult, labelResult] = await Promise.all([
      rekognition.send(
        new DetectModerationLabelsCommand({
          Image: { Bytes: imageBytes },
          MinConfidence: artCheckThreshold,
        }),
      ),
      rekognition.send(
        new DetectLabelsCommand({
          Image: { Bytes: imageBytes },
          MaxLabels: 25,
          MinConfidence: 60,
        }),
      ),
    ]);

    const moderationLabels = (modResult.ModerationLabels ?? []).map((l) => ({
      name: l.Name ?? 'Unknown',
      parent: l.ParentName ?? '',
      confidence: Math.round(l.Confidence ?? 0),
    }));
    const generalLabels = (labelResult.Labels ?? []).map((l) => ({
      name: l.Name ?? 'Unknown',
      confidence: Math.round(l.Confidence ?? 0),
    }));

    // Highest-confidence moderation hit.
    const topMod = moderationLabels.sort(
      (a, b) => b.confidence - a.confidence,
    )[0];

    // Is this image clearly fine art?
    const isArt = generalLabels.some(
      (l) => ART_LABEL_NAMES.has(l.name) && l.confidence >= 70,
    );
    const artHits = generalLabels
      .filter((l) => ART_LABEL_NAMES.has(l.name))
      .map((l) => `${l.name} ${l.confidence}%`);

    let status: 'approved' | 'rejected' = 'approved';
    let reason: string | null = null;

    if (topMod && topMod.confidence >= strictThreshold) {
      // High-confidence explicit, even art context can't save it.
      status = 'rejected';
      reason = `${topMod.parent ? topMod.parent + ' / ' : ''}${topMod.name} – ${topMod.confidence}%`;
    } else if (topMod && topMod.confidence >= artCheckThreshold) {
      if (isArt) {
        status = 'approved';
        reason = `art context: ${artHits.join(', ')}`;
      } else {
        status = 'rejected';
        reason = `${topMod.parent ? topMod.parent + ' / ' : ''}${topMod.name} – ${topMod.confidence}% (no art context)`;
      }
    } else {
      status = 'approved';
    }

    const { error: updateErr } = await adminClient
      .from('profile_photos')
      .update({
        moderation_status: status,
        moderation_reason: reason,
      })
      .eq('id', photo.id);
    if (updateErr) {
      return json({ error: `DB update failed: ${updateErr.message}` }, 500);
    }

    return json({
      status,
      reason,
      moderation_labels: moderationLabels,
      art_labels: artHits,
      is_art: isArt,
    });
  } catch (e) {
    return json({ error: (e as Error).message ?? 'Unknown error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
