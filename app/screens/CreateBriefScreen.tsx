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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { RootStackParamList } from '../App';
import CityPicker from '../components/CityPicker';
import CountryPicker from '../components/CountryPicker';
import type { City } from '../lib/cities';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateBrief'>;

const ART_FORMS = [
  'Painting','Illustration','Drawing','Photography','Filmmaking','Animation',
  'Theatre / acting','Stand-up','Classical music','Indie / band','Jazz',
  'Songwriting','Dance','Ceramics','Poetry','Fiction writing','Architecture',
  'Sculpture',
];

const CAPACITY_OPTIONS = [1, 2, 3, 4, 5];

export default function CreateBriefScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [country, setCountry] = useState<string | null>(null);
  const [city, setCity] = useState<City | null>(null);
  const [duration, setDuration] = useState('');
  const [capacity, setCapacity] = useState(1);
  const [artForms, setArtForms] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const titleTooShort = title.trim().length > 0 && title.trim().length < 3;
  const descTooShort =
    description.trim().length > 0 && description.trim().length < 10;

  const toggleArtForm = (f: string) => {
    setArtForms((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );
  };

  const submit = async () => {
    if (!session) return;
    setErrorMsg(null);
    if (title.trim().length < 3) {
      setErrorMsg('Başlık en az 3 karakter olmalı.');
      return;
    }
    if (description.trim().length < 10) {
      setErrorMsg('Detay alanı en az 10 karakter olmalı.');
      return;
    }
    if (!country) {
      setErrorMsg('Önce ülkeni seç.');
      return;
    }
    if (!city) {
      setErrorMsg('Şehir alanı zorunlu — listeden bir şehir seç.');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('briefs')
        .insert({
          creator_id: session.user.id,
          title: title.trim(),
          description: description.trim(),
          art_forms: artForms,
          city: city.name,
          city_country: city.country,
          city_lat: city.lat,
          city_lng: city.lng,
          duration_text: duration.trim() || null,
          capacity_total: capacity,
        })
        .select('id')
        .single();
      if (error) {
        setErrorMsg(`Oluşturma başarısız: ${error.message}`);
        return;
      }
      // Replace this screen with the brief detail.
      navigation.replace('BriefDetail', { briefId: data!.id });
    } catch (e: any) {
      setErrorMsg(
        `Beklenmedik hata: ${e?.message ?? 'Network ya da Supabase erişimi'}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>New open call</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>
            Ne arıyorsun? Net bir başlık + birkaç cümle, doğru insanları çeker.
            <Text style={{ color: '#E96B8E' }}> *</Text> işaretliler zorunlu.
          </Text>

          {errorMsg && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          )}

          <Field label="Başlık" required>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Örn. Caz dörtlüsü için saksafonist arıyorum"
              placeholderTextColor="#9D99B8"
              style={[styles.input, titleTooShort && styles.inputError]}
              maxLength={120}
            />
            {titleTooShort && (
              <Text style={styles.fieldError}>En az 3 karakter</Text>
            )}
          </Field>

          <Field label="Detay" required>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Proje hakkında 2-3 cümle: tema, takvim, prova sıklığı, ne tür bir kişi arıyorsun…"
              placeholderTextColor="#9D99B8"
              style={[
                styles.input,
                styles.textarea,
                descTooShort && styles.inputError,
              ]}
              multiline
              maxLength={2000}
            />
            <View style={styles.counterRow}>
              {descTooShort ? (
                <Text style={styles.fieldError}>En az 10 karakter</Text>
              ) : (
                <View />
              )}
              <Text style={styles.counter}>{description.length} / 2000</Text>
            </View>
          </Field>

          <Field label="Hangi sanat formlarından insan arıyorsun?">
            <View style={styles.chipsRow}>
              {ART_FORMS.map((f) => {
                const sel = artForms.includes(f);
                return (
                  <Pressable
                    key={f}
                    onPress={() => toggleArtForm(f)}
                    style={[styles.chip, sel && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, sel && styles.chipTextSelected]}>
                      {f}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <Field label="Ülke" required>
            <CountryPicker
              value={country}
              onChange={(c) => {
                setCountry(c);
                setCity(null);
              }}
              placeholder="Ülkeni ara… (örn. Turkey)"
            />
          </Field>

          <Field label="Şehir" required>
            <CityPicker
              value={city}
              onChange={setCity}
              countryFilter={country}
              disabled={!country}
              placeholder="Şehrini ara… (örn. Istanbul)"
            />
          </Field>

          <Field label="Süre">
            <TextInput
              value={duration}
              onChangeText={setDuration}
              placeholder="2 weeks / Ongoing"
              placeholderTextColor="#9D99B8"
              style={styles.input}
            />
          </Field>

          <Field label="Kontenjan">
            <View style={styles.capacityRow}>
              {CAPACITY_OPTIONS.map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setCapacity(n)}
                  style={[styles.capacityBtn, capacity === n && styles.capacityBtnActive]}
                >
                  <Text
                    style={[
                      styles.capacityBtnText,
                      capacity === n && styles.capacityBtnTextActive,
                    ]}
                  >
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.hint}>Kaç kişiyle çalışmak istiyorsun?</Text>
          </Field>
        </ScrollView>

        <View style={styles.bottomBar}>
          <Pressable
            onPress={submit}
            disabled={submitting}
            style={({ pressed }) => [
              styles.btnPrimaryFull,
              pressed && styles.pressed,
              submitting && { opacity: 0.6 },
            ]}
          >
            <LinearGradient
              colors={['#FF8FAB', '#C8B6FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btnPrimaryBg}
            >
              <Text style={styles.btnPrimaryText}>
                {submitting ? 'Yayınlanıyor…' : 'Yayınla'}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={{ color: '#E96B8E' }}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF6F2' },
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

  intro: { fontSize: 14, color: '#6B6883', marginBottom: 18, lineHeight: 20 },

  field: { marginBottom: 18 },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B6883',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1ECF7',
    fontSize: 15,
    color: '#2D2A4A',
  },
  textarea: { minHeight: 110, textAlignVertical: 'top' },
  counter: { fontSize: 11, color: '#9D99B8', textAlign: 'right' },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  hint: { fontSize: 12, color: '#9D99B8', marginTop: 8 },
  inputError: { borderColor: '#E96B8E', borderWidth: 2 },
  fieldError: { fontSize: 12, color: '#E96B8E', fontWeight: '700', marginTop: 4 },
  errorBanner: {
    backgroundColor: '#FFE5EC',
    borderColor: '#FF8FAB',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: { color: '#9C2B4D', fontSize: 13, fontWeight: '700' },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1ECF7',
  },
  chipSelected: { backgroundColor: '#E2D9F3', borderColor: '#8E7CC3' },
  chipText: { fontSize: 13, color: '#6B6883', fontWeight: '700' },
  chipTextSelected: { color: '#8E7CC3' },

  row2: { flexDirection: 'row', gap: 10 },

  capacityRow: { flexDirection: 'row', gap: 6 },
  capacityBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1ECF7',
  },
  capacityBtnActive: { backgroundColor: '#FFD6E0', borderColor: '#FF8FAB' },
  capacityBtnText: { fontSize: 16, fontWeight: '800', color: '#6B6883' },
  capacityBtnTextActive: { color: '#E96B8E' },

  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1ECF7',
    backgroundColor: '#FFF6F2',
  },
  btnPrimaryFull: {
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#FF8FAB',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  btnPrimaryBg: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: 'white', fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.85 },
});
