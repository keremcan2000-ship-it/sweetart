import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
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
import { pickAndUploadPhoto } from '../lib/uploadPhoto';

type Photo = { id: string; url: string; position: number };

// Cross-platform confirm. Alert.alert with multiple buttons doesn't render
// on react-native-web; window.confirm does.
function platformConfirm(title: string, body: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    return Promise.resolve(window.confirm(`${title}\n\n${body}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, body, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Remove', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

type Mode = 'dating' | 'creating';

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
  looking_for_modes: Mode[];
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
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    (async () => {
      setLoading(true);
      const [profRes, matchRes, photosRes] = await Promise.all([
        supabase
          .from('profiles')
          .select(
            'id, name, age, city, job, height_cm, bio, religion, politics, drinks, smokes, wants_kids, art_forms, main_art_form, movements, originality, looking_for_modes',
          )
          .eq('id', session.user.id)
          .maybeSingle(),
        supabase
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .or(`user_a_id.eq.${session.user.id},user_b_id.eq.${session.user.id}`),
        supabase
          .from('profile_photos')
          .select('id, url, position')
          .eq('profile_id', session.user.id)
          .order('position', { ascending: true }),
      ]);
      setProfile((profRes.data as FullProfile) ?? null);
      setMatchCount(matchRes.count ?? 0);
      setPhotos((photosRes.data as Photo[]) ?? []);
      setLoading(false);
    })();
  }, [session]);

  const addPhoto = async () => {
    if (!session || photoBusy || photos.length >= 6) return;
    setPhotoBusy(true);
    try {
      const url = await pickAndUploadPhoto(session.user.id);
      if (!url) {
        setPhotoBusy(false);
        return;
      }
      const nextPosition =
        photos.length > 0 ? Math.max(...photos.map((p) => p.position)) + 1 : 0;

      // 1) Save the photo as pending — invisible in Discover until moderation.
      const { data, error } = await supabase
        .from('profile_photos')
        .insert({
          profile_id: session.user.id,
          url,
          position: nextPosition,
          moderation_status: 'pending',
        })
        .select('id, url, position')
        .single();
      if (error) throw error;

      // Optimistically show it in the grid while moderation runs.
      const newPhoto = data as Photo;
      setPhotos((prev) => [...prev, newPhoto]);

      // 2) Kick off Rekognition via the Edge Function.
      const { data: modData, error: modError } = await supabase.functions.invoke(
        'moderate-photo',
        { body: { photoId: newPhoto.id } },
      );

      if (modError) {
        // Function failed — keep photo as pending, let user know.
        Alert.alert(
          'Moderation hatası',
          'Fotoğraf yüklendi ama otomatik moderasyon başarısız oldu. ' +
            'Şu an profilinde görünmeyecek. Tekrar denemek için bir foto daha yükle.',
        );
      } else if (modData?.status === 'rejected') {
        // Rekognition flagged it. Remove from grid with explanation.
        setPhotos((prev) => prev.filter((p) => p.id !== newPhoto.id));
        Alert.alert(
          'Foto kabul edilmedi',
          `Otomatik kontrol bu fotoğrafı uygun bulmadı.\n\nNeden: ${
            modData.reason ?? 'topluluk kuralları'
          }\n\nBaşka bir foto seçer misin?`,
        );
      }
      // If status === 'approved', nothing extra to do — photo is already shown.
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Bilinmeyen hata.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async (photoId: string) => {
    if (!session) return;
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;
    const { error } = await supabase
      .from('profile_photos')
      .delete()
      .eq('id', photoId);
    if (error) {
      Alert.alert('Remove failed', error.message);
      return;
    }
    setPhotos(photos.filter((p) => p.id !== photoId));
    // Best-effort cleanup of the storage object.
    // We extract path from public URL; if it fails it's not blocking.
    try {
      const path = photo.url.split('/profile-photos/')[1];
      if (path) {
        await supabase.storage.from('profile-photos').remove([path]);
      }
    } catch {
      // ignore
    }
  };

  const confirmRemove = async (photoId: string) => {
    const ok = await platformConfirm(
      'Remove photo?',
      'Bu fotoğrafı silmek istediğine emin misin?',
    );
    if (ok) await removePhoto(photoId);
  };

  const onSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Sign-out failed', error.message);
  };

  const toggleMode = async (mode: Mode) => {
    if (!profile || !session) return;
    const current = profile.looking_for_modes ?? [];
    let next: Mode[];
    if (current.includes(mode)) {
      // Don't let user remove the last mode.
      if (current.length === 1) {
        Alert.alert(
          'En az bir mod gerekli',
          'Dating veya Creating modlarından en az birini açık bırakman lazım.',
        );
        return;
      }
      next = current.filter((m) => m !== mode);
    } else {
      next = [...current, mode];
    }
    // Optimistic UI.
    setProfile({ ...profile, looking_for_modes: next });
    const { error } = await supabase
      .from('profiles')
      .update({ looking_for_modes: next })
      .eq('id', session.user.id);
    if (error) {
      // Roll back.
      setProfile({ ...profile, looking_for_modes: current });
      Alert.alert('Update failed', error.message);
    }
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
          {photos[0] ? (
            <Image source={{ uri: photos[0].url }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={['#FFD6E0', '#E2D9F3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarEmoji}>{mainEm}</Text>
            </LinearGradient>
          )}
          <Text style={styles.name}>
            {profile.name}
            {profile.age ? `, ${profile.age}` : ''}
          </Text>
          <Text style={styles.tag}>
            {[profile.job, profile.city].filter(Boolean).join(' · ') || '—'}
          </Text>
        </View>

        <SectionTitle title="My photos" action={photoBusy ? 'Uploading…' : undefined} />
        <View style={styles.photoGrid}>
          {photos.map((p, i) => (
            <Pressable
              key={p.id}
              onLongPress={() => confirmRemove(p.id)}
              style={styles.photoSlot}
            >
              <Image source={{ uri: p.url }} style={styles.photoImg} />
              {i === 0 && (
                <View style={styles.photoMainBadge}>
                  <Text style={styles.photoMainBadgeText}>1</Text>
                </View>
              )}
              <Pressable
                onPress={() => confirmRemove(p.id)}
                style={styles.photoX}
                hitSlop={10}
              >
                <Text style={styles.photoXText}>×</Text>
              </Pressable>
            </Pressable>
          ))}
          {photos.length < 6 && (
            <Pressable
              onPress={addPhoto}
              disabled={photoBusy}
              style={[styles.photoSlot, styles.photoSlotEmpty]}
            >
              {photoBusy ? (
                <ActivityIndicator color="#FF8FAB" />
              ) : (
                <Text style={styles.photoPlus}>+</Text>
              )}
            </Pressable>
          )}
        </View>
        {photos.length === 0 && !photoBusy && (
          <Text style={styles.photoHint}>
            İlk fotoğrafın profilinin avatarı olacak. 3-6 foto işe yarıyor — biri sanat eserin, biri portre, biri çalışırken.
          </Text>
        )}

        <View style={styles.statsRow}>
          <Stat n={matchCount} label="Matches" />
          <Stat n={0} label="Plans" />
          <Stat n={`${completeness}%`} label="Profile" />
        </View>

        <SectionTitle title="I'm open to" />
        <View style={styles.modesRow}>
          <Pressable
            onPress={() => toggleMode('dating')}
            style={[
              styles.modeChip,
              (profile.looking_for_modes ?? []).includes('dating') &&
                styles.modeChipActive,
            ]}
          >
            <Text style={styles.modeChipEmoji}>💞</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text
                style={[
                  styles.modeChipTitle,
                  (profile.looking_for_modes ?? []).includes('dating') &&
                    styles.modeChipTitleActive,
                ]}
              >
                Dating
              </Text>
              <Text style={styles.modeChipBody}>
                Romantik tanışmalar, randevular
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => toggleMode('creating')}
            style={[
              styles.modeChip,
              (profile.looking_for_modes ?? []).includes('creating') &&
                styles.modeChipActive,
            ]}
          >
            <Text style={styles.modeChipEmoji}>🎨</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text
                style={[
                  styles.modeChipTitle,
                  (profile.looking_for_modes ?? []).includes('creating') &&
                    styles.modeChipTitleActive,
                ]}
              >
                Creating
              </Text>
              <Text style={styles.modeChipBody}>
                Ortak projeler, kolaboratörler
              </Text>
            </View>
          </Pressable>
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

  // Photos
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoSlot: {
    width: '31.5%',
    aspectRatio: 3 / 4,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'white',
    position: 'relative',
  },
  photoSlotEmpty: {
    borderWidth: 2,
    borderColor: '#E8E2F2',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF6F2',
  },
  photoImg: { width: '100%', height: '100%' },
  photoPlus: { fontSize: 32, color: '#9D99B8', fontWeight: '600' },
  photoMainBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#FF8FAB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  photoMainBadgeText: { color: 'white', fontSize: 10, fontWeight: '800' },
  photoX: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(45,42,74,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoXText: { color: 'white', fontSize: 16, fontWeight: '700', lineHeight: 18 },
  photoHint: {
    fontSize: 13,
    color: '#9D99B8',
    marginTop: 12,
    lineHeight: 19,
  },

  // Modes
  modesRow: { gap: 10 },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#2D2A4A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  modeChipActive: {
    borderColor: '#FF8FAB',
    backgroundColor: '#FFF0F4',
  },
  modeChipEmoji: { fontSize: 26 },
  modeChipTitle: { fontSize: 16, fontWeight: '800', color: '#6B6883' },
  modeChipTitleActive: { color: '#2D2A4A' },
  modeChipBody: { fontSize: 12, color: '#9D99B8', marginTop: 1 },
});
