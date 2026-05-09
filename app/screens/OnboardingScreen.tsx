import { useState } from 'react';
import {
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

import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import CityPicker from '../components/CityPicker';
import CountryPicker from '../components/CountryPicker';
import type { City } from '../lib/cities';

const TOTAL_STEPS = 3;

const ART_FORMS: { em: string; name: string }[] = [
  { em: '🌱', name: 'Just exploring' },
  { em: '🎨', name: 'Painting' },
  { em: '🖌️', name: 'Illustration' },
  { em: '✏️', name: 'Drawing' },
  { em: '📷', name: 'Photography' },
  { em: '🎬', name: 'Filmmaking' },
  { em: '🎞️', name: 'Animation' },
  { em: '🎭', name: 'Theatre / acting' },
  { em: '🎤', name: 'Stand-up' },
  { em: '🎻', name: 'Classical music' },
  { em: '🎸', name: 'Indie / band' },
  { em: '🎷', name: 'Jazz' },
  { em: '🎶', name: 'Songwriting' },
  { em: '💃', name: 'Dance' },
  { em: '🏺', name: 'Ceramics' },
  { em: '📝', name: 'Poetry' },
  { em: '📖', name: 'Fiction writing' },
];

const MOVEMENTS: string[] = [
  'Impressionism', 'Cubism', 'Surrealism', 'Bauhaus', 'Pop Art', 'Minimalism',
  'Abstract Expressionism', 'Realism', 'Postmodernism', 'Street Art', 'Conceptual',
  'Slow Cinema', 'New Wave', 'Documentary',
  'Jazz', 'Soul', 'Indie', 'Hip-hop', 'Punk', 'Folk', 'Electronic', 'Ambient',
  'Absurdism', 'New Sincerity', 'Observational comedy',
];

const ORIGINALITY: string[] = [
  'Originals only',
  'Mix of both',
  'Mostly interpretations',
  'Just exploring',
];

const photoBgs = [
  ['#FFD6E0', '#C8B6FF'],
  ['#FFD93D', '#FF8C61'],
  ['#95D5B2', '#A8DADC'],
];

export default function OnboardingScreen() {
  const { refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  // Step 0 — photos (placeholder, no upload yet)
  const [filledPhotos, setFilledPhotos] = useState<Set<number>>(new Set([0, 1, 2]));

  // Step 1 — basics
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState<string>('175');
  const [job, setJob] = useState('');
  const [country, setCountry] = useState<string | null>(null);
  const [city, setCity] = useState<City | null>(null);

  // Step 2 — art DNA
  const [artForms, setArtForms] = useState<string[]>([]);
  const [mainArtForm, setMainArtForm] = useState<string | null>(null);
  const [movements, setMovements] = useState<Set<string>>(new Set());
  const [originality, setOriginality] = useState<string>('Mix of both');

  const toggleArtForm = (form: string) => {
    if (artForms.includes(form)) {
      // already in the list. If it's not the main, promote to main.
      if (mainArtForm !== form) {
        setMainArtForm(form);
      } else {
        // it IS the main → remove entirely
        const remaining = artForms.filter((x) => x !== form);
        setArtForms(remaining);
        setMainArtForm(remaining[0] ?? null);
      }
    } else {
      setArtForms([...artForms, form]);
      if (!mainArtForm) setMainArtForm(form);
    }
  };

  const toggleMovement = (m: string) => {
    const next = new Set(movements);
    if (next.has(m)) next.delete(m); else next.add(m);
    setMovements(next);
  };

  const togglePhoto = (i: number) => {
    const next = new Set(filledPhotos);
    if (next.has(i)) next.delete(i); else next.add(i);
    setFilledPhotos(next);
  };

  const next = () => {
    setStepError(null);
    if (step === 1) {
      if (!name.trim()) {
        setStepError('Adınızı yazar mısınız?');
        return;
      }
      const ageNum = parseInt(age, 10);
      if (!ageNum || ageNum < 18 || ageNum > 120) {
        setStepError('18 ile 120 arasında geçerli bir yaş girin.');
        return;
      }
      if (!country) {
        setStepError('Önce ülkeni seç.');
        return;
      }
      if (!city) {
        setStepError('Şehir alanı zorunlu — listeden bir şehir seç.');
        return;
      }
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const back = () => {
    setStepError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const finish = async () => {
    setStepError(null);
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStepError('Session bulunamadı. Lütfen tekrar giriş yapın.');
        return;
      }
      const heightNum = parseInt(heightCm, 10);
      const { error } = await supabase
        .from('profiles')
        .update({
          name: name.trim(),
          age: parseInt(age, 10),
          height_cm: !isNaN(heightNum) ? heightNum : null,
          job: job.trim() || null,
          city: city?.name ?? null,
          city_country: city?.country ?? null,
          city_lat: city?.lat ?? null,
          city_lng: city?.lng ?? null,
          art_forms: artForms,
          main_art_form: mainArtForm,
          movements: Array.from(movements),
          originality,
        })
        .eq('id', user.id);
      if (error) {
        setStepError(`Save failed: ${error.message}`);
        return;
      }
      await refreshProfile(); // App.tsx → Home
    } catch (e: any) {
      setStepError(
        `Beklenmedik hata: ${e?.message ?? 'Network ya da Supabase erişimi'}`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Progress */}
      <View style={styles.progressRow}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[styles.progressDot, i <= step && styles.progressDotDone]}
          />
        ))}
      </View>

      {stepError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{stepError}</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {step === 0 && (
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.title}>Add a few photos</Text>
            <Text style={styles.subtitle}>
              3–6 photos work best. Bir portreyi sanat eserin ya da çalışırken çektiğin bir karenle dengele.
            </Text>
            <View style={styles.photoGrid}>
              {Array.from({ length: 6 }).map((_, i) => {
                const filled = filledPhotos.has(i);
                const colors = photoBgs[i % photoBgs.length];
                return (
                  <Pressable key={i} onPress={() => togglePhoto(i)} style={styles.photoCellWrap}>
                    {filled ? (
                      <LinearGradient
                        colors={colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.photoCell, styles.photoCellFilled]}
                      >
                        <Text style={styles.photoFilledEmoji}>
                          {['🧑‍🎨', '🎨', '📸', '🎬', '🎻', '🏺'][i]}
                        </Text>
                        {i === 0 && (
                          <View style={styles.photoBadge}>
                            <Text style={styles.photoBadgeText}>1</Text>
                          </View>
                        )}
                      </LinearGradient>
                    ) : (
                      <View style={[styles.photoCell, styles.photoCellEmpty]}>
                        <Text style={styles.photoPlus}>+</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.tip}>
              Şimdilik gerçek yükleme bağlı değil — placeholder olarak ekliyoruz. Gerçek fotoğraf yükleme ileri seansta gelecek.
            </Text>
          </ScrollView>
        )}

        {step === 1 && (
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>The basics</Text>
            <Text style={styles.subtitle}>Tell us a little about you.</Text>

            <View style={styles.field}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                style={styles.input}
                placeholderTextColor="#9D99B8"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.row2}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Age</Text>
                <TextInput
                  value={age}
                  onChangeText={setAge}
                  placeholder="26"
                  keyboardType="number-pad"
                  style={styles.input}
                  placeholderTextColor="#9D99B8"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Height (cm)</Text>
                <TextInput
                  value={heightCm}
                  onChangeText={setHeightCm}
                  placeholder="175"
                  keyboardType="number-pad"
                  style={styles.input}
                  placeholderTextColor="#9D99B8"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Job / what you do</Text>
              <TextInput
                value={job}
                onChangeText={setJob}
                placeholder="Product designer"
                style={styles.input}
                placeholderTextColor="#9D99B8"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Country<Text style={{ color: '#E96B8E' }}> *</Text>
              </Text>
              <CountryPicker
                value={country}
                onChange={(c) => {
                  setCountry(c);
                  // Reset city when country changes.
                  setCity(null);
                }}
                placeholder="Ülkeni ara… (örn. Turkey)"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                City<Text style={{ color: '#E96B8E' }}> *</Text>
              </Text>
              <CityPicker
                value={city}
                onChange={setCity}
                countryFilter={country}
                disabled={!country}
                placeholder="Şehrini ara… (örn. Istanbul)"
              />
            </View>
          </ScrollView>
        )}

        {step === 2 && (
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.title}>Your art DNA</Text>
            <Text style={styles.subtitle}>
              Pratik ettiğin formlar, sevdiğin akımlar, ve nasıl çalıştığın.
            </Text>

            <Text style={[styles.label, styles.sectionLabel]}>
              Art forms — tap to pick, tap again to set as ★ main
            </Text>
            <View style={styles.pickerCol}>
              {ART_FORMS.map((f) => {
                const picked = artForms.includes(f.name);
                const main = mainArtForm === f.name;
                return (
                  <Pressable
                    key={f.name}
                    onPress={() => toggleArtForm(f.name)}
                    style={[
                      styles.pickerCard,
                      picked && styles.pickerCardSelected,
                      main && styles.pickerCardMain,
                    ]}
                  >
                    <Text style={styles.pickerEm}>{f.em}</Text>
                    <Text style={[styles.pickerName, picked && styles.pickerNameSelected]}>
                      {f.name}
                    </Text>
                    {main && <Text style={styles.mainBadge}>★ Main</Text>}
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, styles.sectionLabel]}>Movements you love</Text>
            <View style={styles.chipsRow}>
              {MOVEMENTS.map((m) => {
                const sel = movements.has(m);
                return (
                  <Pressable
                    key={m}
                    onPress={() => toggleMovement(m)}
                    style={[styles.chip, sel && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{m}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, styles.sectionLabel]}>When you make, you mostly…</Text>
            <View style={styles.chipsRow}>
              {ORIGINALITY.map((o) => {
                const sel = originality === o;
                return (
                  <Pressable
                    key={o}
                    onPress={() => setOriginality(o)}
                    style={[styles.chip, sel && styles.chipMintSelected]}
                  >
                    <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{o}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}

        <View style={styles.actions}>
          <View style={styles.btnRow}>
            {step > 0 && (
              <Pressable
                onPress={back}
                style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed, { flex: 1 }]}
                disabled={busy}
              >
                <Text style={styles.btnGhostText}>Back</Text>
              </Pressable>
            )}
            <Pressable
              onPress={step < TOTAL_STEPS - 1 ? next : finish}
              style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed, { flex: 1 }]}
              disabled={busy}
            >
              <LinearGradient
                colors={['#FF8FAB', '#C8B6FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.btnPrimaryBg}
              >
                <Text style={styles.btnPrimaryText}>
                  {busy
                    ? 'Saving…'
                    : step < TOTAL_STEPS - 1
                    ? 'Continue'
                    : 'Finish & start matching'}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF6F2' },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 28,
    paddingVertical: 18,
  },
  progressDot: { flex: 1, height: 4, backgroundColor: '#EBE7F4', borderRadius: 4 },
  progressDotDone: { backgroundColor: '#FF8FAB' },
  errorBanner: {
    marginHorizontal: 28,
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFE5EC',
    borderWidth: 1,
    borderColor: '#FF8FAB',
  },
  errorText: {
    color: '#9C2B4D',
    fontSize: 13,
    fontWeight: '700',
  },
  scroll: { paddingHorizontal: 28, paddingBottom: 24 },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#2D2A4A',
    letterSpacing: -0.8,
  },
  subtitle: { fontSize: 15, color: '#6B6883', marginTop: 8, lineHeight: 22 },

  field: { marginTop: 22 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B6883',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sectionLabel: { marginTop: 22 },
  input: {
    height: 52,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#EFEAF7',
    backgroundColor: 'white',
    paddingHorizontal: 18,
    fontSize: 16,
    color: '#2D2A4A',
  },
  row2: { flexDirection: 'row', gap: 10 },

  // Photos
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 20,
    gap: 10,
  },
  photoCellWrap: { width: '31%', aspectRatio: 3 / 4 },
  photoCell: {
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoCellEmpty: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E8E2F2',
    borderStyle: 'dashed',
  },
  photoCellFilled: {
    /* gradient handles bg */
  },
  photoPlus: { fontSize: 26, color: '#9D99B8', fontWeight: '700' },
  photoFilledEmoji: { fontSize: 40 },
  photoBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FF8FAB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  photoBadgeText: { color: 'white', fontSize: 11, fontWeight: '800' },
  tip: { fontSize: 13, color: '#9D99B8', marginTop: 18, lineHeight: 18 },

  // Picker (art forms)
  pickerCol: { gap: 8 },
  pickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F1ECF7',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerCardSelected: {
    backgroundColor: '#FFD6E0',
    borderColor: '#FF8FAB',
  },
  pickerCardMain: {
    backgroundColor: '#FFE5B4',
    borderColor: '#FFD93D',
  },
  pickerEm: { fontSize: 22 },
  pickerName: { fontSize: 15, fontWeight: '700', color: '#2D2A4A', flex: 1 },
  pickerNameSelected: { color: '#2D2A4A' },
  mainBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2D2A4A',
    backgroundColor: '#FFD93D',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Chips
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#EFEAF7',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: { backgroundColor: '#8E7CC3', borderColor: '#8E7CC3' },
  chipMintSelected: { backgroundColor: '#4FB87A', borderColor: '#4FB87A' },
  chipText: { fontSize: 13, fontWeight: '700', color: '#6B6883' },
  chipTextSelected: { color: 'white' },

  // Actions
  actions: { paddingHorizontal: 24, paddingBottom: 36, paddingTop: 8 },
  btnRow: { flexDirection: 'row', gap: 10 },
  btnPrimary: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#FF8FAB',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  btnPrimaryBg: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: 'white', fontSize: 16, fontWeight: '800' },
  btnGhost: {
    height: 56,
    borderRadius: 28,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2D2A4A',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  btnGhostText: { color: '#2D2A4A', fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
