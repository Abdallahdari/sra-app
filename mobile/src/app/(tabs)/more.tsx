import Ionicons from '@expo/vector-icons/Ionicons';
import { type Href } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PressLink, T, type IconName } from '@/components/ui';
import { C, F, R, S } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useSettings } from '@/lib/queries';

type Row = { icon: IconName; label: string; sub?: string; href?: Href; url?: string };

function Group({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <View style={{ marginTop: 22 }}>
      <T v="eyebrow" style={{ marginBottom: 8, marginLeft: 4 }}>{title}</T>
      <View style={styles.group}>
        {rows.map((r, i) => {
          const Comp: any = r.href ? PressLink : Pressable;
          return (
            <Comp
              key={r.label}
              href={r.href}
              onPress={r.url ? () => Linking.openURL(r.url!).catch(() => {}) : undefined}
              style={({ pressed }: { pressed: boolean }) => [styles.row, i > 0 && styles.rowBorder, pressed && { backgroundColor: C.tint }]}>
              <View style={styles.iconBox}>
                <Ionicons name={r.icon} size={19} color={C.navy} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{r.label}</Text>
                {r.sub ? <Text style={styles.sub} numberOfLines={1}>{r.sub}</Text> : null}
              </View>
              <Ionicons name={r.url ? 'open-outline' : 'chevron-forward'} size={17} color={C.muted} />
            </Comp>
          );
        })}
      </View>
    </View>
  );
}

export default function More() {
  const { user } = useAuth();
  const { data: s } = useSettings();
  const social = s?.social || {};
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: S.gutter, paddingBottom: 40 }}>
      <Group
        title="About"
        rows={[
          { icon: 'information-circle-outline', label: 'Who we are', sub: 'Independent research on Somalia since 2010', href: '/about' },
          { icon: 'people-outline', label: 'Our researchers', sub: 'Network researchers and podcast guests', href: '/list/researcher' },
          { icon: 'construct-outline', label: 'Services', sub: 'Research, monitoring, data collection and more', href: '/list/service' },
          { icon: 'ribbon-outline', label: 'Partners & clients', href: '/list/partner' },
        ]}
      />
      <Group
        title="Get involved"
        rows={[
          { icon: 'shield-checkmark-outline', label: 'Ethical approval', sub: 'Apply for an ethics review', url: 'https://www.sra.so/ethics-review/' },
          { icon: 'clipboard-outline', label: 'Join as an enumerator', url: 'https://www.sra.so/enumerators/' },
          { icon: 'book-outline', label: 'Our journal (HAJOS)', sub: 'Horn of Africa Journal of Social Science', url: 'https://hornafricajss.com/' },
          { icon: 'chatbubbles-outline', label: 'Contact us', sub: s?.contact?.phones?.[0], href: '/contact' },
        ]}
      />
      <Group
        title="Follow SRA"
        rows={[
          social.youtube && { icon: 'logo-youtube', label: 'YouTube', url: social.youtube },
          social.facebook && { icon: 'logo-facebook', label: 'Facebook', url: social.facebook },
          social.x && { icon: 'logo-twitter', label: 'X (Twitter)', url: social.x },
          social.linkedin && { icon: 'logo-linkedin', label: 'LinkedIn', url: social.linkedin },
        ].filter(Boolean) as Row[]}
      />
      <Group
        title="Staff"
        rows={[
          user
            ? { icon: 'speedometer-outline', label: 'Admin dashboard', sub: `Signed in as ${user.email}`, href: '/admin' }
            : { icon: 'lock-closed-outline', label: 'Admin sign in', sub: 'Post research, events and updates', href: '/admin/login' },
        ]}
      />
      <Group
        title="Credits"
        rows={[
          { icon: 'code-slash-outline', label: 'Built by Abdallah Abdirisaq', sub: 'Full Stack Software Engineer · dheere.dev', url: 'https://dheere.dev/' },
        ]}
      />
      <Text style={styles.footer}>Designed & developed by Abdallah Abdirisaq</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  group: { backgroundColor: C.white, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  rowBorder: { borderTopWidth: 1, borderTopColor: C.borderSoft },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: F.bold, fontSize: 15, color: C.text },
  sub: { fontFamily: F.regular, fontSize: 13, color: C.muted, marginTop: 1 },
  footer: { fontFamily: F.regular, fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 24 },
});
