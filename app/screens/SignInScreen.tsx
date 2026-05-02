import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

export default function SignInScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>
          Sign-in formu bir sonraki seansta gelecek. Şimdilik navigasyon iskeleti hazır.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF6F2' },
  header: { paddingHorizontal: 20, paddingTop: 8 },
  back: { fontSize: 16, color: '#2D2A4A', fontWeight: '700' },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#2D2A4A',
    letterSpacing: -0.8,
  },
  subtitle: { fontSize: 15, color: '#6B6883', marginTop: 8, lineHeight: 22 },
});
