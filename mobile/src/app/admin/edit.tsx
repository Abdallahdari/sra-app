import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Field, GalleryField, ImageField, Input, SelectField, SwitchField } from '@/components/form';
import { DetailSkeleton } from '@/components/skeleton';
import { Button, ErrorState } from '@/components/ui';
import { C, F, R, S } from '@/constants/theme';
import { useAdminItem, useDeleteItem, useSaveItem } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { toDateInput } from '@/lib/format';
import { useTypes } from '@/lib/queries';
import type { ContentType, FieldDef, Item, TypeDef } from '@/lib/types';

type FormState = Record<string, any>;

const getVal = (item: Item, key: string) => (key.startsWith('meta.') ? item.meta?.[key.slice(5)] : (item as any)[key]);

function toForm(fields: FieldDef[], item?: Item): FormState {
  const f: FormState = { published: item ? item.published !== false : true };
  for (const fd of fields) {
    const v = item ? getVal(item, fd.key) : undefined;
    if (fd.kind === 'date') f[fd.key] = toDateInput(v || (item ? undefined : new Date().toISOString()));
    else if (fd.kind === 'list') f[fd.key] = Array.isArray(v) ? v.join('\n') : '';
    else if (fd.kind === 'number') f[fd.key] = v === undefined || v === null ? '' : String(v);
    else if (fd.kind === 'bool') f[fd.key] = !!v;
    else if (fd.kind === 'gallery') f[fd.key] = Array.isArray(v) ? v : [];
    else f[fd.key] = v ?? '';
  }
  return f;
}

function validate(fields: FieldDef[], f: FormState) {
  const errors: Record<string, string> = {};
  for (const fd of fields) {
    const v = f[fd.key];
    if (fd.required && (v === '' || v === undefined || (Array.isArray(v) && !v.length))) errors[fd.key] = `${fd.label} is required`;
    if (fd.kind === 'date' && v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) errors[fd.key] = 'Use the format YYYY-MM-DD';
    if (fd.kind === 'number' && v !== '' && Number.isNaN(Number(v))) errors[fd.key] = 'Must be a number';
    if (fd.kind === 'url' && v && !/^https?:\/\//.test(v)) errors[fd.key] = 'Must start with http:// or https://';
  }
  return errors;
}

function toPayload(type: ContentType, fields: FieldDef[], f: FormState): Partial<Item> {
  const out: any = { type, published: f.published, meta: {} };
  for (const fd of fields) {
    let v = f[fd.key];
    if (fd.kind === 'date') v = v ? new Date(`${v}T12:00:00Z`).toISOString() : undefined;
    else if (fd.kind === 'list') v = String(v || '').split('\n').map((s) => s.trim()).filter(Boolean);
    else if (fd.kind === 'number') v = v === '' ? undefined : Number(v);
    if (fd.key.startsWith('meta.')) out.meta[fd.key.slice(5)] = v;
    else if (v !== undefined) out[fd.key] = v;
  }
  return out;
}

function confirm(title: string, msg: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n${msg}`)) onYes();
    return;
  }
  Alert.alert(title, msg, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onYes },
  ]);
}

export default function Edit() {
  const { type, id } = useLocalSearchParams<{ type: ContentType; id?: string }>();
  const { user, ready } = useAuth();
  const types = useTypes();
  const def = types.data?.find((t) => t.type === type);
  const existing = useAdminItem(id);

  if (ready && !user) return <Redirect href="/admin/login" />;
  if (types.isError || existing.isError) return <ErrorState onRetry={() => { types.refetch(); existing.refetch(); }} />;
  if (!def || (id && !existing.data)) return <DetailSkeleton />;
  // keyed so the form is created once, from loaded data
  return <EditForm key={id || 'new'} def={def} type={type} id={id} item={existing.data} />;
}

function EditForm({ def, type, id, item }: { def: TypeDef; type: ContentType; id?: string; item?: Item }) {
  const router = useRouter();
  const save = useSaveItem();
  const del = useDeleteItem();
  const [form, setForm] = useState<FormState>(() => toForm(def.fields, item));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const categories = def.categories;

  const set = (k: string, v: any) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: '' }));
  };

  const submit = async (publish?: boolean) => {
    const next = publish === undefined ? form : { ...form, published: publish };
    const errs = validate(def.fields, next);
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return setServerError('Please fix the highlighted fields.');
    setServerError('');
    try {
      await save.mutateAsync({ id, data: toPayload(type, def.fields, next) });
      router.back();
    } catch (e: any) {
      setServerError(e?.message || 'Could not save.');
    }
  };

  const remove = () =>
    confirm('Delete this item?', 'It will be removed from the app for everyone. This cannot be undone.', async () => {
      try {
        await del.mutateAsync({ id: id!, type });
        router.back();
      } catch (e: any) {
        setServerError(e?.message || 'Could not delete.');
      }
    });

  const renderField = (fd: FieldDef) => {
    const v = form[fd.key];
    const common = { label: fd.label, required: fd.required, help: fd.help, error: errors[fd.key] };
    switch (fd.kind) {
      case 'image':
        return <Field key={fd.key} {...common}><ImageField value={v} onChange={(x) => set(fd.key, x)} /></Field>;
      case 'gallery':
        return <Field key={fd.key} {...common}><GalleryField value={v} onChange={(x) => set(fd.key, x)} /></Field>;
      case 'select':
        return (
          <Field key={fd.key} {...common}>
            <SelectField value={v} options={fd.options ?? categories} onChange={(x) => set(fd.key, x)} />
          </Field>
        );
      case 'bool':
        return <View key={fd.key} style={{ marginBottom: 18 }}><SwitchField label={fd.label} value={!!v} onChange={(x) => set(fd.key, x)} /></View>;
      case 'textarea':
      case 'markdown':
      case 'list':
        return (
          <Field key={fd.key} {...common} help={fd.kind === 'list' ? 'One item per line.' : fd.help}>
            <Input
              value={v}
              onChangeText={(x) => set(fd.key, x)}
              multiline
              invalid={!!errors[fd.key]}
              style={fd.kind === 'markdown' ? { minHeight: 220 } : undefined}
              placeholder={fd.kind === 'markdown' ? 'Write the full text here…' : undefined}
            />
          </Field>
        );
      default:
        return (
          <Field key={fd.key} {...common} help={fd.kind === 'date' ? 'Format: YYYY-MM-DD' : fd.help}>
            <Input
              value={v}
              onChangeText={(x) => set(fd.key, x)}
              invalid={!!errors[fd.key]}
              keyboardType={fd.kind === 'number' ? 'decimal-pad' : fd.kind === 'url' ? 'url' : 'default'}
              autoCapitalize={fd.kind === 'url' ? 'none' : 'sentences'}
              placeholder={fd.kind === 'date' ? '2026-12-25' : fd.kind === 'url' ? 'https://' : undefined}
            />
          </Field>
        );
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: id ? `Edit ${def.singular.toLowerCase()}` : `New ${def.singular.toLowerCase()}` }} />
      <ScrollView contentContainerStyle={{ padding: S.gutter, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        {item?.source === 'wp' ? (
          <View style={styles.note}>
            <Ionicons name="information-circle" size={18} color={C.blue} />
            <Text style={styles.noteText}>Imported from sra.so. Your edits are saved in the app database.</Text>
          </View>
        ) : null}

        {def.fields.map(renderField)}

        <View style={{ marginBottom: 18 }}>
          <SwitchField label="Published (visible in the app)" value={!!form.published} onChange={(x) => set('published', x)} />
        </View>

        {serverError ? (
          <View style={styles.err}>
            <Ionicons name="alert-circle" size={18} color={C.red} />
            <Text style={styles.errText}>{serverError}</Text>
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          <Button label={id ? 'Save changes' : form.published ? 'Publish' : 'Save draft'} icon="checkmark-circle-outline" onPress={() => submit()} loading={save.isPending} />
          {!id && form.published ? <Button label="Save as draft" variant="outline" onPress={() => submit(false)} disabled={save.isPending} /> : null}
          {id ? <Button label="Delete" variant="danger" icon="trash-outline" onPress={remove} loading={del.isPending} /> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: C.tint, borderRadius: R.md, padding: 12, marginBottom: 18 },
  noteText: { flex: 1, fontFamily: F.medium, fontSize: 13, color: C.navy },
  err: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: C.redSoft, borderRadius: R.md, padding: 12, marginBottom: 14 },
  errText: { flex: 1, fontFamily: F.semibold, fontSize: 14, color: C.red },
});
