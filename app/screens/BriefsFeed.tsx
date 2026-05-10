import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { fetchBlockedSet } from '../lib/safety';
import type { RootStackParamList } from '../App';

type BriefRow = {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  art_forms: string[];
  city: string | null;
  duration_text: string | null;
  capacity_total: number;
  capacity_filled: number;
  status: string;
  created_at: string;
  creator_name: string | null;
  creator_main_art: string | null;
};

const artFormEmoji: Record<string, string> = {
  Painting: '🎨', Illustration: '🖌️', Drawing: '✏️', Photography: '📷',
  Filmmaking: '🎬', Animation: '🎞️', 'Theatre / acting': '🎭',
  'Stand-up': '🎤', 'Classical music': '🎻', 'Indie / band': '🎸',
  Jazz: '🎷', Songwriting: '🎶', Dance: '💃', Ceramics: '🏺',
  Poetry: '📝', 'Fiction writing': '📖', Architecture: '🏛️',
  Sculpture: '🗿',
};

export default function BriefsFeed() {
  const { session } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [briefs, setBriefs] = useState<BriefRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('briefs')
      .select(
        'id, creator_id, title, description, art_forms, city, duration_text, capacity_total, capacity_filled, status, created_at',
      )
      .in('status', ['open', 'filled'])
      .order('created_at', { ascending: false })
      .limit(40);
    if (error) {
      console.warn('briefs fetch failed', error.message);
      setBriefs([]);
      return;
    }
    let list = (data ?? []) as any[];

    // Hide briefs whose creator the current user has blocked, or who
    // has blocked the current user.
    if (session && list.length > 0) {
      const blocked = await fetchBlockedSet(session.user.id);
      list = list.filter((b: any) => !blocked.has(b.creator_id));
    }

    // Hydrate creator profiles.
    if (list.length > 0) {
      const ids = list.map((b) => b.creator_id);
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, name, main_art_form')
        .in('id', ids);
      const byId = new Map<string, any>();
      (profs ?? []).forEach((p: any) => byId.set(p.id, p));
      list.forEach((b: any) => {
        const p = byId.get(b.creator_id);
        b.creator_name = p?.name ?? '—';
        b.creator_main_art = p?.main_art_form ?? null;
      });
    }
    setBriefs(list as BriefRow[]);
  }, [session]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
    const unsub = navigation.addListener('focus', () => load());
    return unsub;
  }, [load, navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF8FAB" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={briefs}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF8FAB" />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🎨</Text>
            <Text style={styles.emptyTitle}>Henüz açık çağrı yok</Text>
            <Text style={styles.emptyBody}>
              İlk sen aç. Ne tür bir kolaboratör arıyorsan kısaca anlat, başvuran olur.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMine = item.creator_id === session?.user.id;
          return (
            <Pressable
              onPress={() =>
                navigation.navigate('BriefDetail', { briefId: item.id })
              }
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardAvatar}>
                  <Text style={styles.cardAvatarEmoji}>
                    {artFormEmoji[item.creator_main_art ?? ''] ?? '🎨'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardCreator} numberOfLines={1}>
                    {item.creator_name}
                  </Text>
                  <Text style={styles.cardCity} numberOfLines={1}>
                    {[item.city, item.duration_text].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <CapacityBadge filled={item.capacity_filled} total={item.capacity_total} status={item.status} />
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.cardBody} numberOfLines={3}>{item.description}</Text>
              {item.art_forms?.length > 0 && (
                <View style={styles.tagsRow}>
                  {item.art_forms.slice(0, 3).map((f) => (
                    <View key={f} style={styles.tag}>
                      <Text style={styles.tagText}>
                        {artFormEmoji[f] ?? '🎨'} {f}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {isMine && (
                <View style={styles.myBadge}>
                  <Text style={styles.myBadgeText}>Senin ilanın</Text>
                </View>
              )}
            </Pressable>
          );
        }}
      />

      <Pressable
        onPress={() => navigation.navigate('CreateBrief')}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <LinearGradient
          colors={['#FF8FAB', '#C8B6FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabBg}
        >
          <Text style={styles.fabText}>+ Post a call</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function CapacityBadge({
  filled,
  total,
  status,
}: {
  filled: number;
  total: number;
  status: string;
}) {
  const isFull = status === 'filled';
  return (
    <View
      style={[
        styles.capacityBadge,
        isFull ? styles.capacityBadgeFull : styles.capacityBadgeOpen,
      ]}
    >
      <Text
        style={[
          styles.capacityText,
          isFull ? styles.capacityTextFull : styles.capacityTextOpen,
        ]}
      >
        {filled}/{total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 4 },
  emptyBox: { paddingTop: 60, alignItems: 'center', paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#2D2A4A' },
  emptyBody: { fontSize: 14, color: '#6B6883', textAlign: 'center', marginTop: 6, lineHeight: 20 },

  card: {
    backgroundColor: 'white',
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#2D2A4A',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardPressed: { transform: [{ scale: 0.98 }], opacity: 0.95 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFD6E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarEmoji: { fontSize: 18 },
  cardCreator: { fontSize: 13, fontWeight: '800', color: '#2D2A4A' },
  cardCity: { fontSize: 11, color: '#9D99B8', marginTop: 1 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#2D2A4A', letterSpacing: -0.2, marginBottom: 6 },
  cardBody: { fontSize: 14, color: '#6B6883', lineHeight: 20 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  tag: {
    backgroundColor: '#E2D9F3',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  tagText: { color: '#8E7CC3', fontSize: 12, fontWeight: '700' },

  capacityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  capacityBadgeOpen: { backgroundColor: '#D7F0DC' },
  capacityBadgeFull: { backgroundColor: '#F1ECF7' },
  capacityText: { fontSize: 12, fontWeight: '800' },
  capacityTextOpen: { color: '#2F6F45' },
  capacityTextFull: { color: '#9D99B8' },

  myBadge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: '#FFE5B4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  myBadgeText: { color: '#8B5A1A', fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },

  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    height: 52,
    paddingHorizontal: 22,
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#FF8FAB',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  fabPressed: { transform: [{ scale: 0.95 }] },
  fabBg: { flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  fabText: { color: 'white', fontSize: 15, fontWeight: '800' },
});
