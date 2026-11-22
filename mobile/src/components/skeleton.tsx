import { LinearGradient } from 'expo-linear-gradient';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import { C, R, S } from '@/constants/theme';

// One shared animation clock for all skeletons on screen, so they shimmer in sync
// and we run a single animation instead of one per block.
const Clock = createContext<SharedValue<number> | null>(null);

export function SkeletonGroup({ children }: { children: ReactNode }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 1150, easing: Easing.inOut(Easing.ease) }), -1, false);
  }, [t]);
  return <Clock.Provider value={t}>{children}</Clock.Provider>;
}

export function Skeleton({ w = '100%', h = 14, r = 6, style }: { w?: DimensionValue; h?: DimensionValue; r?: number; style?: StyleProp<ViewStyle> }) {
  const t = useContext(Clock);
  const shine = useAnimatedStyle(() => ({
    transform: [{ translateX: `${-100 + (t?.value ?? 0) * 200}%` as any }],
  }));
  return (
    <View style={[{ width: w, height: h, borderRadius: r, backgroundColor: C.skeleton, overflow: 'hidden' }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, shine]}>
        <LinearGradient
          colors={['transparent', C.skeletonHi, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

// ---------- ready-made skeleton layouts that mirror the real cards ----------

export function CardSkeleton({ image = true, imageH = 170, lines = 2 }: { image?: boolean; imageH?: number; lines?: number }) {
  return (
    <View style={sk.card}>
      {image && <Skeleton h={imageH} r={0} />}
      <View style={{ padding: 14, gap: 9 }}>
        <Skeleton w={84} h={18} r={R.pill} />
        <Skeleton w="92%" h={16} />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} w={i === lines - 1 ? '60%' : '100%'} h={12} />
        ))}
      </View>
    </View>
  );
}

export function RowSkeleton({ avatar = 64, round = false }: { avatar?: number; round?: boolean }) {
  return (
    <View style={[sk.card, { flexDirection: 'row', padding: 12, gap: 12, alignItems: 'center' }]}>
      <Skeleton w={avatar} h={avatar} r={round ? avatar / 2 : 12} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton w={70} h={14} r={R.pill} />
        <Skeleton w="90%" h={14} />
        <Skeleton w="55%" h={11} />
      </View>
    </View>
  );
}

export function ListSkeleton({ count = 5, kind = 'card' }: { count?: number; kind?: 'card' | 'row' | 'person' | 'grid' | 'text' }) {
  return (
    <SkeletonGroup>
      <View style={kind === 'grid' ? sk.grid : { gap: S.gap }}>
        {Array.from({ length: count }).map((_, i) =>
          kind === 'row' ? (
            <RowSkeleton key={i} />
          ) : kind === 'person' ? (
            <RowSkeleton key={i} avatar={56} round />
          ) : kind === 'grid' ? (
            <View key={i} style={{ width: '48.5%' }}>
              <CardSkeleton imageH={150} lines={1} />
            </View>
          ) : kind === 'text' ? (
            <View key={i} style={[sk.card, { padding: 16, gap: 10 }]}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Skeleton w={80} h={18} r={R.pill} />
                <Skeleton w={60} h={18} r={R.pill} />
              </View>
              <Skeleton w="95%" h={16} />
              <Skeleton w="80%" h={16} />
              <Skeleton w="100%" h={12} />
              <Skeleton w="45%" h={12} />
            </View>
          ) : (
            <CardSkeleton key={i} />
          ),
        )}
      </View>
    </SkeletonGroup>
  );
}

export function HomeSkeleton() {
  return (
    <SkeletonGroup>
      <Skeleton h={430} r={0} />
      <View style={{ padding: S.gutter, gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} w="23%" h={64} r={14} />
          ))}
        </View>
        <Skeleton w={110} h={12} style={{ marginTop: 18 }} />
        <Skeleton w="70%" h={24} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ width: '70%' }}>
            <CardSkeleton />
          </View>
          <View style={{ width: '30%' }}>
            <CardSkeleton />
          </View>
        </View>
        <Skeleton w={110} h={12} style={{ marginTop: 18 }} />
        <Skeleton w="60%" h={24} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} w={150} h={190} r={14} />
          ))}
        </View>
      </View>
    </SkeletonGroup>
  );
}

export function DetailSkeleton() {
  return (
    <SkeletonGroup>
      <Skeleton h={260} r={0} />
      <View style={{ padding: S.gutter, gap: 12 }}>
        <Skeleton w={96} h={20} r={R.pill} />
        <Skeleton w="95%" h={24} />
        <Skeleton w="70%" h={24} />
        <Skeleton w={120} h={12} style={{ marginBottom: 10 }} />
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} w={i % 4 === 3 ? '65%' : '100%'} h={13} />
        ))}
      </View>
    </SkeletonGroup>
  );
}

const sk = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: S.gap },
});
