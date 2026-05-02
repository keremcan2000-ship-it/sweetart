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
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

export default function SignInScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Hold up', 'Email ve şifre gerekli.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);

    if (error) {
      Alert.alert('Sign-in failed', error.message);
      return;
    }
    // App.tsx'teki onAuthStateChange listener Home'a otomatik yönlendirir.
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Email ve şifrenle gir, kaldığın yerden devam et.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              style={styles.input}
              placeholderTextColor="#9D99B8"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              placeholderTextColor="#9D99B8"
            />
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
            onPress={onSubmit}
            disabled={busy}
          >
            <LinearGradient
              colors={['#FF8FAB', '#C8B6FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btnPrimaryBg}
            >
              <Text style={styles.btnPrimaryText}>
                {busy ? 'Signing in…' : 'Sign in'}
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={() => navigation.navigate('SignUp')} hitSlop={10}>
            <Text style={styles.smallLink}>New here? Create an account</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF6F2' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  back: { fontSize: 16, color: '#2D2A4A', fontWeight: '700' },
  scroll: { paddingHorizontal: 24, paddingTop: 16 },
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
  actions: { paddingHorizontal: 24, paddingBottom: 36, gap: 12 },
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
  smallLink: {
    color: '#8E7CC3',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 14,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
