import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Animated, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F } from '@/constants/theme';

export const DEVELOPER = {
  name: 'Abdallah Abdirisaq',
  title: 'Full Stack Software Engineer',
  url: 'https://dheere.dev/',
};

const openPortfolio = () => Linking.openURL(DEVELOPER.url).catch(() => {});

/** "Developed by" signature, shown at the bottom of screens (like "from Meta"). */
export function DevCredit({ showVersion = true }: { showVersion?: boolean }) {
  const version = Constants.expoConfig?.version;
  return (
    <Pressable
      onPress={openPortfolio}
      accessibilityRole="link"
      accessibilityLabel={`Developed by ${DEVELOPER.name}. Opens ${DEVELOPER.url}`}
      style={({ pressed }) => [styles.credit, pressed && { opacity: 0.6 }]}>
      <Text style={styles.from}>DEVELOPED BY</Text>
      <Text style={styles.name}>{DEVELOPER.name}</Text>
      <Text style={styles.meta}>
        {DEVELOPER.title} · dheere.dev
      </Text>
      {showVersion && version ? <Text style={styles.version}>SRA app · version {version}</Text> : null}
    </Pressable>
  );
}

/** Branded launch screen shown for a moment after the native splash: SRA logo, "from Abdallah Abdirisaq" at the bottom. */
export function LaunchCredit() {
  const [done, setDone] = useState(false);
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => setDone(true));
    }, 1300);
    return () => clearTimeout(t);
  }, [opacity]);

  if (done) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.launch, { opacity }]} pointerEvents="none">
      <Image source={require('@/assets/images/splash-icon.png')} style={{ width: 140, height: 140 }} contentFit="contain" />
      <View style={styles.launchFooter}>
        <Text style={styles.launchFrom}>from</Text>
        <Text style={styles.launchName}>{DEVELOPER.name}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  credit: { alignItems: 'center', paddingVertical: 28, gap: 2 },
  from: { fontFamily: F.semibold, fontSize: 11, letterSpacing: 1.6, color: C.muted },
  name: { fontFamily: F.extrabold, fontSize: 17, color: C.navy, marginTop: 2 },
  meta: { fontFamily: F.medium, fontSize: 12, color: C.blue },
  version: { fontFamily: F.regular, fontSize: 11, color: C.muted, marginTop: 8 },
  launch: { backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  launchFooter: { position: 'absolute', bottom: 56, alignItems: 'center' },
  launchFrom: { fontFamily: F.medium, fontSize: 13, color: C.skySoft },
  launchName: { fontFamily: F.extrabold, fontSize: 17, color: C.white, letterSpacing: 0.3, marginTop: 2 },
});
