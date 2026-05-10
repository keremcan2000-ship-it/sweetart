import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { RootStackParamList } from '../App';
import { SafetyMenu } from '../components/SafetyMenu';

type Props = NativeStackScreenProps<RootStackParamList, 'BriefDetail'>;

type Brief = {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  art_forms: string[];
  city: string | null;
  duration_text: string | null;
  starts_at: string | null;
  capacity_total: number;
  capacity_filled: number;
  status: string;
};

type Creator = {
  id: string;
  name: string | null;
  main_art_form: string | null;
  bio: string | null;
};

type Application = {
  id: string;
  applicant_id: string;
  status: string;
  message: string;
  created_at: string;
  responded_at: string | null;
};

type ApplicantProfile = {
  id: string;
  name: string | null;
  main_art_form: string | null;
  city: string | null;
  bio: string | null;
};

const artFormEmoji: Record<string, string> = {
  Painting: '🎨', Illustration: '🖌️', Drawing: '✏️', Photography: '📷',
  Filmmaking: '🎬', Animation: '🎞️', 'Theatre / acting': '🎭',
  'Stand-up': '🎤', 'Classical music': '🎻', 'Indie / band': '🎸',
  Jazz: '🎷', Songwriting: '🎶', Dance: '💃', Ceramics: '🏺',
  Poetry: '📝', 'Fiction writing': '📖', Architecture: '🏛️',
  Sculpture: '🗿',
};

const MIN_PITCH = 30;

export default function BriefDetailScreen({ route, navigation }: Props) {
  const { briefId } = route.params;
  const { session } = useAuth();
  const [brief, setBrief] = useState<Brief | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [allApps, setAllApps] = useState<Application[]>([]);
  const [applicants, setApplicants] = useState<Map<string, ApplicantProfile>>(
    new Map(),
  );
  const [applicantPhotos, setApplicantPhotos] = useState<Map<string, string>>(
    new Map(),
  );
  const [briefGroupId, setBriefGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPitch, setShowPitch] = useState(false);
  const [pitch, setPitch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const myApp = session
    ? allApps.find((a) => a.applicant_id === session.user.id) ?? null
    : null;

  const loadAll = async () => {
    if (!session) return;
    setLoading(true);
    const [briefRes, appsRes] = await Promise.all([
      supabase
        .from('briefs')
        .select(
          'id, creator_id, title, description, art_forms, city, duration_text, starts_at, capacity_total, capacity_filled, status',
        )
        .eq('id', briefId)
        .maybeSingle(),
      // RLS: creator sees all, applicants see only their own row.
      supabase
        .from('brief_applications')
        .select('id, applicant_id, status, message, created_at, responded_at')
        .eq('brief_id', briefId)
        .order('created_at', { ascending: false }),
    ]);
    const b = briefRes.data as Brief | null;
    setBrief(b);
    const apps = (appsRes.data as Application[]) ?? [];
    setAllApps(apps);

    if (b) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, name, main_art_form, bio')
        .eq('id', b.creator_id)
        .maybeSingle();
      setCreator((prof as Creator | null) ?? null);

      // Check if a brief group exists yet for this brief.
      const { data: groupRow } = await supabase
        .from('brief_groups')
        .select('id')
        .eq('brief_id', b.id)
        .maybeSingle();
      setBriefGroupId(groupRow?.id ?? null);
    }

    // Hydrate applicant profiles + photos (only relevant data the user can read).
    const applicantIds = Array.from(
      new Set(apps.map((a) => a.applicant_id)),
    );
    if (applicantIds.length > 0) {
      const [profsRes, photosRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, name, main_art_form, city, bio')
          .in('id', applicantIds),
        supabase
          .from('profile_photos')
          .select('profile_id, url, position')
          .in('profile_id', applicantIds)
          .eq('moderation_status', 'approved')
          .order('position', { ascending: true }),
      ]);
      const profMap = new Map<string, ApplicantProfile>();
      (profsRes.data ?? []).forEach((p: any) => profMap.set(p.id, p));
      setApplicants(profMap);

      const photoMap = new Map<string, string>();
      (photosRes.data ?? []).forEach((row: any) => {
        if (!photoMap.has(row.profile_id)) photoMap.set(row.profile_id, row.url);
      });
      setApplicantPhotos(photoMap);
    } else {
      setApplicants(new Map());
      setApplicantPhotos(new Map());
    }

    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // Refresh on focus so creator sees new applications without manual reload.
    const unsub = navigation.addListener('focus', () => loadAll());
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, briefId]);

  const respondToApplication = async (
    appId: string,
    decision: 'accepted' | 'declined',
  ) => {
    setActingOn(appId);
    const { error } = await supabase
      .from('brief_applications')
      .update({ status: decision, responded_at: new Date().toISOString() })
      .eq('id', appId);
    setActingOn(null);
    if (error) {
      Alert.alert('Güncelleme başarısız', error.message);
      return;
    }
    // Refresh local state.
    await loadAll();
  };

  const submitApplication = async () => {
    if (!session || !brief) return;
    if (pitch.trim().length < MIN_PITCH) {
      Alert.alert(
        'Pitch çok kısa',
        `En az ${MIN_PITCH} karakterlik bir mesaj yaz — neden uygun olduğunu kısaca anlat.`,
      );
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('brief_applications').insert({
      brief_id: brief.id,
      applicant_id: session.user.id,
      message: pitch.trim(),
    });
    setSubmitting(false);
    if (error) {
      Alert.alert('Başvuru gönderilemedi', error.message);
      return;
    }
    setShowPitch(false);
    setPitch('');
    await loadAll();
  };

  if (loading || !brief) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF8FAB" />
        </View>
      </SafeAreaView>
    );
  }

  const isMine = creator?.id === session?.user.id;
  const isOpen = brief.status === 'open';
  const canApply = !isMine && isOpen && !myApp;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Open call</Text>
        {!isMine && creator ? (
          <SafetyMenu
            targetUserId={creator.id}
            targetName={creator.name ?? undefined}
            reportSubject={{ briefId: brief.id }}
            onBlocked={() => navigation.goBack()}
          />
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Status banner */}
          <View style={[styles.statusBanner, isOpen ? styles.statusOpen : styles.statusFull]}>
            <Text style={styles.statusText}>
              {isOpen
                ? `${brief.capacity_filled}/${brief.capacity_total} dolu · açık`
                : brief.status === 'filled'
                ? 'Kontenjan doldu'
                : brief.status}
            </Text>
          </View>

          <Text style={styles.title}>{brief.title}</Text>

          {/* Creator */}
          {creator && (
            <View style={styles.creator}>
              <View style={styles.creatorAvatar}>
                <Text style={styles.creatorAvatarEmoji}>
                  {artFormEmoji[creator.main_art_form ?? ''] ?? '🎨'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.creatorName}>{creator.name}</Text>
                <Text style={styles.creatorRole}>
                  {creator.main_art_form ?? '—'}
                </Text>
              </View>
            </View>
          )}

          {/* Meta row */}
          <View style={styles.metaRow}>
            {brief.city && (
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>📍 {brief.city}</Text>
              </View>
            )}
            {brief.duration_text && (
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>⏳ {brief.duration_text}</Text>
              </View>
            )}
            {brief.starts_at && (
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>
                  📅 {new Date(brief.starts_at).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>

          {/* Art forms */}
          {brief.art_forms?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Aranıyor</Text>
              <View style={styles.tagsRow}>
                {brief.art_forms.map((f) => (
                  <View key={f} style={styles.tag}>
                    <Text style={styles.tagText}>
                      {artFormEmoji[f] ?? '🎨'} {f}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Detay</Text>
            <Text style={styles.description}>{brief.description}</Text>
          </View>

          {/* Creator's applications dashboard */}
          {isMine && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                Başvurular ({allApps.length})
              </Text>
              {allApps.length === 0 ? (
                <View style={styles.emptyAppsBox}>
                  <Text style={styles.emptyAppsTitle}>Henüz başvuru yok</Text>
                  <Text style={styles.emptyAppsBody}>
                    İlan açıldı, sıra başvuranlarda. Pitch geldiğinde burada görünür.
                  </Text>
                </View>
              ) : (
                allApps.map((app) => {
                  const ap = applicants.get(app.applicant_id);
                  const photoUrl = applicantPhotos.get(app.applicant_id);
                  const isPending = app.status === 'pending';
                  return (
                    <View key={app.id} style={styles.appCard}>
                      <View style={styles.appHead}>
                        <View style={styles.appAvatar}>
                          <Text style={styles.appAvatarEmoji}>
                            {artFormEmoji[ap?.main_art_form ?? ''] ?? '🎨'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.appName} numberOfLines={1}>
                            {ap?.name ?? '—'}
                          </Text>
                          <Text style={styles.appSub} numberOfLines={1}>
                            {[ap?.main_art_form, ap?.city]
                              .filter(Boolean)
                              .join(' · ') || '—'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.appStatusBadge,
                            statusStyle(app.status),
                          ]}
                        >
                          <Text style={styles.appStatusText}>
                            {humanStatus(app.status)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.appPitch}>{app.message}</Text>
                      <Text style={styles.appDate}>
                        {new Date(app.created_at).toLocaleString()}
                      </Text>
                      {isPending && (
                        <View style={styles.appActions}>
                          <Pressable
                            onPress={() =>
                              respondToApplication(app.id, 'declined')
                            }
                            disabled={actingOn === app.id}
                            style={({ pressed }) => [
                              styles.declineBtn,
                              pressed && styles.pressed,
                              actingOn === app.id && { opacity: 0.5 },
                            ]}
                          >
                            <Text style={styles.declineBtnText}>
                              {actingOn === app.id ? '…' : 'Decline'}
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() =>
                              respondToApplication(app.id, 'accepted')
                            }
                            disabled={actingOn === app.id}
                            style={({ pressed }) => [
                              styles.acceptBtn,
                              pressed && styles.pressed,
                              actingOn === app.id && { opacity: 0.5 },
                            ]}
                          >
                            <LinearGradient
                              colors={['#FF8FAB', '#C8B6FF']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={styles.acceptBtnBg}
                            >
                              <Text style={styles.acceptBtnText}>
                                {actingOn === app.id ? '…' : 'Accept'}
                              </Text>
                            </LinearGradient>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* Application status (applicant view) */}
          {!isMine && myApp && (
            <View style={styles.applicationBox}>
              <Text style={styles.applicationLabel}>Başvurun</Text>
              <View style={[styles.applicationStatus, statusStyle(myApp.status)]}>
                <Text style={styles.applicationStatusText}>
                  {humanStatus(myApp.status)}
                </Text>
              </View>
              <Text style={styles.applicationMessage}>{myApp.message}</Text>
              <Text style={styles.applicationDate}>
                {new Date(myApp.created_at).toLocaleString()}
              </Text>
            </View>
          )}

          {/* Pitch form */}
          {canApply && showPitch && (
            <View style={styles.pitchBox}>
              <Text style={styles.sectionLabel}>Senin pitch'in</Text>
              <Text style={styles.pitchHint}>
                Neden bu projeye uygun olduğunu kısaca anlat. En az {MIN_PITCH} karakter.
              </Text>
              <TextInput
                value={pitch}
                onChangeText={setPitch}
                multiline
                placeholder="Üniversitede yan dalda jazz tarihi yaptım, son 2 yıldır küçük bir trio'da çalıyorum..."
                placeholderTextColor="#9D99B8"
                style={styles.pitchInput}
                autoFocus
              />
              <Text style={styles.pitchCount}>
                {pitch.trim().length} / {MIN_PITCH}
              </Text>
              <View style={styles.pitchActions}>
                <Pressable
                  onPress={() => {
                    setShowPitch(false);
                    setPitch('');
                  }}
                  style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}
                >
                  <Text style={styles.btnGhostText}>İptal</Text>
                </Pressable>
                <Pressable
                  onPress={submitApplication}
                  disabled={submitting || pitch.trim().length < MIN_PITCH}
                  style={({ pressed }) => [
                    styles.btnPrimary,
                    pressed && styles.pressed,
                    (submitting || pitch.trim().length < MIN_PITCH) && { opacity: 0.6 },
                  ]}
                >
                  <LinearGradient
                    colors={['#FF8FAB', '#C8B6FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.btnPrimaryBg}
                  >
                    <Text style={styles.btnPrimaryText}>
                      {submitting ? 'Gönderiliyor…' : 'Başvuruyu gönder'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom CTAs.
            Priority:
              1) If a brief group exists and the user is a member (creator OR
                 accepted applicant), show "Open team chat".
              2) Apply (open + not creator + not yet applied)
              3) Status pill (full/closed)
              4) Creator's "your listing" stats banner
        */}
        {(() => {
          const userIsAcceptedMember =
            !isMine && myApp?.status === 'accepted';
          const showTeamChat = !!briefGroupId && (isMine || userIsAcceptedMember);
          if (showTeamChat) {
            return (
              <View style={styles.bottomBar}>
                <Pressable
                  onPress={() =>
                    navigation.navigate('Chat', {
                      kind: 'group',
                      briefGroupId: briefGroupId!,
                      briefTitle: brief.title,
                    })
                  }
                  style={({ pressed }) => [
                    styles.btnPrimaryFull,
                    pressed && styles.pressed,
                  ]}
                >
                  <LinearGradient
                    colors={['#FF8FAB', '#C8B6FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.btnPrimaryBg}
                  >
                    <Text style={styles.btnPrimaryText}>💬 Open team chat</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            );
          }
          if (canApply && !showPitch) {
            return (
              <View style={styles.bottomBar}>
                <Pressable
                  onPress={() => setShowPitch(true)}
                  style={({ pressed }) => [
                    styles.btnPrimaryFull,
                    pressed && styles.pressed,
                  ]}
                >
                  <LinearGradient
                    colors={['#FF8FAB', '#C8B6FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.btnPrimaryBg}
                  >
                    <Text style={styles.btnPrimaryText}>Apply</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            );
          }
          if (!isOpen && !isMine) {
            return (
              <View style={styles.bottomBar}>
                <View style={[styles.btnPrimaryFull, { backgroundColor: '#F1ECF7' }]}>
                  <Text style={[styles.btnPrimaryText, { color: '#9D99B8' }]}>
                    {brief.status === 'filled'
                      ? 'Kontenjan doldu'
                      : 'Bu çağrı kapalı'}
                  </Text>
                </View>
              </View>
            );
          }
          if (isMine) {
            return (
              <View style={styles.bottomBar}>
                <View
                  style={[
                    styles.btnPrimaryFull,
                    { backgroundColor: '#FFE5B4' },
                  ]}
                >
                  <Text style={[styles.btnPrimaryText, { color: '#8B5A1A' }]}>
                    Senin ilanın · {brief.capacity_filled}/{brief.capacity_total}{' '}
                    kabul
                  </Text>
                </View>
              </View>
            );
          }
          return null;
        })()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function humanStatus(s: string): string {
  switch (s) {
    case 'pending': return 'Bekleniyor';
    case 'accepted': return 'Kabul edildi 🎉';
    case 'declined': return 'Bu seferlik reddedildi';
    case 'withdrawn': return 'Geri çektin';
    default: return s;
  }
}
function statusStyle(s: string) {
  switch (s) {
    case 'accepted': return { backgroundColor: '#D7F0DC' };
    case 'declined': return { backgroundColor: '#FFD6E0' };
    case 'withdrawn': return { backgroundColor: '#F1ECF7' };
    default: return { backgroundColor: '#FFE5B4' };
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF6F2' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1ECF7',
  },
  back: { fontSize: 24, color: '#2D2A4A', fontWeight: '700', width: 24 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#2D2A4A' },

  scroll: { padding: 20, paddingBottom: 40 },

  statusBanner: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusOpen: { backgroundColor: '#D7F0DC' },
  statusFull: { backgroundColor: '#F1ECF7' },
  statusText: { fontSize: 12, fontWeight: '800', color: '#2F6F45', textTransform: 'uppercase', letterSpacing: 0.6 },

  title: { fontSize: 26, fontWeight: '900', color: '#2D2A4A', letterSpacing: -0.5, marginBottom: 14 },

  creator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFD6E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorAvatarEmoji: { fontSize: 20 },
  creatorName: { fontSize: 15, fontWeight: '800', color: '#2D2A4A' },
  creatorRole: { fontSize: 12, color: '#6B6883', marginTop: 1 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  metaPill: {
    backgroundColor: 'white',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1ECF7',
  },
  metaPillText: { fontSize: 12, fontWeight: '700', color: '#2D2A4A' },

  section: { marginTop: 18 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B6883',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  description: { fontSize: 15, color: '#2D2A4A', lineHeight: 22 },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: '#E2D9F3', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  tagText: { color: '#8E7CC3', fontSize: 12, fontWeight: '700' },

  applicationBox: {
    marginTop: 22,
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#2D2A4A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  applicationLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B6883',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  applicationStatus: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 11, marginBottom: 10 },
  applicationStatusText: { fontSize: 12, fontWeight: '800', color: '#2D2A4A' },
  applicationMessage: { fontSize: 14, color: '#2D2A4A', lineHeight: 20 },
  applicationDate: { fontSize: 11, color: '#9D99B8', marginTop: 8 },

  // Creator's applications list
  emptyAppsBox: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
  },
  emptyAppsTitle: { fontSize: 15, fontWeight: '800', color: '#2D2A4A' },
  emptyAppsBody: {
    fontSize: 13,
    color: '#6B6883',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  appCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#2D2A4A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  appHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  appAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFD6E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appAvatarEmoji: { fontSize: 18 },
  appName: { fontSize: 14, fontWeight: '800', color: '#2D2A4A' },
  appSub: { fontSize: 12, color: '#6B6883', marginTop: 1 },
  appStatusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  appStatusText: { fontSize: 11, fontWeight: '800', color: '#2D2A4A' },
  appPitch: { fontSize: 13, color: '#2D2A4A', lineHeight: 19 },
  appDate: { fontSize: 11, color: '#9D99B8', marginTop: 6 },
  appActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  declineBtn: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1ECF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: { color: '#6B6883', fontSize: 13, fontWeight: '800' },
  acceptBtn: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
  },
  acceptBtnBg: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  acceptBtnText: { color: 'white', fontSize: 13, fontWeight: '800' },

  pitchBox: {
    marginTop: 22,
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#2D2A4A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  pitchHint: { fontSize: 13, color: '#6B6883', marginBottom: 10, lineHeight: 18 },
  pitchInput: {
    minHeight: 100,
    maxHeight: 220,
    padding: 12,
    backgroundColor: '#FFF6F2',
    borderRadius: 14,
    fontSize: 15,
    color: '#2D2A4A',
    borderWidth: 1,
    borderColor: '#F1ECF7',
    textAlignVertical: 'top',
  },
  pitchCount: { fontSize: 11, color: '#9D99B8', marginTop: 6, textAlign: 'right' },
  pitchActions: { flexDirection: 'row', gap: 10, marginTop: 12 },

  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1ECF7',
    backgroundColor: '#FFF6F2',
  },
  btnPrimary: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#FF8FAB',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  btnPrimaryFull: {
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF8FAB',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  btnPrimaryBg: { flex: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  btnPrimaryText: { color: 'white', fontSize: 15, fontWeight: '800' },
  btnGhost: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F1ECF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhostText: { color: '#2D2A4A', fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.85 },
});
