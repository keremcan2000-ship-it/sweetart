import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

type FullProfile = {
  id: string;
  name: string | null;
  age: number | null;
  city: string | null;
  job: string | null;
  height_cm: number | null;
  bio: string | null;
  religion: string | null;
  politics: string | null;
  drinks: string | null;
  smokes: string | null;
  wants_kids: string | null;
  art_forms: string[];
  main_art_form: string | null;
  movements: string[];
  originality: string | null;
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
  Architecture: '🏛️',
};

export default function YouScreen() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    (async () => {
      setLoading(true);
      const [profRes, matchRes] = await Promise.all([
        supabase
          .from('profiles')
          .select(
            'id, name, age, city, job, height_cm, bio, religion, politics, drinks, smokes, wants_kids, art_forms, main_art_form, movements, originality',
          )
          .eq('id', session.user.id)
          .maybeSingle(),
        supabase
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .or(`user_a_id.eq.${session.user.id},user_b_id.eq.${session.user.id}`),
      ]);
      setProfile((profRes.data as FullProfile) ?? null);
      setMatchCount(matchRes.count ?? 0);
      setLoading(false);
    })();
  }, [session]);

  const onSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Sign-out failed', error.message);
  };

  if (loading || !profile) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF8FAB" />
        </View>
      </SafeAreaView>
    );
  }

  // Profile completeness — count filled fields
  const fields = [
    profile.name,
    profile.age,
    profile.city,
    profile.job,
    profile.height_cm,
    profile.bio,
    profile.religion,
    profile.politics,
    profile.drinks,
    profile.smokes,
    profile.wants_kids,
    profile.main_art_form,
    profile.originality,
    profile.art_forms?.length ? 1 : null,
    profile.movements?.length ? 1 : null,
  ];
  const filled = fields.filter((f) => f !== null && f !== '' && f !== undefined).length;
  const completeness = Math.round((filled / fields.length) * 100);

  const mainEm = artFormEmoji[profile.main_art_form ?? ''] ?? '🎨';
  const alsoArt = (profile.art_forms ?? []).filter((f) => f !== profile.main_art_form);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.h2}>You</Text>
          <Pressable hitSlop={10}>
            <Text style={styles.editLink}>Edit</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <LinearGradient
            colors={['#FFD6E0', '#E2D9F3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarEmoji}>{mainEm}</Text>
          </LinearGradient>
          <Text style={styles.name}>
            {profile.name}
            {profile.age ? `, ${profile.age}` : ''}
          </Text>
          <Text style={styles.tag}>
            {[profile.job, profile.city].filter(Boolean).join(' · ') || '—'}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <Stat n={matchCount} label="Matches" />
          <Stat n={0} label="Plans" />
          <Stat n={`${completeness}%`} label="Profile" />
        </View>

        <SectionTitle title="Art form" action="Edit" />
        <View style={styles.artformCard}>
          <Text style={styles.artformLabel}>Main art form</Text>
          <View style={styles.artformMain}>
            <Text style={styles.artformEm}>{mainEm}</Text>
            <Text style={styles.artformName}>{profile.main_art_form ?? '—'}</Text>
          </View>
          {alsoArt.length > 0 && (
            <View style={styles.artformAlso}>
              {alsoArt.map((f) => (
                <View key={f} style={styles.artformAlsoPill}>
                  <Text style={styles.artformAlsoText}>{f}</Text>
                </View>
              ))}
            </View>
          )}
          {profile.originality && (
            <View style={styles.origBadge}>
              <Text style={styles.origText}>✦ {profile.originality}</Text>
            </View>
          )}
        </View>

        {profile.movements?.length > 0 && (
          <>
            <SectionTitle title="Movements I love" action="Edit" />
            <View style={styles.movementsCard}>
              <View style={styles.chipsWrap}>
                {profile.movements.map((m) => (
                  <View key={m} style={styles.chip}>
                    <Text style={styles.chipText}>{m}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        <SectionTitle title="My attributes" action="Edit" />
        <View style={styles.attrList}>
          <AttrRow icon="📏" k="Height" v={profile.height_cm ? `${profile.height_cm} cm` : '—'} />
          <AttrRow icon="💼" k="Job" v={profile.job ?? '—'} />
          <AttrRow icon="📍" k="City" v={profile.city ?? '—'} />
          <AttrRow icon="🙏" k="Religion" v={profile.religion ?? '—'} />
          <AttrRow icon="🗳️" k="Politics" v={profile.politics ?? '—'} />
          <AttrRow icon="🍷" k="Drinks" v={profile.drinks ?? '—'} />
          <AttrRow icon="🚬" k="Smokes" v={profile.smokes ?? '—'} last />
        </View>

        <View style={{ marginTop: 24 }}>
          <Pressable
            onPress={onSignOut}
            style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}
          >
            <Text style={styles.btnGhostText}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ n, label }: { n: string | number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionTitleText}>{title}</Text>
      {action && (
        <Pressable hitSlop={10}>
          <Text style={styles.editLink}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

function AttrRow({
  icon,
  k,
  v,
  last,
}: {
  icon: string;
  k: string;
  v: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.attrRow, last && styles.attrRowLast]}>
      <Text style={styles.attrK}>
        <Text style={styles.attrEm}>{icon}</Text>  {k}
      </Text>
      <Text style={styles.attrV}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF6F2' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  header: {
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  h2: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2D2A4A',
    letterSpacing: -0.5,
  },
  editLink: { color: '#E96B8E', fontSize: 13, fontWeight: '700' },

  hero: { alignItems: 'center', paddingVertical: 12 },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2D2A4A',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  avatarEmoji: { fontSize: 56 },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2D2A4A',
    marginTop: 12,
    letterSpacing: -0.4,
  },
  tag: { fontSize: 13, color: '#6B6883', marginTop: 2 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 14,
    marginTop: 16,
    gap: 8,
    shadowColor: '#2D2A4A',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  stat: { flex: 1, alignItems: 'center' },
  statN: { fontSize: 18, fontWeight: '800', color: '#2D2A4A' },
  statLabel: {
    fontSize: 11,
    color: '#6B6883',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  sectionTitle: {
    marginTop: 20,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D2A4A',
    letterSpacing: -0.3,
  },

  artformCard: {
    backgroundColor: 'white',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#2D2A4A',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  artformLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8E7CC3',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  artformMain: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  artformEm: { fontSize: 28 },
  artformName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2D2A4A',
    letterSpacing: -0.4,
  },
  artformAlso: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  artformAlsoPill: {
    backgroundColor: '#E2D9F3',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 11,
  },
  artformAlsoText: { color: '#8E7CC3', fontWeight: '700', fontSize: 12 },
  origBadge: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#D7F0DC',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
  },
  origText: { color: '#2F6F45', fontWeight: '800', fontSize: 12 },

  movementsCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#2D2A4A',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: '#E2D9F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  chipText: { color: '#8E7CC3', fontWeight: '700', fontSize: 12 },

  attrList: {
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#2D2A4A',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  attrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1ECF7',
  },
  attrRowLast: { borderBottomWidth: 0 },
  attrK: { fontSize: 14, color: '#6B6883' },
  attrEm: { fontSize: 16 },
  attrV: { fontSize: 14, fontWeight: '700', color: '#2D2A4A' },

  btnGhost: {
    height: 52,
    borderRadius: 26,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2D2A4A',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  btnGhostText: { fontSize: 15, fontWeight: '800', color: '#2D2A4A' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
