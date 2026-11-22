import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ListSkeleton } from '@/components/skeleton';
import { T, type IconName } from '@/components/ui';
import { C, F, R, S } from '@/constants/theme';
import { useSettings } from '@/lib/queries';

function Row({ icon, label, value, url }: { icon: IconName; label: string; value: string; url?: string }) {
  return (
    <Pressable onPress={url ? () => Linking.openURL(url).catch(() => {}) : undefined} style={({ pressed }) => [styles.row, pressed && url && { backgroundColor: C.tint }]}>
      <View style={styles.icon}>
        <Ionicons name={icon} size={20} color={C.navy} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      {url ? <Ionicons name="chevron-forward" size={17} color={C.muted} /> : null}
    </Pressable>
  );
}

export default function Contact() {
  const { data, isPending } = useSettings();
  if (isPending) return <View style={{ padding: S.gutter }}><ListSkeleton kind="row" count={4} /></View>;
  const c = data?.contact || {};
  const wa = c.phones?.[0]?.replace(/[^\d]/g, '');
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: S.gutter, paddingBottom: 40 }}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Planning a study, survey or evaluation?</Text>
        <Text style={styles.heroSub}>Tell us what you need to know and where. Our team will get back to you.</Text>
      </View>
      <View style={styles.box}>
        {c.phones?.map((p) => <Row key={p} icon="call" label="Phone" value={p} url={`tel:${p.replace(/\s/g, '')}`} />)}
        {wa ? <Row icon="logo-whatsapp" label="WhatsApp" value={c.phones![0]} url={`https://wa.me/${wa}`} /> : null}
        {c.email ? <Row icon="mail" label="Email" value={c.email} url={`mailto:${c.email}`} /> : null}
        {c.address ? (
          <Row icon="location" label="Office" value={c.address} url={`https://maps.google.com/?q=${encodeURIComponent(c.address)}`} />
        ) : null}
        {c.website ? <Row icon="globe" label="Website" value={c.website.replace(/^https?:\/\//, '')} url={c.website} /> : null}
      </View>
      <T style={{ marginTop: 18, fontSize: 13.5, textAlign: 'center' }}>For translation quotes, ethics review and partnerships, contact us by phone or email.</T>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: C.navy, borderRadius: R.xl, padding: 20, marginBottom: 16 },
  heroTitle: { fontFamily: F.extrabold, fontSize: 21, lineHeight: 27, color: C.white },
  heroSub: { fontFamily: F.regular, fontSize: 14.5, lineHeight: 21, color: 'rgba(255,255,255,0.85)', marginTop: 8 },
  box: { backgroundColor: C.white, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: C.borderSoft },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: F.extrabold, fontSize: 11, letterSpacing: 1, color: C.blue, textTransform: 'uppercase' },
  value: { fontFamily: F.semibold, fontSize: 15, color: C.text, marginTop: 2, lineHeight: 21 },
});
