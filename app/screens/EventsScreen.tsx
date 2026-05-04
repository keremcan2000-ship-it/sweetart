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

type EventRow = {
  id: string;
  title: string;
  venue: string | null;
  city: string | null;
  starts_at: string;
  category: string | null;
  emoji: string | null;
  description: string | null;
  ticket_url: string | null;
};

const categoryFilters = ['All', 'theatre', 'cinema', 'music', 'gallery', 'comedy', 'art'];
const categoryLabels: Record<string, string> = {
  All: 'All',
  theatre: 'Theatre',
  cinema: 'Cinema',
  music: 'Music',
  gallery: 'Galleries',
  comedy: 'Comedy',
  art: 'Art',
};

const posterGradients: Record<string, [string, string]> = {
  theatre: ['#FFD6E0', '#FAD2E1'],
  cinema: ['#FFE5B4', '#FCE1B6'],
  music: ['#D4F1F4', '#E2D9F3'],
  gallery: ['#E2D9F3', '#DCE5FF'],
  comedy: ['#FFCCD5', '#FFD6E0'],
  art: ['#D7F0DC', '#C8E7C8'],
};

export default function EventsScreen() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [filter, setFilter] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('id, title, venue, city, starts_at, category, emoji, description, ticket_url')
        .eq('is_published', true)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(40);
      if (error) console.warn('events fetch failed', error.message);
      setEvents((data as EventRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered =
    filter === 'All' ? events : events.filter((e) => e.category === filter);

  const now = new Date();
  const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thisWeekend = filtered.filter((e) => new Date(e.starts_at) <= oneWeek);
  const nextWeek = filtered.filter((e) => new Date(e.starts_at) > oneWeek);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.h2}>Live nearby</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {categoryFilters.map((c) => (
            <Pressable
              key={c}
              onPress={() => setFilter(c)}
              style={[styles.filterPill, filter === c && styles.filterPillActive]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filter === c && styles.filterPillTextActive,
                ]}
              >
                {categoryLabels[c] ?? c}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <LinearGradient
          colors={['#FFD6E0', '#E2D9F3']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroEm}>🎟️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Pick a date you'd love to go on</Text>
            <Text style={styles.heroBody}>
              Match'e davet et — biletler birlikte ayarlanır.
            </Text>
          </View>
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#FF8FAB" />
          </View>
        ) : filtered.length === 0 ? (
          <Text style={styles.empty}>Bu kategoride yaklaşan event yok.</Text>
        ) : (
          <>
            {thisWeekend.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>This week</Text>
                {thisWeekend.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </>
            )}
            {nextWeek.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Later</Text>
                {nextWeek.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function EventCard({ event }: { event: EventRow }) {
  const colors =
    posterGradients[event.category ?? 'art'] ?? posterGradients.art;
  const date = new Date(event.starts_at);
  const dateStr = date
    .toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
    .toUpperCase();
  const timeStr = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.eventCard}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.eventPoster}
      >
        <Text style={styles.eventPosterEm}>{event.emoji ?? '🎭'}</Text>
      </LinearGradient>
      <View style={styles.eventInfo}>
        <Text style={styles.eventDate}>
          {dateStr} · {timeStr}
        </Text>
        <Text style={styles.eventTitle} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={styles.eventVenue} numberOfLines={1}>
          📍 {[event.venue, event.city].filter(Boolean).join(', ') || '—'}
        </Text>
        <Pressable
          onPress={() =>
            Alert.alert(
              'Coming soon',
              "Match'e davet etme akışı bir sonraki seansda gelecek.",
            )
          }
          style={({ pressed }) => [styles.eventCta, pressed && styles.pressed]}
        >
          <Text style={styles.eventCtaText}>💌 Invite a match</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF6F2' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { paddingVertical: 14 },
  h2: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2D2A4A',
    letterSpacing: -0.5,
  },

  filterRow: { gap: 8, paddingVertical: 4 },
  filterPill: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2D2A4A',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  filterPillActive: { backgroundColor: '#2D2A4A' },
  filterPillText: { fontSize: 13, fontWeight: '700', color: '#6B6883' },
  filterPillTextActive: { color: 'white' },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 22,
    marginTop: 14,
    marginBottom: 16,
  },
  heroEm: { fontSize: 36 },
  heroTitle: { fontSize: 16, fontWeight: '800', color: '#2D2A4A' },
  heroBody: { fontSize: 13, color: '#2D2A4A', opacity: 0.7, marginTop: 2 },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D2A4A',
    marginTop: 12,
    marginBottom: 10,
  },
  empty: { fontSize: 14, color: '#9D99B8', marginTop: 20, textAlign: 'center' },
  loadingBox: { paddingVertical: 30 },

  eventCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    gap: 14,
    shadowColor: '#2D2A4A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  eventPoster: {
    width: 76,
    height: 96,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventPosterEm: { fontSize: 40 },
  eventInfo: { flex: 1, justifyContent: 'space-between' },
  eventDate: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E96B8E',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2D2A4A',
    marginTop: 2,
    lineHeight: 19,
  },
  eventVenue: { fontSize: 12, color: '#6B6883', marginTop: 4 },
  eventCta: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#E2D9F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  eventCtaText: { color: '#8E7CC3', fontWeight: '800', fontSize: 12 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
});
