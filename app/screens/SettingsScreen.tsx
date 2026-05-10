import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { LEGAL_URLS } from '../lib/legal';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const APP_VERSION = '0.1.0'; // bump in lockstep with app.json

export default function SettingsScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [showDelete, setShowDelete] = useState(false);

  const handleSignOut = async () => {
    const confirmed = Platform.OS === 'web'
      ? // eslint-disable-next-line no-alert
        window.confirm('Sign out of Sweetart?')
      : await new Promise<boolean>((resolve) =>
          Alert.alert('Sign out?', undefined, [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Sign out', onPress: () => resolve(true) },
          ]),
        );
    if (!confirmed) return;
    await supabase.auth.signOut();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Section label="Account">
          <Row
            label="Email"
            value={session?.user.email ?? '—'}
          />
          <Row
            label="Sign out"
            danger={false}
            onPress={handleSignOut}
            chevron
          />
        </Section>

        <Section label="Legal">
          <Row
            label="Privacy Policy"
            chevron
            onPress={() => Linking.openURL(LEGAL_URLS.privacy)}
          />
          <Row
            label="Terms of Service"
            chevron
            onPress={() => Linking.openURL(LEGAL_URLS.terms)}
          />
        </Section>

        <Section label="Danger zone">
          <Row
            label="Delete account"
            danger
            chevron
            onPress={() => setShowDelete(true)}
          />
          <Text style={styles.dangerHint}>
            Hesabını silersen profilin, eşleşmelerin, mesajların ve
            ilanların geri dönüşü olmadan silinir.
          </Text>
        </Section>

        <Section label="App">
          <Row label="Version" value={APP_VERSION} />
        </Section>
      </ScrollView>

      <DeleteAccountModal
        visible={showDelete}
        onClose={() => setShowDelete(false)}
      />
    </SafeAreaView>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({
  label,
  value,
  chevron,
  danger,
  onPress,
}: {
  label: string;
  value?: string;
  chevron?: boolean;
  danger?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, danger && styles.rowDanger]}>
        {label}
      </Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {chevron ? <Text style={styles.rowChevron}>›</Text> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: 0.7 }]}
    >
      {content}
    </Pressable>
  );
}

// ============================================================
// DeleteAccountModal — typed-confirmation modal that calls the
// delete-account Edge Function. Requires the user to type their
// email address to proceed (industry standard friction).
// ============================================================
function DeleteAccountModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { session } = useAuth();
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expected = session?.user.email ?? '';
  const matches = confirm.trim().toLowerCase() === expected.toLowerCase();

  const reset = () => {
    setConfirm('');
    setBusy(false);
    setError(null);
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const handleDelete = async () => {
    if (!matches || busy) return;
    setBusy(true);
    setError(null);
    const { data, error: invokeErr } = await supabase.functions.invoke(
      'delete-account',
      { body: {} },
    );
    if (invokeErr) {
      setError(invokeErr.message);
      setBusy(false);
      return;
    }
    if (data?.status !== 'deleted') {
      setError(data?.reason ?? 'unknown error');
      setBusy(false);
      return;
    }
    // After successful deletion, sign out — the JWT is already
    // invalid, but this clears local storage + triggers RootNav.
    await supabase.auth.signOut();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.scrim}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Delete account</Text>
          <Text style={styles.modalBody}>
            This is permanent. All your photos, matches, messages, and
            briefs will be gone. We can't recover them.
          </Text>

          <Text style={styles.modalLabel}>
            Type your email to confirm:
          </Text>
          <Text style={styles.modalEmail}>{expected}</Text>
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="email@example.com"
            placeholderTextColor="#9D99B8"
            style={styles.modalInput}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <Pressable
              onPress={handleClose}
              disabled={busy}
              style={({ pressed }) => [
                styles.modalBtnGhost,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.modalBtnGhostText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleDelete}
              disabled={!matches || busy}
              style={({ pressed }) => [
                styles.modalBtnDanger,
                (!matches || busy) && { opacity: 0.45 },
                pressed && { opacity: 0.85 },
              ]}
            >
              {busy ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.modalBtnDangerText}>
                  Delete account
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF6F2' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1ECF7',
  },
  back: { fontSize: 22, color: '#2D2A4A', fontWeight: '700', width: 24 },
  title: { fontSize: 17, fontWeight: '800', color: '#2D2A4A' },

  scroll: { paddingBottom: 40 },

  section: { paddingHorizontal: 18, marginTop: 22 },
  sectionLabel: {
    fontSize: 11,
    color: '#6B6883',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  sectionBody: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1ECF7',
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    color: '#2D2A4A',
    fontWeight: '500',
  },
  rowDanger: { color: '#E8554F', fontWeight: '700' },
  rowValue: { fontSize: 14, color: '#6B6883' },
  rowChevron: {
    fontSize: 22,
    color: '#9D99B8',
    marginLeft: 6,
    lineHeight: 22,
  },
  dangerHint: {
    fontSize: 12,
    color: '#6B6883',
    marginTop: 8,
    paddingHorizontal: 4,
    lineHeight: 17,
  },

  // Modal
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(31,27,22,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 22,
    paddingBottom: 28,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#1F1B16',
    letterSpacing: -0.4,
  },
  modalBody: {
    fontSize: 14,
    color: '#2D2A4A',
    marginTop: 8,
    lineHeight: 20,
  },
  modalLabel: {
    fontSize: 12,
    color: '#6B6883',
    marginTop: 18,
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  modalEmail: {
    fontSize: 14,
    color: '#1F1B16',
    fontWeight: '700',
    marginBottom: 8,
  },
  modalInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEAF7',
    backgroundColor: '#FFF6F2',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1F1B16',
  },
  errorText: { color: '#E8554F', fontSize: 12, marginTop: 8 },

  modalBtnGhost: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1ECF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnGhostText: {
    color: '#2D2A4A',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBtnDanger: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8554F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnDangerText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
  },
});
