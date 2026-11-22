import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Field, ImageField, Input } from '@/components/form';
import { DetailSkeleton } from '@/components/skeleton';
import { Button, T } from '@/components/ui';
import { C, F, R, S } from '@/constants/theme';
import { useSaveSettings } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { useSettings } from '@/lib/queries';
import type { Settings } from '@/lib/types';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <T v="eyebrow" style={{ marginBottom: 14 }}>{title}</T>
      {children}
    </View>
  );
}

export default function SiteSettings() {
  const { user, ready } = useAuth();
  const settings = useSettings();
  if (ready && !user) return <Redirect href="/admin/login" />;
  if (!settings.data || settings.isPlaceholderData) return <DetailSkeleton />;
  return <SettingsForm initial={settings.data} />;
}

function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const save = useSaveSettings();
  const [s, setS] = useState<Settings>(() => JSON.parse(JSON.stringify(initial)));
  const [msg, setMsg] = useState('');

  const patch = (fn: (d: Settings) => void) =>
    setS((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as Settings;
      fn(next);
      return next;
    });

  const submit = async () => {
    try {
      await save.mutateAsync({
        hero: s.hero,
        stats: (s.stats || []).filter((x) => x.value || x.label),
        regions: (s.regions || []).map((r) => r.trim()).filter(Boolean),
        contact: { ...s.contact, phones: (s.contact?.phones || []).map((p) => p.trim()).filter(Boolean) },
        social: s.social,
        about: s.about,
        announcement: s.announcement,
      });
      router.back();
    } catch (e: any) {
      setMsg(e?.message || 'Could not save.');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: S.gutter, paddingBottom: 60, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Section title="Announcement banner">
          <Field label="Message on the home screen" help="Leave empty to hide the banner.">
            <Input value={s.announcement || ''} onChangeText={(v) => patch((d) => (d.announcement = v))} multiline style={{ minHeight: 70 }} placeholder="e.g. Registration for Researchers' Night 2026 is open" />
          </Field>
        </Section>

        <Section title="Home hero">
          <Field label="Headline">
            <Input value={s.hero?.title || ''} onChangeText={(v) => patch((d) => (d.hero = { ...d.hero, title: v }))} multiline style={{ minHeight: 60 }} />
          </Field>
          <Field label="Subtitle">
            <Input value={s.hero?.subtitle || ''} onChangeText={(v) => patch((d) => (d.hero = { ...d.hero, subtitle: v }))} multiline />
          </Field>
          <Field label="Background image">
            <ImageField value={s.hero?.image} onChange={(v) => patch((d) => (d.hero = { ...d.hero, image: v }))} />
          </Field>
        </Section>

        <Section title="Key numbers">
          {(s.stats || []).map((st, i) => (
            <View key={i} style={styles.statRow}>
              <Input value={st.value} onChangeText={(v) => patch((d) => (d.stats![i].value = v))} style={{ width: 86 }} placeholder="200+" />
              <Input value={st.label} onChangeText={(v) => patch((d) => (d.stats![i].label = v))} style={{ flex: 1 }} placeholder="Label" />
              <Pressable onPress={() => patch((d) => d.stats!.splice(i, 1))} hitSlop={8} accessibilityLabel="Remove number">
                <Ionicons name="remove-circle" size={24} color={C.red} />
              </Pressable>
            </View>
          ))}
          {(s.stats?.length ?? 0) < 4 ? (
            <Button label="Add a number" variant="ghost" icon="add" small onPress={() => patch((d) => (d.stats = [...(d.stats || []), { value: '', label: '' }]))} />
          ) : null}
        </Section>

        <Section title="Coverage">
          <Field label="Regions" help="One region per line.">
            <Input value={(s.regions || []).join('\n')} onChangeText={(v) => patch((d) => (d.regions = v.split('\n')))} multiline />
          </Field>
        </Section>

        <Section title="Contact">
          <Field label="Office address">
            <Input value={s.contact?.address || ''} onChangeText={(v) => patch((d) => (d.contact = { ...d.contact, address: v }))} multiline style={{ minHeight: 60 }} />
          </Field>
          <Field label="Phone numbers" help="One per line.">
            <Input value={(s.contact?.phones || []).join('\n')} onChangeText={(v) => patch((d) => (d.contact = { ...d.contact, phones: v.split('\n') }))} multiline style={{ minHeight: 60 }} keyboardType="phone-pad" />
          </Field>
          <Field label="Email">
            <Input value={s.contact?.email || ''} onChangeText={(v) => patch((d) => (d.contact = { ...d.contact, email: v }))} autoCapitalize="none" keyboardType="email-address" />
          </Field>
        </Section>

        <Section title="Social links">
          {(['facebook', 'x', 'linkedin', 'youtube'] as const).map((k) => (
            <Field key={k} label={k === 'x' ? 'X (Twitter)' : k[0].toUpperCase() + k.slice(1)}>
              <Input value={s.social?.[k] || ''} onChangeText={(v) => patch((d) => (d.social = { ...d.social, [k]: v }))} autoCapitalize="none" keyboardType="url" />
            </Field>
          ))}
        </Section>

        <Section title="About SRA">
          <Field label="About text" help='Blank line = new paragraph. "## " = heading, "- " = bullet.'>
            <Input value={s.about || ''} onChangeText={(v) => patch((d) => (d.about = v))} multiline style={{ minHeight: 220 }} />
          </Field>
        </Section>

        {msg ? <Text style={styles.err}>{msg}</Text> : null}
        <Button label="Save settings" icon="checkmark-circle-outline" onPress={submit} loading={save.isPending} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: C.white, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: 16, paddingBottom: 2 },
  statRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 },
  err: { fontFamily: F.semibold, fontSize: 14, color: C.red },
});
