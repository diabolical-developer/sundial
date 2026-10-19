// Import only the weights we use, so the web build ships 7 font files instead of 21.
import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque/600SemiBold';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { Figtree_400Regular } from '@expo-google-fonts/figtree/400Regular';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_600SemiBold } from '@expo-google-fonts/figtree/600SemiBold';
import { Figtree_700Bold } from '@expo-google-fonts/figtree/700Bold';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Onboarding } from './src/components/Onboarding';
import { Home } from './src/Home';
import { configureReminders } from './src/reminders';
import { StoreProvider, useStore } from './src/store';
import { useTheme } from './src/theme';

configureReminders();

type SplashWindow = {
  __splashStart?: number;
  document?: { getElementById: (id: string) => { classList: { add: (c: string) => void }; remove: () => void } | null };
};

/** Lets the sunrise reach the moment the sun clears the ridge, even when the app loads faster. */
const SPLASH_MIN_MS = 1700;

/** Fades out the web splash from index.html once there is something to show. */
function useLiftSplash(ready: boolean) {
  useEffect(() => {
    if (!ready || Platform.OS !== 'web') return;
    const w = globalThis as SplashWindow;
    const el = w.document?.getElementById('splash');
    if (!el) return;
    // Dev only: open with ?splash to keep the loading animation on screen.
    if (__DEV__ && /[?&]splash\b/.test((globalThis as { location?: { search: string } }).location?.search ?? '')) return;
    const shown = performance.now() - (w.__splashStart ?? 0);
    let remove: ReturnType<typeof setTimeout> | undefined;
    const lift = setTimeout(() => {
      el.classList.add('gone');
      remove = setTimeout(() => el.remove(), 900);
    }, Math.max(0, SPLASH_MIN_MS - shown));
    return () => {
      clearTimeout(lift);
      if (remove) clearTimeout(remove);
    };
  }, [ready]);
}

function Gate() {
  const t = useTheme();
  const { loaded, settings } = useStore();
  useLiftSplash(loaded);
  if (!loaded) return <View style={[styles.fill, { backgroundColor: t.bg }]} />;
  if (!settings.onboarded) return <Onboarding />;
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.fill}>
      <Home />
    </Animated.View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });

  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <StoreProvider>{fontsLoaded ? <Gate /> : <View style={[styles.fill, { backgroundColor: '#17143A' }]} />}</StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
