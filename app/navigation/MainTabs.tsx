import { useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import DiscoverScreen from '../screens/DiscoverScreen';
import MatchesScreen from '../screens/MatchesScreen';
import EventsScreen from '../screens/EventsScreen';
import YouScreen from '../screens/YouScreen';
import { postOnboardingFlag } from '../lib/postOnboardingFlag';
import type { RootStackParamList } from '../App';

const Tab = createBottomTabNavigator();

function makeTabIcon(emoji: string) {
  // eslint-disable-next-line react/display-name
  return ({ focused }: { focused: boolean }) => (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Text style={[styles.iconEmoji, focused && styles.iconEmojiActive]}>{emoji}</Text>
    </View>
  );
}

export default function MainTabs() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // First-mount only: if the user just finished onboarding, push the
  // aesthetic quiz on top. The user can skip it from there. This runs
  // exactly once per session because the flag is a one-shot consume.
  useEffect(() => {
    if (postOnboardingFlag.consume()) {
      // Defer one tick so the Tab.Navigator is fully mounted.
      const t = setTimeout(() => {
        navigation.navigate('AestheticQuiz');
      }, 0);
      return () => clearTimeout(t);
    }
  }, [navigation]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#E96B8E',
        tabBarInactiveTintColor: '#9D99B8',
        tabBarStyle: {
          backgroundColor: 'rgba(255,255,255,0.96)',
          borderTopColor: 'rgba(0,0,0,0.06)',
          borderTopWidth: 1,
          height: 84,
          paddingTop: 8,
          paddingBottom: 28,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: -2,
        },
      }}
    >
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{ tabBarIcon: makeTabIcon('💞') }}
      />
      <Tab.Screen
        name="Messages"
        component={MatchesScreen}
        options={{ tabBarIcon: makeTabIcon('💬') }}
      />
      <Tab.Screen
        name="Events"
        component={EventsScreen}
        options={{ tabBarIcon: makeTabIcon('🎭') }}
      />
      <Tab.Screen
        name="You"
        component={YouScreen}
        options={{ tabBarIcon: makeTabIcon('🧑‍🎨') }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: '#FFD6E0' },
  iconEmoji: { fontSize: 20, opacity: 0.55 },
  iconEmojiActive: { opacity: 1 },
});
