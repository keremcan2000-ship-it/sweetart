import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './lib/auth';
import WelcomeScreen from './screens/WelcomeScreen';
import SignUpScreen from './screens/SignUpScreen';
import SignInScreen from './screens/SignInScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import MainTabs from './navigation/MainTabs';
import ChatScreen from './screens/ChatScreen';
import BriefDetailScreen from './screens/BriefDetailScreen';
import CreateBriefScreen from './screens/CreateBriefScreen';
import AestheticQuizScreen from './screens/AestheticQuizScreen';
import AestheticResultScreen from './screens/AestheticResultScreen';
import SettingsScreen from './screens/SettingsScreen';

export type RootStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  SignIn: undefined;
  Onboarding: undefined;
  Main: undefined;
  Chat:
    | {
        kind: 'match';
        matchId: string;
        otherUserId: string;
        otherName: string;
        otherPhotoUrl: string | null;
        otherArtForm: string | null;
      }
    | {
        kind: 'group';
        briefGroupId: string;
        briefTitle: string;
      };
  BriefDetail: { briefId: string };
  CreateBrief: undefined;
  AestheticQuiz: undefined;
  AestheticResult: { pickIds: string[] };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNav() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FFF6F2',
        }}
      >
        <ActivityIndicator size="large" color="#FF8FAB" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FFF6F2' },
          animation: 'slide_from_right',
        }}
      >
        {!session ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="SignIn" component={SignInScreen} />
          </>
        ) : !profile?.name ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="BriefDetail" component={BriefDetailScreen} />
            <Stack.Screen name="CreateBrief" component={CreateBriefScreen} />
            <Stack.Screen name="AestheticQuiz" component={AestheticQuizScreen} />
            <Stack.Screen name="AestheticResult" component={AestheticResultScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
