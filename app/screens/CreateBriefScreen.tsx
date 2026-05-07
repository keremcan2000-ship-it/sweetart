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
  const [city, setCity] = useState('');
  const [duration, setDuration] = useState('');
  const [capacity, setCapacity] = useState(1);
  const [artForms, setArtForms] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleArtForm = (f: string) => {
    setArtForms((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );
  };

  const submit = async () => {
    if (!session) return;
    if (title.trim().length < 3) {
      Alert.alert('Başlık çok kısa', 'En az 3 karakterlik bir başlık yaz.');
      return;
    }
    if (description.trim().length < 10) {
      Alert.alert('Detay çok kısa', 'En az 10 karakterlik bir açıklama yaz.');
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase
      .from('briefs')
      .insert({
        creator_id: session.user.id,
        title: title.trim(),
        description: description.trim(),
        art_forms: artForms,
        city: city.trim() || null,
        duration_text: duration.trim() || null,
        capacity_total: capacity,
      })
      .select('id')
      .single();
    setSubmitting(false);
    if (error) {
      Alert.alert('Oluşturma başarısız', error.message);
      return;
    }
    // Replace this screen with the brief detail.
    navigation.replace('BriefDetail', { briefId: data!.id });
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
          </Text>

          <Field label="Başlık">
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Örn. Caz dörtlüsü için saksafonist arıyorum"
              placeholderTextColor="#9D99B8"
              style={styles.input}
              maxLength={120}
            />
          </Field>

          <Field label="Detay">
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Proje hakkında 2-3 cümle: tema, takvim, prova sıklığı, ne tür bir kişi arıyorsun…"
              placeholderTextColor="#9D99B8"
              style={[styles.input, styles.textarea]}
              multiline
              maxLength={2000}
            />
            <Text style={styles.counter}>{description.length} / 2000</Text>
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

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field label="Şehir">
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="London"
                  placeholderTextColor="#9D99B8"
                  style={styles.input}
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Süre">
                <TextInput
                  value={duration}
                  onChangeText={setDuration}
                  placeholder="2 weeks / Ongoing"
                  placeholderTextColor="#9D99B8"
                  style={styles.input}
                />
              </Field>
            </View>
          </View>

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
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
  counter: { fontSize: 11, color: '#9D99B8', marginTop: 4, textAlign: 'right' },
  hint: { fontSize: 12, color: '#9D99B8', marginTop: 8 },

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
