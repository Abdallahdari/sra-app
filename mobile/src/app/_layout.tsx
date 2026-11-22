import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { C, F } from '@/constants/theme';
import { AuthProvider } from '@/lib/auth';
import { queryClient } from '@/lib/queries';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Cached API responses are saved on the phone, so the app opens instantly
// (and works offline) with the last data, then refreshes in the background.
const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: 'sra-cache-v1', throttleTime: 2000 });

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: C.navy, background: C.bg, card: C.white, text: C.navy, border: C.border },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        // never persist admin data on the device
        dehydrateOptions: { shouldDehydrateQuery: (q) => q.queryKey[0] !== 'admin' && q.state.status === 'success' },
      }}>
      <AuthProvider>
        <ThemeProvider value={theme}>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerTintColor: C.navy,
              headerTitleStyle: { fontFamily: F.bold, fontSize: 17, color: C.navy },
              headerBackButtonDisplayMode: 'minimal',
              headerShadowVisible: false,
              headerStyle: { backgroundColor: C.white },
              contentStyle: { backgroundColor: C.bg },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="item/[id]" options={{ title: '', headerTransparent: true, headerStyle: { backgroundColor: 'transparent' } }} />
            <Stack.Screen name="list/[type]" options={{ title: '' }} />
            <Stack.Screen name="about" options={{ title: 'About SRA' }} />
            <Stack.Screen name="contact" options={{ title: 'Contact us' }} />
            <Stack.Screen name="admin/login" options={{ title: 'Admin sign in', presentation: 'modal' }} />
            <Stack.Screen name="admin/index" options={{ title: 'Dashboard' }} />
            <Stack.Screen name="admin/[type]" options={{ title: '' }} />
            <Stack.Screen name="admin/edit" options={{ title: '', presentation: 'modal' }} />
            <Stack.Screen name="admin/settings" options={{ title: 'Site settings' }} />
          </Stack>
        </ThemeProvider>
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}
