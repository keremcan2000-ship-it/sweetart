import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Activity = {
  id: string;
  em: string;
  name: string;
  blurb: string;
  bg: string;
  fg: string;
};

const ACTIVITIES: Activity[] = [
  { id: 'paint',   em: '🎨', name: 'Paint together',     blurb: 'BYO canvas',         bg: '#FFD6E0', fg: '#C9184A' },
  { id: 'film',    em: '🎬', name: 'Shoot a short film', blurb: 'Sub-3-min plots',    bg: '#FFE5B4', fg: '#B86419' },
  { id: 'gig',     em: '🎻', name: 'Live music',         blurb: 'Gigs + listening',   bg: '#D4F1F4', fg: '#1F6873' },
  { id: 'pottery', em: '🏺', name: 'Pottery class',      blurb: 'Clay disasters',     bg: '#D7F0DC', fg: '#2F6F45' },
  { id: 'gallery', em: '🖼️', name: 'Gallery hop',        blurb: 'Late at the Tate',   bg: '#E2D9F3', fg: '#6852C0' },
  { id: 'mic',     em: '🎤', name: 'Open mic night',     blurb: 'Stand-up or songs',  bg: '#FFCCD5', fg: '#A8123E' },
  { id: 'photo',   em: '📸', name: 'Photo walk',         blurb: 'Golden-hour roams',  bg: '#FCE1B6', fg: '#9C5B1B' },
  { id: 'improv',  em: '🎭', name: 'Improv class',       blurb: 'Yes, and?',          bg: '#FAD2E1', fg: '#A0376E' },
  { id: 'draw',    em: '✏️', name: 'Life drawing',       blurb: 'Charcoal and tea',   bg: '#DCE5FF', fg: '#3C4FA8' },
  { id: 'book',    em: '📚', name: 'Book club',          blurb: 'One book, one wine', bg: '#FFE5EC', fg: '#B23A6B' },
  { id: 'dance',   em: '💃', name: 'Dance class',        blurb: 'Salsa to swing',     bg: '#FFE0B2', fg: '#B65B17' },
  { id: 'song',    em: '🎼', name: 'Songwriting',        blurb: 'Couplets, late',     bg: '#C8E7C8', fg: '#2F6B3D' },
];

export default function ActivitiesScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.h2}>What do you want to do?</Text>
        </View>
        <Text style={styles.subtitle}>
          Bir aktiviteye dokun, bu hafta o aktiviteye varım diyenleri gör.
        </Text>

        <View style={styles.grid}>
          {ACTIVITIES.map((a) => (
            <Pressable
              key={a.id}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: a.bg },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.em}>{a.em}</Text>
              <View>
                <Text style={[styles.name, { color: a.fg }]}>{a.name}</Text>
                <Text style={[styles.blurb, { color: a.fg }]}>{a.blurb}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={styles.note}>
          Bir aktiviteye dokunduğunda Discover'a o filtreyle gitmesi sıradaki seansda gelecek.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF6F2' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  header: {
    paddingVertical: 14,
  },
  h2: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2D2A4A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B6883',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    rowGap: 12,
  },
  card: {
    width: '48%',
    aspectRatio: 1 / 1.05,
    borderRadius: 22,
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: '#2D2A4A',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  em: { fontSize: 36 },
  name: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  blurb: { fontSize: 12, fontWeight: '700', opacity: 0.7, marginTop: 2 },
  note: {
    fontSize: 12,
    color: '#9D99B8',
    marginTop: 18,
    lineHeight: 18,
    textAlign: 'center',
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
});
