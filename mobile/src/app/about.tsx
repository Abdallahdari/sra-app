import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Markdown } from '@/components/markdown';
import { DetailSkeleton } from '@/components/skeleton';
import { Button, ErrorState, T } from '@/components/ui';
import { C, F, R, S } from '@/constants/theme';
import { useSettings } from '@/lib/queries';

export default function About() {
  const { data, isPending, isError, refetch } = useSettings();
  if (isPending) return <DetailSkeleton />;
  if (isError && !data) return <ErrorState onRetry={refetch} />;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.white }} contentContainerStyle={{ padding: S.gutter, paddingBottom: 48 }}>
      <View style={styles.brand}>
        <Image source={require('@/assets/images/sra-logo.jpg')} style={{ width: 96, height: 96 }} contentFit="contain" />
        <T v="h2" style={{ textAlign: 'center' }}>Somali Researchers Association</T>
        <T style={{ textAlign: 'center' }}>Independent research, monitoring and data on Somalia since 2010.</T>
      </View>
      {data?.stats?.length ? (
        <View style={styles.stats}>
          {data.stats.map((s) => (
            <View key={s.label} style={styles.stat}>
              <Text style={styles.val}>{s.value}</Text>
              <Text style={styles.lbl}>{s.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {data?.about ? <Markdown body={data.about} /> : null}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 26, flexWrap: 'wrap' }}>
        <Button label="Meet our researchers" href="/list/researcher" icon="people" />
        <Button label="Contact" variant="outline" href="/contact" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 20 },
  stat: { width: '48%', flexGrow: 1, backgroundColor: C.tint, borderRadius: R.lg, padding: 14 },
  val: { fontFamily: F.extrabold, fontSize: 24, color: C.navy },
  lbl: { fontFamily: F.medium, fontSize: 13, color: C.body, marginTop: 2 },
});
