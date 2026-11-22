import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, useRouter, type Href } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { C, F, R } from '@/constants/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type Variant = 'h1' | 'h2' | 'h3' | 'title' | 'body' | 'small' | 'eyebrow' | 'label';
const variants: Record<Variant, TextStyle> = {
  h1: { fontFamily: F.extrabold, fontSize: 28, lineHeight: 35, color: C.navy, letterSpacing: -0.4 },
  h2: { fontFamily: F.extrabold, fontSize: 22, lineHeight: 29, color: C.navy, letterSpacing: -0.2 },
  h3: { fontFamily: F.bold, fontSize: 17, lineHeight: 23, color: C.navy },
  title: { fontFamily: F.bold, fontSize: 15, lineHeight: 21, color: C.text },
  body: { fontFamily: F.regular, fontSize: 15, lineHeight: 23, color: C.body },
  small: { fontFamily: F.medium, fontSize: 12.5, lineHeight: 17, color: C.muted },
  eyebrow: { fontFamily: F.extrabold, fontSize: 11.5, letterSpacing: 1.4, color: C.blue, textTransform: 'uppercase' },
  label: { fontFamily: F.semibold, fontSize: 13.5, color: C.text },
};

export function T({ v = 'body', style, ...p }: TextProps & { v?: Variant }) {
  return <Text {...p} style={[variants[v], style]} />;
}

export function Button({
  label,
  onPress,
  href,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
  small,
}: {
  label: string;
  onPress?: () => void;
  href?: Href;
  variant?: 'primary' | 'outline' | 'light' | 'danger' | 'ghost' | 'onDark';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const v = btn[variant];
  const router = useRouter();
  return (
    <Pressable
      onPress={href ? () => router.push(href) : onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        v.box,
        (pressed || disabled) && { opacity: disabled ? 0.5 : 0.85 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.text.color} size="small" />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 15 : 17} color={v.text.color as string} />}
          <Text style={[styles.btnText, small && { fontSize: 13.5 }, v.text]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const btn = {
  primary: { box: { backgroundColor: C.navy }, text: { color: C.white } },
  outline: { box: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.navy }, text: { color: C.navy } },
  light: { box: { backgroundColor: C.white }, text: { color: C.navy } },
  danger: { box: { backgroundColor: C.redSoft }, text: { color: C.red } },
  ghost: { box: { backgroundColor: C.tint }, text: { color: C.navy } },
  onDark: { box: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.7)' }, text: { color: C.white } },
} as const;

/**
 * Pressable that navigates. Used instead of <Link asChild><Pressable style={fn}> because
 * on web the Link slot drops function styles (pressed feedback and layout break).
 */
export function PressLink({ href, onPress, ...props }: ComponentProps<typeof Pressable> & { href: Href }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="link"
      {...props}
      onPress={(e) => {
        onPress?.(e);
        router.push(href);
      }}
    />
  );
}

export function Tag({ label, tone = 'blue', style }: { label: string; tone?: 'blue' | 'outline' | 'green' | 'navy' | 'white'; style?: StyleProp<ViewStyle> }) {
  const t = tags[tone];
  return (
    <View style={[styles.tag, t.box, style]}>
      <Text numberOfLines={1} style={[styles.tagText, t.text]}>
        {label}
      </Text>
    </View>
  );
}
const tags = {
  blue: { box: { backgroundColor: C.tint }, text: { color: C.blue } },
  outline: { box: { borderWidth: 1, borderColor: C.border }, text: { color: '#555', textTransform: 'none', letterSpacing: 0 } as TextStyle },
  green: { box: { backgroundColor: C.greenSoft }, text: { color: C.green } },
  navy: { box: { backgroundColor: C.navy }, text: { color: C.white } },
  white: { box: { backgroundColor: 'rgba(255,255,255,0.92)' }, text: { color: C.navy } },
} as const;

export function Chip({ label, active, onPress, count }: { label: string; active?: boolean; onPress: () => void; count?: number }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipOn]} accessibilityState={{ selected: active }}>
      <Text style={[styles.chipText, active && { color: C.white }]}>
        {label}
        {count !== undefined ? <Text style={{ opacity: 0.7 }}>{`  ${count}`}</Text> : null}
      </Text>
    </Pressable>
  );
}

export function SectionHeader({ eyebrow, title, linkLabel, href, style }: { eyebrow?: string; title: string; linkLabel?: string; href?: Href; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <T v="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</T> : null}
        <T v="h2">{title}</T>
      </View>
      {href && linkLabel ? (
        <Link href={href} asChild>
          <Pressable hitSlop={10} style={styles.sectionLink}>
            <Text style={styles.sectionLinkText}>{linkLabel}</Text>
            <Ionicons name="arrow-forward" size={15} color={C.blue} />
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}>
      {children}
    </Pressable>
  );
}

export function EmptyState({ icon = 'document-text-outline', title, message, action }: { icon?: IconName; title: string; message?: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={C.navy} />
      </View>
      <T v="h3" style={{ textAlign: 'center' }}>{title}</T>
      {message ? <T style={{ textAlign: 'center', marginTop: 6 }}>{message}</T> : null}
      {action ? <View style={{ marginTop: 16 }}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="Couldn't load this"
      message={message || 'Check your internet connection and try again.'}
      action={onRetry ? <Button label="Try again" icon="refresh" onPress={onRetry} variant="outline" small /> : undefined}
    />
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: C.borderSoft }, style]} />;
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 46,
    paddingHorizontal: 20,
    borderRadius: R.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnSmall: { minHeight: 38, paddingHorizontal: 15 },
  btnText: { fontFamily: F.bold, fontSize: 15 },
  tag: { borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', maxWidth: '100%' },
  tagText: { fontFamily: F.extrabold, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: R.pill,
    borderWidth: 1.5,
    borderColor: C.navy,
    backgroundColor: C.white,
  },
  chipOn: { backgroundColor: C.navy },
  chipText: { fontFamily: F.bold, fontSize: 13.5, color: C.navy },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 14 },
  sectionLink: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: 4 },
  sectionLinkText: { fontFamily: F.bold, fontSize: 14, color: C.blue },
  card: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
});
