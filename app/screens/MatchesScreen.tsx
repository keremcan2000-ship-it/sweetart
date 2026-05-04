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

type MatchRow = {
  match_id: string;
  other_user_id: string;
  name: string | null;
  main_art_form: string | null;
  photo_url: string | null;
  shared_activity: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_sender: string | null;
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
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);

    // 1) All matches I'm in.
    const { data: matchData } = await supabase
      .from('matches')
      .select('id, user_a_id, user_b_id, shared_activity, last_message_at, created_at')
      .or(`user_a_id.eq.${session.user.id},user_b_id.eq.${session.user.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    const matchesList = matchData ?? [];
    if (matchesList.length === 0) {
      setMatches([]);
      setLoading(false);
      return;
    }

    // 2) Profile data for the OTHER user in each match.
    const otherIds = matchesList.map((m: any) =>
      m.user_a_id === session.user.id ? m.user_b_id : m.user_a_id,
    );
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, main_art_form')
      .in('id', otherIds);
    const profileById = new Map<string, any>(
      (profiles ?? []).map((p: any) => [p.id, p]),
    );

    // 3) First photo for each "other" user.
    const { data: photos } = await supabase
      .from('profile_photos')
      .select('profile_id, url, position')
      .in('profile_id', otherIds)
      .eq('moderation_status', 'approved')
      .order('position', { ascending: true });
    const firstPhoto = new Map<string, string>();
    (photos ?? []).forEach((p: any) => {
      if (!firstPhoto.has(p.profile_id)) firstPhoto.set(p.profile_id, p.url);
    });

    // 4) Last message per match.
    const matchIds = matchesList.map((m: any) => m.id);
    const { data: msgs } = await supabase
      .from('messages')
      .select('match_id, body, sender_id, created_at, read_at')
      .in('match_id', matchIds)
      .order('created_at', { ascending: false });
    const lastMsgByMatch = new Map<string, any>();
    (msgs ?? []).forEach((m: any) => {
      if (!lastMsgByMatch.has(m.match_id)) lastMsgByMatch.set(m.match_id, m);
    });

    const rows: MatchRow[] = matchesList.map((m: any) => {
      const otherId =
        m.user_a_id === session.user.id ? m.user_b_id : m.user_a_id;
      const profile = profileById.get(otherId);
      const lastMsg = lastMsgByMatch.get(m.id);
      const isUnread =
        lastMsg &&
        lastMsg.sender_id !== session.user.id &&
        !lastMsg.read_at;
      return {
        match_id: m.id,
        other_user_id: otherId,
        name: profile?.name ?? '—',
        main_art_form: profile?.main_art_form ?? null,
        photo_url: firstPhoto.get(otherId) ?? null,
        shared_activity: m.shared_activity,
        last_message_at: lastMsg?.created_at ?? m.last_message_at,
        last_message_preview: lastMsg?.body ?? null,
        last_message_sender: lastMsg?.sender_id ?? null,
        unread: isUnread,
      };
    });

    setMatches(rows);
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
      ) : matches.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>💞</Text>
          <Text style={styles.emptyTitle}>Henüz match yok</Text>
          <Text style={styles.emptyBody}>
            Discover'a dönüp birkaç sanatla zekâ alışverişi yapan biriyle eşleş.
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => m.match_id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                navigation.navigate('Chat', {
                  matchId: item.match_id,
                  otherUserId: item.other_user_id,
                  otherName: item.name ?? 'Match',
                  otherPhotoUrl: item.photo_url,
                  otherArtForm: item.main_art_form,
                })
              }
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.avatarWrap}>
                {item.photo_url ? (
                  <Image source={{ uri: item.photo_url }} style={styles.avatar} />
                ) : (
                  <LinearGradient
                    colors={['#FFD6E0', '#E2D9F3']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatar}
                  >
                    <Text style={styles.avatarEmoji}>
                      {artFormEmoji[item.main_art_form ?? ''] ?? '🎨'}
                    </Text>
                  </LinearGradient>
                )}
                {item.unread && <View style={styles.unreadDot} />}
              </View>
              <View style={styles.body}>
                <View style={styles.bodyTop}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.time}>
                    {item.last_message_at ? formatTime(item.last_message_at) : ''}
                  </Text>
                </View>
                <Text style={styles.preview} numberOfLines={1}>
                  {item.last_message_preview
                    ? item.last_message_preview
                    : item.shared_activity
                    ? `Ortak: ${item.shared_activity}`
                    : 'Eşleştiniz — ilk mesajı sen at!'}
                </Text>
              </View>
            </Pressable>
          )}
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
  name: { fontSize: 16, fontWeight: '800', color: '#2D2A4A', flex: 1, marginRight: 10 },
  time: { fontSize: 12, color: '#9D99B8', fontWeight: '600' },
  preview: { fontSize: 14, color: '#6B6883', marginTop: 3 },
});
