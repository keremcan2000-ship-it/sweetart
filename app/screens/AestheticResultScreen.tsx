import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../App';
import { findCardsByIds } from '../lib/aestheticCards';
import {
  AXIS_POLES,
  deriveResult,
  type AestheticResult,
} from '../lib/aestheticScoring';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { AestheticAxis } from '../lib/aestheticCards';

type Props = NativeStackScreenProps<RootStackParamList, 'AestheticResult'>;

const PALETTE = {
  bg: '#F8F4ED',
  ink: '#1F1B16',
  inkSoft: '#5B5448',
  accent: '#E8554F',
  plum: '#6B5B95',
  hairline: '#E0D8C8',
};

const AXES: AestheticAxis[] = [
  'warmth',
  'density',
  'era',
  'form',
  'mood',
  'energy',
];

export default function AestheticResultScreen({ route, navigation }: Props) {
  const { pickIds } = route.params;
  const { session } = useAuth();

  const result = useMemo<AestheticResult>(() => {
    const picks = findCardsByIds(pickIds);
    return deriveResult(picks);
  }, [pickIds]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const persistOnce = useRef(false);

  // Auto-save on mount so the user's profile reflects the result
  // even if they hard-close the app from the share screen.
  useEffect(() => {
    if (persistOnce.current) return;
    persistOnce.current = true;
    void persistResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistResult = async () => {
    if (!session) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from('profiles')
      .update({
        aesthetic_vector: result.vector,
        aesthetic_label: result.label,
        aesthetic_completed_at: new Date().toISOString(),
      })
      .eq('id', session.user.id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSaved(true);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `My Sweetart aesthetic is "${result.label}" — ${result.blurb} ✨ Find yours at sweetart.app`,
      });
    } catch {
      // user dismissed share sheet — silent
    }
  };

  const handleDone = () => {
    // After the quiz, drop the user back to the main app stack.
    navigation.popToTop();
  };

  const handleRetake = () => {
    navigation.replace('AestheticQuiz');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <Pressable onPress={handleShare} hitSlop={12}>
          <Text style={styles.shareLink}>share</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>your aesthetic is</Text>

        {/* Hero result card — designed for screenshot. */}
        <LinearGradient
          colors={['#fbe4cf', '#f5c4d3', '#c8e0eb']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroLabel}>{result.label}</Text>
          <Text style={styles.heroBlurb}>{result.blurb}</Text>

          <View style={styles.divider} />

          <View style={{ gap: 10 }}>
            {AXES.map((ax) => {
              const value = result.vector[ax];
              const [low, high] = AXIS_POLES[ax];
              return <AxisBar key={ax} low={low} high={high} value={value} />;
            })}
          </View>

          <View style={styles.heroFooter}>
            <Text style={styles.heroBrand}>
              sweet<Text style={{ fontStyle: 'italic', color: PALETTE.accent }}>art</Text>
            </Text>
          </View>
        </LinearGradient>

        {/* Save state */}
        <View style={styles.statusRow}>
          {saving ? (
            <>
              <ActivityIndicator size="small" color={PALETTE.accent} />
              <Text style={styles.statusText}>saving to your profile…</Text>
            </>
          ) : saved ? (
            <Text style={styles.statusText}>saved to your profile ✓</Text>
          ) : error ? (
            <Pressable onPress={persistResult}>
              <Text style={[styles.statusText, { color: PALETTE.accent }]}>
                couldn't save — tap to retry
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Actions */}
        <View style={{ gap: 10, paddingHorizontal: 22, paddingTop: 8 }}>
          <Pressable
            onPress={handleDone}
            style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
          >
            <Text style={styles.btnPrimaryText}>continue</Text>
          </Pressable>
          <Pressable
            onPress={handleRetake}
            style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}
          >
            <Text style={styles.btnGhostText}>take it again</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AxisBar({
  low,
  high,
  value,
}: {
  low: string;
  high: string;
  value: number;
}) {
  // value is in [-1, 1]; map to [0, 1] for the dot position.
  const pct = ((value + 1) / 2) * 100;
  return (
    <View style={styles.axisRow}>
      <Text style={styles.axisLabel}>{low}</Text>
      <View style={styles.axisTrack}>
        <View style={[styles.axisDot, { left: `${pct}%` }]} />
      </View>
      <Text style={[styles.axisLabel, { textAlign: 'right' }]}>{high}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.bg },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 12,
  },
  back: { fontSize: 22, color: PALETTE.ink, fontWeight: '500' },
  shareLink: {
    fontSize: 13,
    color: PALETTE.plum,
    fontWeight: '500',
    letterSpacing: 0.4,
  },

  scroll: { paddingBottom: 32 },

  eyebrow: {
    fontSize: 11,
    color: PALETTE.plum,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontWeight: '500',
    paddingHorizontal: 22,
    marginBottom: 12,
  },

  hero: {
    marginHorizontal: 18,
    marginBottom: 16,
    padding: 26,
    borderRadius: 26,
    shadowColor: '#1f1b16',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  heroLabel: {
    fontSize: 38,
    fontStyle: 'italic',
    fontWeight: '500',
    color: PALETTE.ink,
    letterSpacing: -0.8,
    lineHeight: 44,
    marginBottom: 8,
  },
  heroBlurb: {
    fontSize: 15,
    color: PALETTE.ink,
    opacity: 0.78,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(31,27,22,0.18)',
    marginVertical: 22,
  },

  axisRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  axisLabel: {
    fontSize: 11,
    color: PALETTE.ink,
    opacity: 0.62,
    letterSpacing: 0.4,
    flex: 1,
    textTransform: 'lowercase',
  },
  axisTrack: {
    flex: 2,
    height: 3,
    backgroundColor: 'rgba(31,27,22,0.14)',
    borderRadius: 2,
    position: 'relative',
  },
  axisDot: {
    position: 'absolute',
    top: -4,
    width: 11,
    height: 11,
    marginLeft: -5.5,
    borderRadius: 6,
    backgroundColor: PALETTE.ink,
  },

  heroFooter: {
    marginTop: 22,
    paddingTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(31,27,22,0.18)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  heroBrand: {
    fontSize: 14,
    fontWeight: '500',
    color: PALETTE.ink,
    letterSpacing: -0.3,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    minHeight: 22,
  },
  statusText: {
    fontSize: 12,
    color: PALETTE.inkSoft,
    letterSpacing: 0.2,
  },

  btnPrimary: {
    height: 52,
    borderRadius: 26,
    backgroundColor: PALETTE.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    color: PALETTE.bg,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  btnGhost: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhostText: {
    color: PALETTE.inkSoft,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  pressed: { opacity: 0.85 },
});
