import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, type TextInputProps } from 'react-native';
import { C, F, R } from '@/constants/theme';
import { uploadImage } from '@/lib/api';
import { Img } from './cards';
import { Chip } from './ui';

export function Field({ label, required, help, error, children }: { label: string; required?: boolean; help?: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={{ color: C.red }}> *</Text> : null}
      </Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : help ? <Text style={styles.help}>{help}</Text> : null}
    </View>
  );
}

export function Input(props: TextInputProps & { invalid?: boolean }) {
  const [focus, setFocus] = useState(false);
  return (
    <TextInput
      placeholderTextColor="#9A9DB3"
      {...props}
      onFocus={(e) => {
        setFocus(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocus(false);
        props.onBlur?.(e);
      }}
      style={[styles.input, props.multiline && styles.multi, focus && styles.focus, props.invalid && { borderColor: C.red }, props.style]}
    />
  );
}

export function SelectField({ value, options, onChange }: { value?: string; options: string[]; onChange: (v: string) => void }) {
  const [custom, setCustom] = useState(false);
  const isCustom = !!value && !options.includes(value);
  return (
    <View style={{ gap: 10 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {options.map((o) => (
          <Chip key={o} label={o} active={value === o} onPress={() => onChange(value === o ? '' : o)} />
        ))}
        <Chip label={isCustom ? value! : '+ Other'} active={isCustom || custom} onPress={() => setCustom(true)} />
      </ScrollView>
      {custom || isCustom ? <Input value={value} onChangeText={onChange} placeholder="Type a new value" /> : null}
    </View>
  );
}

export function SwitchField({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={styles.switchRow}>
      <Text style={[styles.label, { marginBottom: 0, flex: 1 }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: C.navy, false: '#D5D7E3' }} thumbColor={C.white} />
    </Pressable>
  );
}

async function pickAndUpload(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: false });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return uploadImage(a.uri, a.mimeType, a.fileName);
}

function notify(title: string, msg: string) {
  if (Platform.OS === 'web') globalThis.alert?.(`${title}\n${msg}`);
  else Alert.alert(title, msg);
}

export function ImageField({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  const pick = async () => {
    try {
      setBusy(true);
      const url = await pickAndUpload();
      if (url) onChange(url);
    } catch (e: any) {
      notify('Upload failed', e?.message || 'Try another image.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View>
      {value ? (
        <View>
          <Img uri={value} style={styles.preview} />
          <View style={styles.imgActions}>
            <Pressable onPress={pick} style={styles.imgBtn}>
              <Ionicons name="swap-horizontal" size={16} color={C.navy} />
              <Text style={styles.imgBtnText}>Replace</Text>
            </Pressable>
            <Pressable onPress={() => onChange('')} style={[styles.imgBtn, { backgroundColor: C.redSoft }]}>
              <Ionicons name="trash-outline" size={16} color={C.red} />
              <Text style={[styles.imgBtnText, { color: C.red }]}>Remove</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={pick} style={styles.drop} disabled={busy}>
          {busy ? <ActivityIndicator color={C.navy} /> : <Ionicons name="image-outline" size={28} color={C.navy} />}
          <Text style={styles.dropText}>{busy ? 'Uploading…' : 'Choose an image from your phone'}</Text>
        </Pressable>
      )}
      {busy && value ? <ActivityIndicator color={C.navy} style={{ marginTop: 8 }} /> : null}
    </View>
  );
}

export function GalleryField({ value = [], onChange }: { value?: string[]; onChange: (v: string[]) => void }) {
  const [busy, setBusy] = useState(false);
  const add = async () => {
    try {
      setBusy(true);
      const url = await pickAndUpload();
      if (url) onChange([...value, url]);
    } catch (e: any) {
      notify('Upload failed', e?.message || 'Try another image.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.galleryWrap}>
      {value.map((g, i) => (
        <View key={g + i}>
          <Img uri={g} style={styles.thumb} />
          <Pressable onPress={() => onChange(value.filter((_, k) => k !== i))} style={styles.thumbX} hitSlop={6} accessibilityLabel="Remove photo">
            <Ionicons name="close" size={14} color={C.white} />
          </Pressable>
        </View>
      ))}
      <Pressable onPress={add} style={[styles.thumb, styles.addThumb]} disabled={busy}>
        {busy ? <ActivityIndicator color={C.navy} /> : <Ionicons name="add" size={26} color={C.navy} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: F.bold, fontSize: 14, color: C.text, marginBottom: 7 },
  help: { fontFamily: F.regular, fontSize: 12.5, color: C.muted, marginTop: 6, lineHeight: 17 },
  error: { fontFamily: F.semibold, fontSize: 12.5, color: C.red, marginTop: 6 },
  input: {
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: F.medium,
    fontSize: 15.5,
    color: C.text,
  },
  multi: { minHeight: 110, textAlignVertical: 'top', lineHeight: 22 },
  focus: { borderColor: C.navy },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  preview: { width: '100%', aspectRatio: 16 / 10, borderRadius: R.md },
  imgActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  imgBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: C.tint, borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 8 },
  imgBtnText: { fontFamily: F.bold, fontSize: 13.5, color: C.navy },
  drop: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.skySoft,
    backgroundColor: C.tint,
    borderRadius: R.md,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
  },
  dropText: { fontFamily: F.semibold, fontSize: 14, color: C.navy },
  galleryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 84, height: 84, borderRadius: 10 },
  addThumb: { backgroundColor: C.tint, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.skySoft, alignItems: 'center', justifyContent: 'center' },
  thumbX: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(20,10,110,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
