import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Stack, useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Img } from '@/components/cards';
import { ListSkeleton, Skeleton, SkeletonGroup } from '@/components/skeleton';
import { Button, ErrorState, T, type IconName, PressLink } from '@/components/ui';
import { C, F, R, S, shadowSm } from '@/constants/theme';
import { useAdminStats } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { fmtDate } from '@/lib/format';
import { useTypes } from '@/lib/queries';

const QUICK: { type: string; label: string; icon: IconName }[] = [
  { type: 'research', label: 'Research', icon: 'library' },
  { type: 'event', label: 'Event', icon: 'calendar' },
  { type: 'insight', label: 'Flash card', icon: 'stats-chart' },
  { type: 'episode', label: 'Episode', icon: 'mic' },
];

export default function Dashboard() {
  const { user, ready, signOut } = useAuth();
  const router = useRouter();
  const stats = useAdminStats(!!user);
  const types = useTypes();

  if (!ready) return null;
  if (!user) return <Redirect href="/admin/login" />;

  const loading = stats.isPending || types.isPending;
  const labelOf = (t: string) => types.data?.find((x) => x.type === t)?.singular || t;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: S.gutter, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={stats.isRefetching} onRefresh={() => void stats.refetch()} tintColor={C.navy} />}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={async () => {
                await signOut();
                router.replace('/more');
              }}
              hitSlop={10}
              accessibilityLabel="Sign out">
              <Ionicons name="log-out-outline" size={22} color={C.navy} />
            </Pressable>
          ),
        }}
      />

      <View style={styles.welcome}>
        <Text style={styles.wEyebrow}>SRA CONTENT DASHBOARD</Text>
        <Text style={styles.wTitle}>Welcome, {user.name || 'Admin'}</Text>
        <Text style={styles.wSub}>Everything you publish here appears in the app immediately.</Text>
        <View style={styles.wStats}>
          <View>
            <Text style={styles.wNum}>{stats.data?.total ?? '–'}</Text>
            <Text style={styles.wLbl}>Total items</Text>
          </View>
          <View>
            <Text style={styles.wNum}>{stats.data ? Object.values(stats.data.byType).reduce((s, v) => s + v.drafts, 0) : '–'}</Text>
            <Text style={styles.wLbl}>Drafts</Text>
          </View>
        </View>
      </View>

      <T v="eyebrow" style={styles.h}>Quick post</T>
      <View style={styles.quick}>
        {QUICK.map((q) => (
          <PressLink key={q.type} href={{ pathname: '/admin/edit', params: { type: q.type } }}  style={({ pressed }) => [styles.quickBtn, pressed && { opacity: 0.85 }]}>
              <View style={styles.quickIcon}>
                <Ionicons name={q.icon} size={20} color={C.white} />
              </View>
              <Text style={styles.quickText}>New {q.label.toLowerCase()}</Text>
            </PressLink>
        ))}
      </View>

      <T v="eyebrow" style={styles.h}>Manage sections</T>
      {loading ? (
        <SkeletonGroup>
          <View style={styles.grid}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} w="48.5%" h={104} r={R.lg} />
            ))}
          </View>
        </SkeletonGroup>
      ) : stats.isError || types.isError ? (
        <ErrorState onRetry={() => { stats.refetch(); types.refetch(); }} />
      ) : (
        <View style={styles.grid}>
          {types.data!.map((t) => {
            const s = stats.data!.byType[t.type] || { total: 0, drafts: 0 };
            return (
              <PressLink key={t.type} href={`/admin/${t.type}`}  style={({ pressed }) => [styles.tile, pressed && { transform: [{ scale: 0.98 }] }]}>
                  <View style={styles.tileTop}>
                    <View style={styles.tileIcon}>
                      <Ionicons name={t.icon as IconName} size={18} color={C.navy} />
                    </View>
                    <Text style={styles.tileNum}>{s.total}</Text>
                  </View>
                  <Text style={styles.tileLabel} numberOfLines={1}>{t.label}</Text>
                  <Text style={styles.tileSub}>{s.drafts ? `${s.drafts} draft${s.drafts > 1 ? 's' : ''}` : 'All published'}</Text>
                </PressLink>
            );
          })}
          <PressLink href="/admin/settings"  style={[styles.tile, { backgroundColor: C.tint }]}>
              <View style={styles.tileTop}>
                <View style={[styles.tileIcon, { backgroundColor: C.white }]}>
                  <Ionicons name="settings" size={18} color={C.navy} />
                </View>
              </View>
              <Text style={styles.tileLabel}>Site settings</Text>
              <Text style={styles.tileSub}>Hero, stats, contact</Text>
            </PressLink>
        </View>
      )}

      <T v="eyebrow" style={styles.h}>Recently updated</T>
      {stats.isPending ? (
        <ListSkeleton kind="row" count={3} />
      ) : (
        <View style={styles.recentBox}>
          {stats.data?.recent.map((r, i) => (
            <PressLink key={r._id} href={{ pathname: '/admin/edit', params: { type: r.type, id: r._id } }}  style={({ pressed }) => [styles.recent, i > 0 && styles.recentBorder, pressed && { backgroundColor: C.tint }]}>
                <Img uri={r.image} style={styles.recentImg} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentType}>{labelOf(r.type)}{r.published ? '' : ' · Draft'}</Text>
                  <Text style={styles.recentTitle} numberOfLines={1}>{r.title}</Text>
                  <Text style={styles.recentDate}>{fmtDate(r.updatedAt)}</Text>
                </View>
                <Ionicons name="create-outline" size={18} color={C.muted} />
              </PressLink>
          ))}
        </View>
      )}

      <Button label="View the app as a visitor" variant="outline" icon="eye-outline" href="/" style={{ marginTop: 26 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h: { marginTop: 26, marginBottom: 10, marginLeft: 2 },
  welcome: { backgroundColor: C.navy, borderRadius: R.xl, padding: 20 },
  wEyebrow: { fontFamily: F.extrabold, fontSize: 11, letterSpacing: 1.4, color: C.sky },
  wTitle: { fontFamily: F.extrabold, fontSize: 23, color: C.white, marginTop: 6 },
  wSub: { fontFamily: F.regular, fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  wStats: { flexDirection: 'row', gap: 32, marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
  wNum: { fontFamily: F.extrabold, fontSize: 24, color: C.white },
  wLbl: { fontFamily: F.medium, fontSize: 12, color: C.skySoft },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickBtn: {
    width: '48.4%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.white,
    borderRadius: R.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    ...shadowSm,
  },
  quickIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },
  quickText: { flex: 1, fontFamily: F.bold, fontSize: 14, color: C.navy },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  tile: { width: '48.5%', backgroundColor: C.white, borderRadius: R.lg, padding: 14, borderWidth: 1, borderColor: C.border },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tileIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center' },
  tileNum: { fontFamily: F.extrabold, fontSize: 22, color: C.navy },
  tileLabel: { fontFamily: F.bold, fontSize: 14.5, color: C.text },
  tileSub: { fontFamily: F.medium, fontSize: 12, color: C.muted, marginTop: 2 },
  recentBox: { backgroundColor: C.white, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  recent: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  recentBorder: { borderTopWidth: 1, borderTopColor: C.borderSoft },
  recentImg: { width: 46, height: 46, borderRadius: 10 },
  recentType: { fontFamily: F.extrabold, fontSize: 10.5, letterSpacing: 0.8, color: C.blue, textTransform: 'uppercase' },
  recentTitle: { fontFamily: F.bold, fontSize: 14.5, color: C.text, marginTop: 1 },
  recentDate: { fontFamily: F.regular, fontSize: 12, color: C.muted, marginTop: 1 },
});
