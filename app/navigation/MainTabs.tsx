import { Text, View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import DiscoverScreen from '../screens/DiscoverScreen';
import ActivitiesScreen from '../screens/ActivitiesScreen';
import EventsScreen from '../screens/EventsScreen';
import YouScreen from '../screens/YouScreen';

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
        name="Activities"
        component={ActivitiesScreen}
        options={{ tabBarIcon: makeTabIcon('🎨') }}
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
