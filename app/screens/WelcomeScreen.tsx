import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { supabase } from '../lib/supabase';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  const [supabaseStatus, setSupabaseStatus] = useState<string>('checking…');

  useEffect(() => {
    (async () => {
      try {
        const { error } = await supabase.auth.getSession();
        if (error) throw error;
        setSupabaseStatus('connected ✓');
      } catch (e: any) {
        setSupabaseStatus(`error: ${e?.message ?? 'unknown'}`);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.hero}>
        <View style={styles.iconGrid}>
          {['🎨', '🎬', '🎻', '🏺', '🎭', '📸'].map((e, i) => (
            <View key={i} style={styles.iconCell}>
              <Text style={styles.iconEmoji}>{e}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.title}>Sweetart</Text>
        <Text style={styles.tagline}>
          Date through the art you love.{'\n'}
          Match by activity, not just looks.
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
          onPress={() => navigation.navigate('SignUp')}
        >
          <LinearGradient
            colors={['#FF8FAB', '#C8B6FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.btnPrimaryBg}
          >
            <Text style={styles.btnPrimaryText}>Get started</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}
          onPress={() => navigation.navigate('SignIn')}
        >
          <Text style={styles.btnGhostText}>I already have an account</Text>
        </Pressable>

        <Text style={styles.legal}>By continuing you agree to our Terms & Privacy</Text>
        <Text style={styles.debug}>Supabase: {supabaseStatus}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF6F2' },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 18,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 200,
    justifyContent: 'space-between',
    rowGap: 10,
  },
  iconCell: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2D2A4A',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  iconEmoji: { fontSize: 28 },
  title: {
    fontSize: 44,
    fontWeight: '900',
    color: '#FF8FAB',
    letterSpacing: -1.2,
    marginTop: 16,
  },
  tagline: {
    fontSize: 16,
    color: '#6B6883',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  actions: { paddingHorizontal: 24, paddingBottom: 36, gap: 10 },
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
  legal: { fontSize: 11, color: '#9D99B8', textAlign: 'center', marginTop: 4 },
  debug: { fontSize: 10, color: '#9D99B8', textAlign: 'center', marginTop: 8 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
