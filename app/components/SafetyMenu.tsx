import { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../lib/auth';
import {
  REPORT_CATEGORY_LABELS,
  type ReportCategory,
  type ReportSubject,
  blockUser,
  submitReport,
} from '../lib/safety';

// Cross-platform confirm. Alert.alert with multiple buttons doesn't
// render on react-native-web; window.confirm is the only option.
function platformConfirm(title: string, body: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    return Promise.resolve(window.confirm(`${title}\n\n${body}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, body, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Block', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

// ============================================================
// SafetyMenu — small overflow menu with Block + Report. Render
// it next to a user identity (chat header, profile card, brief
// creator). Calling code passes the target's user-id and any
// extra subjects (message-id, photo-id) so Report can pin to a
// specific piece of content if needed.
// ============================================================
export function SafetyMenu({
  targetUserId,
  targetName,
  reportSubject,
  onBlocked,
}: {
  targetUserId: string;
  targetName?: string;
  reportSubject?: Partial<ReportSubject>;
  onBlocked?: () => void;
}) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const handleBlock = async () => {
    setOpen(false);
    if (!session) return;
    const ok = await platformConfirm(
      `Block ${targetName ?? 'this user'}?`,
      'Bir daha eşleşmeyeceksiniz. Mevcut konuşmanız kapanır. Geri almak için ayarlardan açabilirsin.',
    );
    if (!ok) return;
    const { error } = await blockUser(session.user.id, targetUserId);
    if (error) {
      Alert.alert('Block failed', error);
      return;
    }
    onBlocked?.();
  };

  const handleReport = () => {
    setOpen(false);
    setReportOpen(true);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={10}
        style={styles.dotsBtn}
      >
        <Text style={styles.dotsText}>•••</Text>
      </Pressable>

      {/* Action sheet (custom, since RN's ActionSheet is iOS-only) */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.scrim} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {targetName ?? 'This user'}
            </Text>
            <Pressable
              onPress={handleReport}
              style={({ pressed }) => [
                styles.sheetItem,
                pressed && styles.sheetItemPressed,
              ]}
            >
              <Text style={styles.sheetItemText}>Report</Text>
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              onPress={handleBlock}
              style={({ pressed }) => [
                styles.sheetItem,
                pressed && styles.sheetItemPressed,
              ]}
            >
              <Text style={[styles.sheetItemText, styles.sheetItemDanger]}>
                Block
              </Text>
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              onPress={() => setOpen(false)}
              style={({ pressed }) => [
                styles.sheetItem,
                pressed && styles.sheetItemPressed,
              ]}
            >
              <Text style={styles.sheetItemText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <ReportSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        subject={{ userId: targetUserId, ...reportSubject }}
        targetName={targetName}
      />
    </>
  );
}

// ============================================================
// ReportSheet — category picker + free-text description.
// ============================================================
export function ReportSheet({
  visible,
  onClose,
  subject,
  targetName,
}: {
  visible: boolean;
  onClose: () => void;
  subject: ReportSubject;
  targetName?: string;
}) {
  const { session } = useAuth();
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setCategory(null);
    setDescription('');
    setSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!session || !category) return;
    setSubmitting(true);
    const { error } = await submitReport({
      reporterId: session.user.id,
      subject,
      category,
      description,
    });
    setSubmitting(false);
    if (error) {
      Alert.alert('Report failed', error);
      return;
    }
    Alert.alert(
      'Thanks for reporting',
      'Bu raporu inceleyeceğiz. Acil bir durumdaysan engellemeyi de kullanmanı öneririz.',
    );
    reset();
    onClose();
  };

  const cats = Object.keys(REPORT_CATEGORY_LABELS) as ReportCategory[];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.scrim}>
        <View style={styles.reportSheet}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>
              Report {targetName ?? 'content'}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.reportClose}>×</Text>
            </Pressable>
          </View>

          <Text style={styles.reportLabel}>What's wrong?</Text>
          <View style={{ gap: 8 }}>
            {cats.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={({ pressed }) => [
                  styles.catRow,
                  category === c && styles.catRowActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View
                  style={[
                    styles.radio,
                    category === c && styles.radioActive,
                  ]}
                />
                <Text style={styles.catText}>
                  {REPORT_CATEGORY_LABELS[c]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.reportLabel, { marginTop: 16 }]}>
            More details (optional)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="What happened? Anything you tell us helps."
            placeholderTextColor="#9D99B8"
            style={styles.descInput}
          />

          <Pressable
            onPress={handleSubmit}
            disabled={!category || submitting}
            style={({ pressed }) => [
              styles.submitBtn,
              (!category || submitting) && { opacity: 0.5 },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.submitBtnText}>
              {submitting ? 'Sending…' : 'Submit report'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dotsBtn: { paddingHorizontal: 6, paddingVertical: 2 },
  dotsText: {
    fontSize: 22,
    color: '#2D2A4A',
    fontWeight: '900',
    letterSpacing: 1,
  },

  scrim: {
    flex: 1,
    backgroundColor: 'rgba(31,27,22,0.45)',
    justifyContent: 'flex-end',
  },

  // Action sheet for SafetyMenu
  sheet: {
    backgroundColor: 'white',
    paddingTop: 14,
    paddingBottom: 28,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  sheetTitle: {
    fontSize: 12,
    color: '#6B6883',
    textAlign: 'center',
    paddingVertical: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sheetItem: {
    paddingVertical: 16,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  sheetItemPressed: { backgroundColor: '#F8F4ED' },
  sheetItemText: { fontSize: 16, color: '#2D2A4A', fontWeight: '500' },
  sheetItemDanger: { color: '#E8554F', fontWeight: '700' },
  divider: { height: 0.5, backgroundColor: '#EFEAF7' },

  // Report sheet
  reportSheet: {
    backgroundColor: 'white',
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 28,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F1B16',
    letterSpacing: -0.3,
  },
  reportClose: { fontSize: 28, color: '#9D99B8', lineHeight: 28 },
  reportLabel: {
    fontSize: 11,
    color: '#6B5B95',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#F8F4ED',
    borderWidth: 1,
    borderColor: '#F8F4ED',
  },
  catRowActive: {
    backgroundColor: '#FFF3EE',
    borderColor: '#E8554F',
  },
  catText: { flex: 1, fontSize: 14, color: '#1F1B16', fontWeight: '500' },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#C8B6FF',
    backgroundColor: 'white',
  },
  radioActive: {
    borderColor: '#E8554F',
    backgroundColor: '#E8554F',
  },

  descInput: {
    minHeight: 80,
    maxHeight: 160,
    padding: 12,
    backgroundColor: '#F8F4ED',
    borderRadius: 14,
    fontSize: 14,
    color: '#1F1B16',
    borderWidth: 1,
    borderColor: '#EFEAF7',
    textAlignVertical: 'top',
  },

  submitBtn: {
    marginTop: 16,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1F1B16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
});
