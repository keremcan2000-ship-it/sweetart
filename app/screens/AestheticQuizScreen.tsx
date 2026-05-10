import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../App';
import {
  buildQuizRounds,
  type AestheticCard,
  type QuizRound,
} from '../lib/aestheticCards';

type Props = NativeStackScreenProps<RootStackParamList, 'AestheticQuiz'>;

// Sweetart brand palette — applied here as the pilot for the new
// "warm editorial" direction. Other screens stay on the legacy
// peach/lavender palette until the brand refresh ships.
const PALETTE = {
  bg: '#F8F4ED',
  ink: '#1F1B16',
  inkSoft: '#5B5448',
  accent: '#E8554F',
  plum: '#6B5B95',
  hairline: '#E0D8C8',
};

export default function AestheticQuizScreen({ navigation }: Props) {
  const rounds = useMemo<QuizRound[]>(() => buildQuizRounds(), []);
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<AestheticCard[]>([]);
  const [animPick, setAnimPick] = useState<'left' | 'right' | null>(null);

  const round = rounds[index];
  const total = rounds.length;
  const progress = (index / total) * 100;

  const handlePick = (card: AestheticCard, side: 'left' | 'right') => {
    if (animPick) return; // ignore double taps mid-transition
    setAnimPick(side);
    const nextPicks = [...picks, card];

    // Brief animation pause before moving on so the user sees their pick.
    setTimeout(() => {
      if (index + 1 >= total) {
        navigation.replace('AestheticResult', {
          pickIds: nextPicks.map((c) => c.id),
        });
      } else {
        setPicks(nextPicks);
        setIndex(index + 1);
        setAnimPick(null);
      }
    }, 320);
  };

  const handleSkip = () => {
    navigation.goBack();
  };

  if (!round) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Top bar: progress + skip */}
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>←</Text>
        </Pressable>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(progress, 4)}%` },
            ]}
          />
        </View>

        <Pressable onPress={handleSkip} hitSlop={12}>
          <Text style={styles.skip}>skip</Text>
        </Pressable>
      </View>

      <View style={styles.titleWrap}>
        <Text style={styles.eyebrow}>aesthetic quiz · {index + 1} of {total}</Text>
        <Text style={styles.title}>which feels more like you?</Text>
      </View>

      <View style={styles.cardsWrap}>
        <QuizCard
          card={round.left}
          dimmed={animPick === 'right'}
          highlight={animPick === 'left'}
          onPress={() => handlePick(round.left, 'left')}
        />
        <QuizCard
          card={round.right}
          dimmed={animPick === 'left'}
          highlight={animPick === 'right'}
          onPress={() => handlePick(round.right, 'right')}
        />
      </View>

      <Text style={styles.hint}>tap a card to choose</Text>
    </SafeAreaView>
  );
}

function QuizCard({
  card,
  dimmed,
  highlight,
  onPress,
}: {
  card: AestheticCard;
  dimmed: boolean;
  highlight: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        dimmed && { opacity: 0.35 },
        highlight && { transform: [{ scale: 1.02 }] },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <LinearGradient
        colors={[card.from, card.to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardBg}
      >
        <Text style={[styles.cardEmoji, { color: card.fg }]}>{card.emoji}</Text>
        <View>
          <Text style={[styles.cardText, { color: card.fg }]}>{card.text}</Text>
          <View style={styles.tagRow}>
            {card.tags.map((t) => (
              <View
                key={t}
                style={[
                  styles.tag,
                  { backgroundColor: hexWithAlpha(card.fg, 0.16) },
                ]}
              >
                <Text style={[styles.tagText, { color: card.fg }]}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

// Convert a #rrggbb to an rgba(r,g,b,alpha) string. Ignores #rgb shorthand.
function hexWithAlpha(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{6})$/i.exec(hex);
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  const r = (v >> 16) & 0xff;
  const g = (v >> 8) & 0xff;
  const b = v & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 14,
    gap: 14,
  },
  back: {
    fontSize: 22,
    color: PALETTE.ink,
    fontWeight: '500',
    width: 22,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: PALETTE.hairline,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: PALETTE.accent,
    borderRadius: 2,
  },
  skip: {
    fontSize: 13,
    color: PALETTE.inkSoft,
    fontWeight: '500',
    letterSpacing: 0.4,
  },

  titleWrap: { paddingHorizontal: 22, paddingBottom: 14 },
  eyebrow: {
    fontSize: 11,
    color: PALETTE.plum,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontWeight: '500',
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    color: PALETTE.ink,
    fontWeight: '500',
    letterSpacing: -0.6,
    lineHeight: 32,
  },

  cardsWrap: {
    flex: 1,
    paddingHorizontal: 18,
    gap: 12,
    paddingBottom: 12,
  },
  card: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#1f1b16',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardBg: {
    flex: 1,
    padding: 22,
    justifyContent: 'space-between',
  },
  cardEmoji: { fontSize: 38, lineHeight: 42 },
  cardText: {
    fontSize: 19,
    fontWeight: '500',
    fontStyle: 'italic',
    lineHeight: 25,
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  tagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  hint: {
    fontSize: 12,
    color: PALETTE.inkSoft,
    textAlign: 'center',
    paddingBottom: 12,
    letterSpacing: 0.6,
  },
});
