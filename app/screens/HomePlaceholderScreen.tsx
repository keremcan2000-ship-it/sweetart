import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { supabase } from '../lib/supabase';

export default function HomePlaceholderScreen() {
  const [email, setEmail] = useState<string>('');
  const [profileExists, setProfileExists] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData.user?.email ?? '—';
      setEmail(userEmail);

      // The trigger we wrote in 0001_init.sql should have auto-created
      // a row in `profiles` for this user. Let's verify.
      if (userData.user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userData.user.id)
          .maybeSingle();
        if (error) {
          console.warn('profile lookup failed', error.message);
          setProfileExists(false);
        } else {
          setProfileExists(!!profile);
        }
      }
    })();
  }, []);

  const onSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Sign-out failed', error.message);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <Text style={styles.emoji}>🎨</Text>
        <Text style={styles.title}>You're in!</Text>
        <Text style={styles.subtitle}>
          Hoş geldin, <Text style={styles.email}>{email}</Text>.
        </Text>
        <Text style={styles.note}>
          Burası şimdilik bir yer tutucu. Sonraki seanslarda Discover, Activities, Events ve You sekmeleri buraya gelecek; bu ekrandan onboarding'e geçeceğiz.
        </Text>
        <View style={styles.statusBlock}>
          <Text style={styles.statusLabel}>Auth</Text>
          <Text style={styles.statusValue}>active session ✓</Text>
        </View>
        <View style={styles.statusBlock}>
          <Text style={styles.statusLabel}>Profile row</Text>
          <Text style={styles.statusValue}>
            {profileExists === null
              ? 'checking…'
              : profileExists
              ? 'auto-created ✓'
              : 'missing — trigger failed?'}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
          onPress={onSignOut}
        >
          <LinearGradient
            colors={['#FF8FAB', '#C8B6FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.btnPrimaryBg}
          >
            <Text style={styles.btnPrimaryText}>Sign out</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF6F2' },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  emoji: { fontSize: 64, textAlign: 'center', marginBottom: 12 },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#2D2A4A',
    textAlign: 'center',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B6883',
    textAlign: 'center',
    marginTop: 8,
  },
  email: { color: '#FF8FAB', fontWeight: '800' },
  note: {
    fontSize: 14,
    color: '#9D99B8',
    textAlign: 'center',
    marginTop: 18,
    lineHeight: 20,
  },
  statusBlock: {
    marginTop: 24,
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#2D2A4A',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statusLabel: {
    fontSize: 13,
    color: '#6B6883',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statusValue: { fontSize: 13, color: '#2D2A4A', fontWeight: '700' },
  actions: { paddingHorizontal: 24, paddingBottom: 36 },
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
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
