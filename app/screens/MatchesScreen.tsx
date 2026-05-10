import { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { RootStackParamList } from '../App';

type Props = { navigation: any };

type ConversationRow =
  | {
      kind: 'match';
      key: string;
      match_id: string;
      other_user_id: string;
      name: string | null;
      main_art_form: string | null;
      photo_url: string | null;
      shared_activity: string | null;
      last_message_at: string | null;
      last_message_preview: string | null;
      unread: boolean;
    }
  | {
      kind: 'group';
      key: string;
      brief_group_id: string;
      brief_id: string;
      brief_title: string;
      member_count: number;
      last_message_at: string | null;
      last_message_preview: string | null;
      unread: boolean;
    };

const artFormEmoji: Record<string, string> = {
  Painting: '🎨',
  Illustration: '🖌️',
  Drawing: '✏️',
  Photography: '📷',
  Filmmaking: '🎬',
  Animation: '🎞️',
  'Theatre / acting': '🎭',
  'Stand-up': '🎤',
  'Classical music': '🎻',
  'Indie / band': '🎸',
  Jazz: '🎷',
  Songwriting: '🎶',
  Dance: '💃',
  Ceramics: '🏺',
  Poetry: '📝',
  'Fiction writing': '📖',
};

export default function MatchesScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);

    // === 1) Matches ===
    const { data: matchData } = await supabase
      .from('matches')
      .select('id, user_a_id, user_b_id, shared_activity, last_message_at, created_at')
      .or(`user_a_id.eq.${session.user.id},user_b_id.eq.${session.user.id}`);
    const matchesList = matchData ?? [];

    // === 2) Brief groups I'm a member of ===
    const { data: myMembers } = await supabase
      .from('brief_group_members')
      .select('group_id')
      .eq('user_id', session.user.id);
    const groupIds = (myMembers ?? []).map((r: any) => r.group_id);
    let groupRows: any[] = [];
    if (groupIds.length > 0) {
      const { data: groupsData } = await supabase
        .from('brief_groups')
        .select('id, brief_id, last_message_at, created_at')
        .in('id', groupIds);
      groupRows = groupsData ?? [];
    }

    // === 3) Hydrate match profiles + photos ===
    const otherIds = matchesList.map((m: any) =>
      m.user_a_id === session.user.id ? m.user_b_id : m.user_a_id,
    );
    let profileById = new Map<string, any>();
    let firstPhoto = new Map<string, string>();
    if (otherIds.length > 0) {
      const [{ data: profiles }, { data: photos }] = await Promise.all([
        supabase.from('profiles').select('id, name, main_art_form').in('id', otherIds),
        supabase
          .from('profile_photos')
          .select('profile_id, url, position')
          .in('profile_id', otherIds)
          .eq('moderation_status', 'approved')
          .order('position', { ascending: true }),
      ]);
      (profiles ?? []).forEach((p: any) => profileById.set(p.id, p));
      (photos ?? []).forEach((p: any) => {
        if (!firstPhoto.has(p.profile_id)) firstPhoto.set(p.profile_id, p.url);
      });
    }

    // === 4) Hydrate brief titles + member counts ===
    const briefById = new Map<string, any>();
    const memberCountByGroup = new Map<string, number>();
    if (groupRows.length > 0) {
      const briefIds = groupRows.map((g: any) => g.brief_id);
      const { data: briefs } = await supabase
        .from('briefs')
        .select('id, title')
        .in('id', briefIds);
      (briefs ?? []).forEach((b: any) => briefById.set(b.id, b));
      const { data: memberCountRows } = await supabase
        .from('brief_group_members')
        .select('group_id')
        .in('group_id', groupRows.map((g: any) => g.id));
      (memberCountRows ?? []).forEach((r: any) => {
        memberCountByGroup.set(
          r.group_id,
          (memberCountByGroup.get(r.group_id) ?? 0) + 1,
        );
      });
    }

    // === 5) Last messages for both kinds ===
    const matchIds = matchesList.map((m: any) => m.id);
    const allGroupIds = groupRows.map((g: any) => g.id);
    const lastMsgByMatch = new Map<string, any>();
    const lastMsgByGroup = new Map<string, any>();
    if (matchIds.length > 0) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('match_id, body, sender_id, created_at, read_at')
        .in('match_id', matchIds)
        .order('created_at', { ascending: false });
      (msgs ?? []).forEach((m: any) => {
        if (!lastMsgByMatch.has(m.match_id)) lastMsgByMatch.set(m.match_id, m);
      });
    }
    if (allGroupIds.length > 0) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('brief_group_id, body, sender_id, created_at, read_at')
        .in('brief_group_id', allGroupIds)
        .order('created_at', { ascending: false });
      (msgs ?? []).forEach((m: any) => {
        if (!lastMsgByGroup.has(m.brief_group_id))
          lastMsgByGroup.set(m.brief_group_id, m);
      });
    }

    // === 6) Build unified conversation rows ===
    const rows: ConversationRow[] = [];

    matchesList.forEach((m: any) => {
      const otherId =
        m.user_a_id === session.user.id ? m.user_b_id : m.user_a_id;
      const profile = profileById.get(otherId);
      const lastMsg = lastMsgByMatch.get(m.id);
      const isUnread =
        !!lastMsg && lastMsg.sender_id !== session.user.id && !lastMsg.read_at;
      rows.push({
        kind: 'match',
        key: `match-${m.id}`,
        match_id: m.id,
        other_user_id: otherId,
        name: profile?.name ?? '—',
        main_art_form: profile?.main_art_form ?? null,
        photo_url: firstPhoto.get(otherId) ?? null,
        shared_activity: m.shared_activity,
        last_message_at: lastMsg?.created_at ?? m.last_message_at,
        last_message_preview: lastMsg?.body ?? null,
        unread: isUnread,
      });
    });

    groupRows.forEach((g: any) => {
      const brief = briefById.get(g.brief_id);
      const lastMsg = lastMsgByGroup.get(g.id);
      const isUnread =
        !!lastMsg && lastMsg.sender_id !== session.user.id && !lastMsg.read_at;
      rows.push({
        kind: 'group',
        key: `group-${g.id}`,
        brief_group_id: g.id,
        brief_id: g.brief_id,
        brief_title: brief?.title ?? 'Project',
        member_count: memberCountByGroup.get(g.id) ?? 0,
        last_message_at: lastMsg?.created_at ?? g.last_message_at,
        last_message_preview: lastMsg?.body ?? null,
        unread: isUnread,
      });
    });

    // Sort by last_message_at desc (nulls last → use created_at as fallback above).
    rows.sort((a, b) => {
      const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return tb - ta;
    });

    setConversations(rows);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    load();
    // Reload when this screen is focused (e.g. after coming back from chat).
    const unsub = navigation.addListener('focus', () => load());
    return unsub;
  }, [load, navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF8FAB" />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>💞</Text>
          <Text style={styles.emptyTitle}>Henüz konuşma yok</Text>
          <Text style={styles.emptyBody}>
            Discover'da eşleş ya da bir Brief'e başvurup kabul al — burada görünür.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.key}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          renderItem={({ item }) => {
            const isGroup = item.kind === 'group';
            const title = isGroup ? item.brief_title : item.name ?? 'Match';
            const subline = item.last_message_preview
              ? item.last_message_preview
              : isGroup
              ? `🎨 Project chat · ${item.member_count} kişi`
              : item.shared_activity
              ? `Ortak: ${item.shared_activity}`
              : 'Eşleştiniz — ilk mesajı sen at!';
            const photoUrl = !isGroup ? item.photo_url : null;
            const onTap = () => {
              if (isGroup) {
                navigation.navigate('Chat', {
                  kind: 'group',
                  briefGroupId: item.brief_group_id,
                  briefTitle: item.brief_title,
                });
              } else {
                navigation.navigate('Chat', {
                  kind: 'match',
                  matchId: item.match_id,
                  otherUserId: item.other_user_id,
                  otherName: item.name ?? 'Match',
                  otherPhotoUrl: item.photo_url,
                  otherArtForm: item.main_art_form,
                });
              }
            };
            return (
              <Pressable
                onPress={onTap}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={styles.avatarWrap}>
                  {photoUrl ? (
                    <Image source={{ uri: photoUrl }} style={styles.avatar} />
                  ) : (
                    <LinearGradient
                      colors={
                        isGroup ? ['#FFE5B4', '#FFD6C2'] : ['#FFD6E0', '#E2D9F3']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.avatar}
                    >
                      <Text style={styles.avatarEmoji}>
                        {isGroup
                          ? '🎨'
                          : artFormEmoji[item.main_art_form ?? ''] ?? '🎨'}
                      </Text>
                    </LinearGradient>
                  )}
                  {item.unread && <View style={styles.unreadDot} />}
                </View>
                <View style={styles.body}>
                  <View style={styles.bodyTop}>
                    <View style={styles.nameRow}>
                      {isGroup && (
                        <View style={styles.groupBadge}>
                          <Text style={styles.groupBadgeText}>GROUP</Text>
                        </View>
                      )}
                      <Text style={styles.name} numberOfLines={1}>
                        {title}
                      </Text>
                    </View>
                    <Text style={styles.time}>
                      {item.last_message_at ? formatTime(item.last_message_at) : ''}
                    </Text>
                  </View>
                  <Text style={styles.preview} numberOfLines={1}>
                    {subline}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / 3600000;
  if (diffH < 24) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffH < 24 * 7) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF6F2' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#2D2A4A', letterSpacing: -0.5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#2D2A4A' },
  emptyBody: { fontSize: 14, color: '#6B6883', textAlign: 'center', marginTop: 6, lineHeight: 20 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1ECF7',
  },
  rowPressed: { opacity: 0.7 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 26 },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF8FAB',
    borderWidth: 2,
    borderColor: '#FFF6F2',
  },
  body: { flex: 1 },
  bodyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  nameRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 10 },
  name: { fontSize: 16, fontWeight: '800', color: '#2D2A4A', flexShrink: 1 },
  time: { fontSize: 12, color: '#9D99B8', fontWeight: '600' },
  preview: { fontSize: 14, color: '#6B6883', marginTop: 3 },
  groupBadge: {
    backgroundColor: '#FFE5B4',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  groupBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#8B5A1A',
    letterSpacing: 0.6,
  },
});
