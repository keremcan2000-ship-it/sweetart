import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

const artFormEmoji: Record<string, string> = {
  Painting: '🎨', Illustration: '🖌️', Drawing: '✏️', Photography: '📷',
  Filmmaking: '🎬', Animation: '🎞️', 'Theatre / acting': '🎭',
  'Stand-up': '🎤', 'Classical music': '🎻', 'Indie / band': '🎸',
  Jazz: '🎷', Songwriting: '🎶', Dance: '💃', Ceramics: '🏺',
  Poetry: '📝', 'Fiction writing': '📖',
};

export default function ChatScreen({ route, navigation }: Props) {
  const { matchId, otherName, otherPhotoUrl, otherArtForm } = route.params;
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  // Initial fetch + realtime subscription.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('id, match_id, sender_id, body, created_at, read_at')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (!cancelled) {
        if (error) console.warn('messages fetch failed', error.message);
        setMessages((data as Message[]) ?? []);
        setLoading(false);
      }
    })();

    // Realtime: broadcast inserts on this match.
    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m],
          );
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [session, matchId]);

  // Mark unread inbound messages as read whenever the list changes.
  useEffect(() => {
    if (!session) return;
    const unread = messages.filter(
      (m) => m.sender_id !== session.user.id && !m.read_at,
    );
    if (unread.length === 0) return;
    const ids = unread.map((m) => m.id);
    supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids)
      .then(({ error }) => {
        if (error) console.warn('mark read failed', error.message);
      });
  }, [messages, session]);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [messages.length]);

  const send = async () => {
    if (!session || sending) return;
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setDraft('');
    const { error } = await supabase.from('messages').insert({
      match_id: matchId,
      sender_id: session.user.id,
      body,
    });
    if (error) {
      console.warn('send failed', error.message);
      // Restore the draft so the user can retry.
      setDraft(body);
    }
    setSending(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          {otherPhotoUrl ? (
            <Image source={{ uri: otherPhotoUrl }} style={styles.headerAvatar} />
          ) : (
            <LinearGradient
              colors={['#FFD6E0', '#E2D9F3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerAvatar}
            >
              <Text style={{ fontSize: 18 }}>
                {artFormEmoji[otherArtForm ?? ''] ?? '🎨'}
              </Text>
            </LinearGradient>
          )}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.headerName}>{otherName}</Text>
            {otherArtForm ? (
              <Text style={styles.headerSub}>
                {artFormEmoji[otherArtForm] ?? '🎨'} {otherArtForm}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        style={{ flex: 1 }}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#FF8FAB" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatEmoji}>💌</Text>
                <Text style={styles.emptyChatTitle}>Konuşmaya başlayın</Text>
                <Text style={styles.emptyChatBody}>
                  İlk mesajı atan sanatla başlasın diye söylüyorlar.
                </Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const mine = item.sender_id === session?.user.id;
              const prev = messages[index - 1];
              const showDate =
                !prev || sameDay(item.created_at, prev.created_at) === false;
              return (
                <View>
                  {showDate && (
                    <Text style={styles.dateSep}>
                      {formatDate(item.created_at)}
                    </Text>
                  )}
                  <View
                    style={[
                      styles.bubbleRow,
                      mine ? styles.bubbleRowMine : styles.bubbleRowTheirs,
                    ]}
                  >
                    {mine ? (
                      <LinearGradient
                        colors={['#FF8FAB', '#C8B6FF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.bubble, styles.bubbleMine]}
                      >
                        <Text style={styles.bubbleTextMine}>{item.body}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[styles.bubble, styles.bubbleTheirs]}>
                        <Text style={styles.bubbleTextTheirs}>{item.body}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Bir mesaj yaz…"
            placeholderTextColor="#9D99B8"
            multiline
            style={styles.input}
            onSubmitEditing={send}
            blurOnSubmit={false}
          />
          <Pressable
            onPress={send}
            disabled={sending || !draft.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              (!draft.trim() || sending) && styles.sendBtnDisabled,
              pressed && styles.sendBtnPressed,
            ]}
          >
            <LinearGradient
              colors={
                draft.trim() && !sending
                  ? ['#FF8FAB', '#C8B6FF']
                  : ['#E8E2F2', '#E8E2F2']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sendBtnBg}
            >
              <Text style={styles.sendBtnText}>↑</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function sameDay(aIso: string, bIso: string): boolean {
  const a = new Date(aIso);
  const b = new Date(bIso);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (sameDay(iso, today.toISOString())) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(iso, yesterday.toISOString())) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF6F2' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1ECF7',
    gap: 10,
  },
  back: { fontSize: 24, color: '#2D2A4A', fontWeight: '700', width: 24 },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerName: { fontSize: 16, fontWeight: '800', color: '#2D2A4A' },
  headerSub: { fontSize: 12, color: '#6B6883', marginTop: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  listContent: { padding: 12, paddingBottom: 4, flexGrow: 1 },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyChatEmoji: { fontSize: 48 },
  emptyChatTitle: { fontSize: 18, fontWeight: '800', color: '#2D2A4A', marginTop: 12 },
  emptyChatBody: { fontSize: 14, color: '#6B6883', textAlign: 'center', marginTop: 6, lineHeight: 20 },

  dateSep: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9D99B8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 14,
    marginBottom: 6,
  },

  bubbleRow: { flexDirection: 'row', marginVertical: 3 },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  bubbleMine: {
    borderBottomRightRadius: 6,
  },
  bubbleTheirs: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 6,
    shadowColor: '#2D2A4A',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  bubbleTextMine: { color: 'white', fontSize: 15, lineHeight: 21 },
  bubbleTextTheirs: { color: '#2D2A4A', fontSize: 15, lineHeight: 21 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1ECF7',
    backgroundColor: '#FFF6F2',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderRadius: 20,
    fontSize: 15,
    color: '#2D2A4A',
    borderWidth: 1,
    borderColor: '#F1ECF7',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnPressed: { opacity: 0.85, transform: [{ scale: 0.95 }] },
  sendBtnBg: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { color: 'white', fontSize: 22, fontWeight: '900', lineHeight: 24 },
});
