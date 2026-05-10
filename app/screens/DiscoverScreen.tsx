import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { RootStackParamList } from '../App';
import BriefsFeed from './BriefsFeed';
import { SafetyMenu } from '../components/SafetyMenu';
import { fetchBlockedSet } from '../lib/safety';

type Profile = {
  id: string;
  name: string;
  age: number | null;
  city: string | null;
  job: string | null;
  bio: string | null;
  main_art_form: string | null;
  art_forms: string[];
  movements: string[];
  originality: string | null;
  looking_for_modes: string[];
  photo_url?: string | null;
};

type Mode = 'dating' | 'creating';

const cardGradients: [string, string][] = [
  ['#FFD6E0', '#FAD2E1'],
  ['#FFE5B4', '#FFD6C2'],
  ['#D4F1F4', '#E2D9F3'],
  ['#D7F0DC', '#C8E7C8'],
  ['#FFCCD5', '#FFD6E0'],
  ['#E2D9F3', '#DCE5FF'],
];

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
  Architecture: '🏛️',
};

export default function DiscoverScreen() {
  const { session } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [matched, setMatched] = useState<{ profile: Profile; matchId: string } | null>(null);

  // Mode state — which side of the app we're browsing right now.
  const [myModes, setMyModes] = useState<Mode[]>(['dating', 'creating']);
  const [activeMode, setActiveMode] = useState<Mode>('dating');

  // Pull the user's own looking_for_modes once so we know which toggle(s)
  // to offer them.
  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('looking_for_modes')
        .eq('id', session.user.id)
        .maybeSingle();
      const modes = (data?.looking_for_modes as Mode[] | null) ?? ['dating'];
      setMyModes(modes);
      // Default the active mode to whatever the user is open to first.
      setActiveMode(modes[0] ?? 'dating');
    })();
  }, [session]);

  useEffect(() => {
    if (!session) return;
    // Briefs feed has its own loader; don't fetch profiles in creating mode.
    if (activeMode === 'creating') {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      setIndex(0);
      const [{ data: swipedRows }, blocked] = await Promise.all([
        supabase
          .from('swipes')
          .select('swipee_id')
          .eq('swiper_id', session.user.id),
        fetchBlockedSet(session.user.id),
      ]);
      const swipedIds = (swipedRows ?? []).map((r: any) => r.swipee_id);
      // Exclude self, already-swiped, and any blocked-in-either-direction.
      const exclude = Array.from(
        new Set([session.user.id, ...swipedIds, ...blocked]),
      );

      let q = supabase
        .from('profiles')
        .select(
          'id, name, age, city, job, bio, main_art_form, art_forms, movements, originality, looking_for_modes',
        )
        .not('name', 'is', null)
        .eq('is_active', true)
        // Only show profiles that are open to the currently-active mode.
        .contains('looking_for_modes', [activeMode])
        .limit(20);
      if (exclude.length > 0) {
        q = q.not(
          'id',
          'in',
          `(${exclude.map((i) => `"${i}"`).join(',')})`,
        );
      }
      const { data, error } = await q;
      if (error) console.warn('fetch profiles failed', error.message);
      const list = (data as Profile[]) ?? [];

      // Hydrate each profile with its first approved photo (if any).
      if (list.length > 0) {
        const ids = list.map((p) => p.id);
        const { data: photoRows } = await supabase
          .from('profile_photos')
          .select('profile_id, url, position')
          .in('profile_id', ids)
          .eq('moderation_status', 'approved')
          .order('position', { ascending: true });
        const firstByProfile = new Map<string, string>();
        (photoRows ?? []).forEach((r: any) => {
          if (!firstByProfile.has(r.profile_id)) {
            firstByProfile.set(r.profile_id, r.url);
          }
        });
        list.forEach((p) => {
          p.photo_url = firstByProfile.get(p.id) ?? null;
        });
      }

      setProfiles(list);
      setLoading(false);
    })();
  }, [session, activeMode]);

  const onSwipe = async (direction: 'like' | 'pass' | 'super') => {
    if (busy) return;
    const target = profiles[index];
    if (!target || !session) return;
    setBusy(true);
    const { error: swipeError } = await supabase.from('swipes').insert({
      swiper_id: session.user.id,
      swipee_id: target.id,
      direction,
    });
    if (swipeError) console.warn('swipe insert failed', swipeError.message);

    // Mutual-like trigger creates a match automatically. Check if it exists.
    if (direction !== 'pass') {
      const sortedIds = [session.user.id, target.id].sort();
      const { data: matchRow } = await supabase
        .from('matches')
        .select('id')
        .eq('user_a_id', sortedIds[0])
        .eq('user_b_id', sortedIds[1])
        .maybeSingle();
      if (matchRow) setMatched({ profile: target, matchId: matchRow.id });
    }

    setIndex((i) => i + 1);
    setBusy(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF8FAB" />
        </View>
      </SafeAreaView>
    );
  }

  const current = profiles[index];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.logo}>Sweetart</Text>
      </View>

      {myModes.length > 1 && (
        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setActiveMode('dating')}
            style={[
              styles.modeBtn,
              activeMode === 'dating' && styles.modeBtnActive,
            ]}
          >
            <Text
              style={[
                styles.modeBtnText,
                activeMode === 'dating' && styles.modeBtnTextActive,
              ]}
            >
              💞 Dating
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveMode('creating')}
            style={[
              styles.modeBtn,
              activeMode === 'creating' && styles.modeBtnActive,
            ]}
          >
            <Text
              style={[
                styles.modeBtnText,
                activeMode === 'creating' && styles.modeBtnTextActive,
              ]}
            >
              🎨 Creating
            </Text>
          </Pressable>
        </View>
      )}

      {activeMode === 'creating' ? (
        <BriefsFeed />
      ) : (
        <View style={styles.deckArea}>
          {!current ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🌷</Text>
              <Text style={styles.emptyTitle}>You're caught up</Text>
              <Text style={styles.emptyBody}>
                Yeni insanlar her gün katılıyor. Az sonra geri gelin.
              </Text>
            </View>
          ) : (
            <ProfileCard
              profile={current}
              index={index}
              onBlocked={() => setIndex((i) => i + 1)}
            />
          )}
        </View>
      )}

      {current && activeMode === 'dating' && (
        <View style={styles.actions}>
          <Pressable
            onPress={() => onSwipe('pass')}
            disabled={busy}
            style={({ pressed }) => [
              styles.circ,
              styles.circPass,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.circIcon, { color: '#FF6B7A' }]}>✕</Text>
          </Pressable>
          <Pressable
            onPress={() => onSwipe('super')}
            disabled={busy}
            style={({ pressed }) => [
              styles.circ,
              styles.circStar,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.circIcon, { color: 'white' }]}>★</Text>
          </Pressable>
          <Pressable
            onPress={() => onSwipe('like')}
            disabled={busy}
            style={({ pressed }) => [
              styles.circ,
              styles.circLike,
              styles.circBig,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.circIcon, { color: '#4FB87A', fontSize: 32 }]}>♥</Text>
          </Pressable>
        </View>
      )}

      {matched && (
        <View style={styles.matchOverlay}>
          <View style={styles.matchModal}>
            <View style={styles.matchAvatars}>
              <View style={styles.matchAv}>
                <Text style={styles.matchAvEmoji}>🧑‍🎨</Text>
              </View>
              <View style={[styles.matchAv, styles.matchAvRight]}>
                <Text style={styles.matchAvEmoji}>
                  {artFormEmoji[matched.profile.main_art_form ?? ''] ?? '🎨'}
                </Text>
              </View>
            </View>
            <Text style={styles.matchTitle}>It's a match!</Text>
            <Text style={styles.matchBody}>
              <Text style={{ fontWeight: '800' }}>{matched.profile.name}</Text> ile
              ortak ilgi alanı:{' '}
              <Text style={{ fontWeight: '800' }}>{matched.profile.main_art_form}</Text>.
            </Text>
            <View style={styles.matchActions}>
              <Pressable
                style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}
                onPress={() => setMatched(null)}
              >
                <Text style={styles.btnGhostText}>Keep swiping</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
                onPress={() => {
                  const m = matched;
                  setMatched(null);
                  navigation.navigate('Chat', {
                    kind: 'match',
                    matchId: m.matchId,
                    otherUserId: m.profile.id,
                    otherName: m.profile.name,
                    otherPhotoUrl: m.profile.photo_url ?? null,
                    otherArtForm: m.profile.main_art_form,
                  });
                }}
              >
                <LinearGradient
                  colors={['#FF8FAB', '#C8B6FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.btnPrimaryBg}
                >
                  <Text style={styles.btnPrimaryText}>Say hi 👋</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function ProfileCard({
  profile,
  index,
  onBlocked,
}: {
  profile: Profile;
  index: number;
  onBlocked?: () => void;
}) {
  const colors = cardGradients[index % cardGradients.length];
  const em = artFormEmoji[profile.main_art_form ?? ''] ?? '🎨';
  const attrs: string[] = [];
  if (profile.job) attrs.push(profile.job);
  if (profile.city) attrs.push(profile.city);
  if (profile.originality) attrs.push(profile.originality);

  return (
    <ScrollView style={styles.card} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={styles.cardPhoto}>
        {profile.photo_url ? (
          <Image
            source={{ uri: profile.photo_url }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, styles.cardPhotoCenter]}
          >
            <Text style={styles.cardPhotoEmoji}>{em}</Text>
          </LinearGradient>
        )}

        <View style={styles.activityPill}>
          <Text style={styles.activityPillText}>
            {em} {profile.main_art_form ?? '—'}
          </Text>
        </View>

        {/* Safety: report / block. Pre-match users still need access
            to these per Apple Guideline 1.2. */}
        <View style={styles.cardSafety}>
          <SafetyMenu
            targetUserId={profile.id}
            targetName={profile.name}
            onBlocked={onBlocked}
          />
        </View>

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.gradientBottom}
        />

        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>
            {profile.name}{' '}
            {profile.age ? <Text style={styles.cardAge}>{profile.age}</Text> : null}
          </Text>
          {profile.bio ? (
            <Text style={styles.cardBio} numberOfLines={2}>
              {profile.bio}
            </Text>
          ) : null}
          <View style={styles.cardAttrs}>
            {attrs.map((a, i) => (
              <View key={i} style={styles.cardAttrPill}>
                <Text style={styles.cardAttrText}>{a}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.cardBody}>
        {profile.movements?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Movements they love</Text>
            <View style={styles.chipsWrap}>
              {profile.movements.slice(0, 6).map((m) => (
                <View key={m} style={styles.chip}>
                  <Text style={styles.chipText}>{m}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        {profile.art_forms?.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Also practises</Text>
            <View style={styles.chipsWrap}>
              {profile.art_forms
                .filter((f) => f !== profile.main_art_form)
                .map((f) => (
                  <View key={f} style={[styles.chip, styles.chipMint]}>
                    <Text style={[styles.chipText, styles.chipMintText]}>{f}</Text>
                  </View>
                ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF6F2' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FF8FAB',
    letterSpacing: -0.8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2D2A4A',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconBtnText: { fontSize: 18 },
  signOut: { color: '#6B6883', fontWeight: '700', fontSize: 13 },

  // Mode toggle (Dating / Creating)
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  modeBtn: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#2D2A4A',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  modeBtnActive: {
    borderColor: '#FF8FAB',
    backgroundColor: '#FFD6E0',
  },
  modeBtnText: { fontSize: 14, fontWeight: '700', color: '#6B6883' },
  modeBtnTextActive: { color: '#E96B8E' },

  deckArea: { flex: 1, paddingHorizontal: 16 },

  card: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#2D2A4A',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  cardPhoto: {
    height: 460,
    position: 'relative',
    overflow: 'hidden',
  },
  cardPhotoCenter: { alignItems: 'center', justifyContent: 'center' },
  cardPhotoEmoji: { fontSize: 110 },
  activityPill: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activityPillText: { fontSize: 13, fontWeight: '800', color: '#2D2A4A' },
  cardSafety: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 4,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
  },
  gradientBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 200,
  },
  cardInfo: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
  },
  cardName: { color: 'white', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  cardAge: { fontWeight: '600', opacity: 0.9 },
  cardBio: { color: 'white', fontSize: 14, opacity: 0.95, marginTop: 4 },
  cardAttrs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  cardAttrPill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cardAttrText: { color: 'white', fontSize: 11, fontWeight: '700' },

  cardBody: { padding: 20, gap: 18 },
  section: { gap: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B6883',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: '#E2D9F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  chipText: { color: '#8E7CC3', fontWeight: '700', fontSize: 12 },
  chipMint: { backgroundColor: '#D7F0DC' },
  chipMintText: { color: '#2F6F45' },

  emptyCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D2A4A',
    marginTop: 12,
  },
  emptyBody: {
    fontSize: 14,
    color: '#6B6883',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 18,
  },
  circ: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2D2A4A',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  circBig: { width: 64, height: 64, borderRadius: 32 },
  circIcon: { fontSize: 26, fontWeight: '900' },
  circPass: {},
  circStar: {
    backgroundColor: '#FFD93D',
  },
  circLike: {},
  pressed: { opacity: 0.85, transform: [{ scale: 0.95 }] },

  matchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45,42,74,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  matchModal: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
  },
  matchAvatars: { flexDirection: 'row', marginBottom: 14 },
  matchAv: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFD6E0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'white',
    shadowColor: '#2D2A4A',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  matchAvRight: { backgroundColor: '#E2D9F3', marginLeft: -16 },
  matchAvEmoji: { fontSize: 38 },
  matchTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FF8FAB',
    letterSpacing: -0.8,
    marginTop: 6,
  },
  matchBody: {
    fontSize: 14,
    color: '#6B6883',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
    lineHeight: 20,
  },
  matchActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
  },
  btnPrimary: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#FF8FAB',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  btnPrimaryBg: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: 'white', fontSize: 15, fontWeight: '800' },
  btnGhost: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1ECF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhostText: { color: '#2D2A4A', fontSize: 14, fontWeight: '800' },
});
