// ============================================================
// Sweetart — Safety helpers.
// Block and report flows used across screens. These call the
// `blocks` and `reports` tables from migration 0011.
// ============================================================

import { supabase } from './supabase';

export type ReportCategory =
  | 'spam'
  | 'harassment'
  | 'fake_profile'
  | 'inappropriate_content'
  | 'underage'
  | 'safety'
  | 'other';

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  spam: 'Spam or unwanted promo',
  harassment: 'Harassment or hate',
  fake_profile: 'Fake profile or impersonation',
  inappropriate_content: 'Inappropriate content',
  underage: 'Under 18',
  safety: 'Safety concern',
  other: 'Something else',
};

export async function blockUser(
  blockerId: string,
  blockedId: string,
  reason?: string,
): Promise<{ error?: string }> {
  if (blockerId === blockedId) return { error: 'kendini bloklayamazsın :)' };
  const { error } = await supabase
    .from('blocks')
    .insert({ blocker_id: blockerId, blocked_id: blockedId, reason: reason ?? null });
  if (error) return { error: error.message };
  return {};
}

export async function unblockUser(
  blockerId: string,
  blockedId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);
  if (error) return { error: error.message };
  return {};
}

export type ReportSubject = {
  userId?: string;
  messageId?: string;
  briefId?: string;
  photoId?: string;
};

export async function submitReport(args: {
  reporterId: string;
  subject: ReportSubject;
  category: ReportCategory;
  description?: string;
}): Promise<{ error?: string }> {
  const { reporterId, subject, category, description } = args;
  if (
    !subject.userId &&
    !subject.messageId &&
    !subject.briefId &&
    !subject.photoId
  ) {
    return { error: 'Report needs a target.' };
  }
  const { error } = await supabase.from('reports').insert({
    reporter_id: reporterId,
    subject_user_id: subject.userId ?? null,
    subject_message_id: subject.messageId ?? null,
    subject_brief_id: subject.briefId ?? null,
    subject_photo_id: subject.photoId ?? null,
    category,
    description: description?.trim() || null,
  });
  if (error) return { error: error.message };
  return {};
}

// Returns the set of user-ids the current user has blocked OR has
// been blocked by. Used to filter Discover / Matches / etc.
export async function fetchBlockedSet(
  myUserId: string,
): Promise<Set<string>> {
  const [out, inb] = await Promise.all([
    supabase.from('blocks').select('blocked_id').eq('blocker_id', myUserId),
    supabase.from('blocks').select('blocker_id').eq('blocked_id', myUserId),
  ]);
  const set = new Set<string>();
  (out.data ?? []).forEach((r: any) => set.add(r.blocked_id));
  (inb.data ?? []).forEach((r: any) => set.add(r.blocker_id));
  return set;
}
