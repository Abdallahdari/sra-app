import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F, R, shadowSm } from '@/constants/theme';
import { imageUrl } from '@/lib/api';
import { fmtDate, isUpcoming, youtubeId } from '@/lib/format';
import type { Item } from '@/lib/types';
import { Card, T, Tag } from './ui';

// Low-res blur shown while images load
export const BLURHASH = 'L9AS}j^-0000.8%MM{RP00?b%MRj';

export function Img({ uri, style, contentFit = 'cover', priority }: { uri?: string; style?: any; contentFit?: 'cover' | 'contain'; priority?: 'low' | 'normal' | 'high' }) {
  return (
    <Image
      source={imageUrl(uri) ? { uri: imageUrl(uri) } : undefined}
      placeholder={{ blurhash: BLURHASH }}
      style={[{ backgroundColor: C.skeleton }, style]}
      contentFit={contentFit}
      transition={180}
      cachePolicy="memory-disk"
      recyclingKey={uri}
      priority={priority}
    />
  );
}

function useOpen(item: Item) {
  const router = useRouter();
  return () => router.push(`/item/${item._id}`);
}

export function openExternal(url?: string) {
  if (url) Linking.openURL(url).catch(() => {});
}

// ---------- Flash card (insight) ----------
export const InsightCard = memo(function InsightCard({ item, width }: { item: Item; width?: number }) {
  const open = useOpen(item);
  return (
    <Card onPress={open} style={[width ? { width } : null, shadowSm]}>
      <Img uri={item.image} style={{ width: '100%', aspectRatio: 1 }} />
      <View style={{ padding: 12, gap: 6 }}>
        <Text style={s.meta} numberOfLines={1}>
          {item.category} · {fmtDate(item.date)}
        </Text>
        <T v="title" numberOfLines={3}>
          {item.title}
        </T>
      </View>
    </Card>
  );
});

// ---------- Story (policy impact / news) ----------
export const StoryCard = memo(function StoryCard({ item, width, large }: { item: Item; width?: number; large?: boolean }) {
  const open = useOpen(item);
  return (
    <Card onPress={open} style={[width ? { width } : null, shadowSm]}>
      <Img uri={item.image} style={{ width: '100%', height: large ? 210 : 170 }} />
      <View style={{ padding: 14, gap: 8 }}>
        <Text style={s.eyebrowSm}>{item.meta?.label || item.category}</Text>
        <T v="h3" numberOfLines={3}>
          {item.title}
        </T>
        {item.summary ? (
          <T numberOfLines={3} style={{ fontSize: 14, lineHeight: 21 }}>
            {item.summary}
          </T>
        ) : null}
        <View style={s.readMore}>
          <Text style={s.readMoreText}>Read more</Text>
          <Ionicons name="arrow-forward" size={14} color={C.blue} />
        </View>
      </View>
    </Card>
  );
});

// ---------- Research publication ----------
export const ResearchCard = memo(function ResearchCard({ item }: { item: Item }) {
  const open = useOpen(item);
  const m = item.meta || {};
  return (
    <Card onPress={open} style={{ padding: 16 }}>
      <View style={s.tagRow}>
        {item.category ? <Tag label={item.category} /> : null}
        <Tag tone="outline" label={[m.kind, m.year].filter(Boolean).join(' · ')} />
      </View>
      <T v="h3" style={{ fontSize: 16, marginTop: 10 }} numberOfLines={4}>
        {item.title}
      </T>
      {item.summary ? <T style={{ fontSize: 14, lineHeight: 21, marginTop: 6 }} numberOfLines={3}>{item.summary}</T> : null}
      {m.authors ? <Text style={s.by}>{m.authors}</Text> : null}
      {m.journal ? <Text style={s.journal} numberOfLines={2}>{m.journal}</Text> : null}
      <View style={s.foot}>
        <Text style={s.footText}>{m.source || 'Publication'}</Text>
        {item.link ? (
          <Pressable onPress={() => openExternal(item.link)} style={s.pillBtn} hitSlop={6}>
            <Text style={s.pillBtnText}>Read ↗</Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
});

// ---------- Project ----------
export const ProjectCard = memo(function ProjectCard({ item, width }: { item: Item; width?: number }) {
  const open = useOpen(item);
  const m = item.meta || {};
  return (
    <Card onPress={open} style={[{ padding: 16 }, width ? { width } : null]}>
      <View style={s.tagRow}>
        {item.category ? <Tag label={item.category} /> : null}
        {m.period ? <Tag tone="outline" label={m.period} /> : null}
        {m.ongoing ? <Tag tone="green" label="● Ongoing" /> : null}
      </View>
      <T v="h3" style={{ marginTop: 10 }} numberOfLines={3}>
        {item.title}
      </T>
      {m.client ? <Text style={s.client} numberOfLines={2}>{m.client}</Text> : null}
      {item.summary ? <T style={{ fontSize: 14, lineHeight: 21 }} numberOfLines={width ? 3 : 4}>{item.summary}</T> : null}
      {Array.isArray(m.facts) && m.facts.length > 0 && !width ? (
        <View style={s.facts}>
          {m.facts.slice(0, 3).map((f: string) => (
            <Text key={f} style={s.fact} numberOfLines={1}>
              {f}
            </Text>
          ))}
        </View>
      ) : null}
    </Card>
  );
});

// ---------- Event ----------
export const EventCard = memo(function EventCard({ item, width }: { item: Item; width?: number }) {
  const open = useOpen(item);
  const upcoming = isUpcoming(item.date);
  return (
    <Card onPress={open} style={[width ? { width } : null, shadowSm]}>
      <View>
        <Img uri={item.image} style={{ width: '100%', height: 180 }} />
        <View style={s.dateBadge}>
          <Text style={s.dateDay}>{item.date ? new Date(item.date).getUTCDate() : ''}</Text>
          <Text style={s.dateMon}>{fmtDate(item.date).split(' ').slice(1).join(' ')}</Text>
        </View>
        {upcoming ? <Tag tone="green" label="Upcoming" style={{ position: 'absolute', top: 12, right: 12 }} /> : null}
      </View>
      <View style={{ padding: 14, gap: 6 }}>
        <Text style={s.eyebrowSm}>{item.category}</Text>
        <T v="h3" numberOfLines={2}>{item.title}</T>
        {item.meta?.venue ? (
          <View style={s.iconLine}>
            <Ionicons name="location-outline" size={14} color={C.muted} />
            <Text style={s.meta}>{item.meta.venue}</Text>
          </View>
        ) : null}
        {item.summary && !width ? <T numberOfLines={3} style={{ fontSize: 14, lineHeight: 21 }}>{item.summary}</T> : null}
      </View>
    </Card>
  );
});

// ---------- Podcast episode ----------
export const EpisodeCard = memo(function EpisodeCard({ item, compact }: { item: Item; compact?: boolean }) {
  const open = useOpen(item);
  const m = item.meta || {};
  return (
    <Card onPress={open} style={{ flexDirection: 'row', padding: 12, gap: 12, alignItems: 'center' }}>
      <View>
        <Img uri={item.image} style={{ width: compact ? 64 : 76, height: compact ? 64 : 76, borderRadius: 12 }} />
        <View style={s.playDot}>
          <Ionicons name="play" size={12} color={C.white} />
        </View>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.eyebrowSm} numberOfLines={1}>
          {m.number ? `Episode ${m.number}` : 'Cilmi iyo Cod'}
          {item.category ? ` · ${item.category}` : ''}
        </Text>
        <T v="title" numberOfLines={2}>{item.title}</T>
        {m.guest ? <Text style={s.meta} numberOfLines={1}>with {m.guest}</Text> : null}
      </View>
    </Card>
  );
});

// ---------- Video ----------
export const VideoCard = memo(function VideoCard({ item, width }: { item: Item; width?: number }) {
  const open = useOpen(item);
  const yt = youtubeId(item.videoUrl);
  return (
    <Card onPress={open} style={[width ? { width } : null]}>
      <View>
        <Img uri={item.image || (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : undefined)} style={{ width: '100%', aspectRatio: 16 / 10 }} />
        <LinearGradient colors={['transparent', 'rgba(20,10,110,0.55)']} style={StyleSheet.absoluteFill} />
        <View style={s.playBig}>
          <Ionicons name="play" size={20} color={C.navy} style={{ marginLeft: 3 }} />
        </View>
        {item.category ? <Tag tone="white" label={item.category} style={{ position: 'absolute', left: 10, top: 10 }} /> : null}
      </View>
      <View style={{ padding: 12, gap: 4 }}>
        <T v="title" numberOfLines={2}>{item.title}</T>
        {item.date ? <Text style={s.meta}>{fmtDate(item.date)}</Text> : null}
      </View>
    </Card>
  );
});

// ---------- Researcher ----------
export const PersonCard = memo(function PersonCard({ item }: { item: Item }) {
  const open = useOpen(item);
  return (
    <Card onPress={open} style={{ flexDirection: 'row', padding: 12, gap: 14, alignItems: 'center' }}>
      <Img uri={item.image} style={{ width: 62, height: 62, borderRadius: 31 }} />
      <View style={{ flex: 1, gap: 3 }}>
        {item.category ? <Text style={s.eyebrowSm} numberOfLines={1}>{item.category}</Text> : null}
        <T v="title" numberOfLines={1}>{item.title}</T>
        {item.summary ? <Text style={s.bioLine} numberOfLines={2}>{item.summary}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.muted} />
    </Card>
  );
});

// ---------- Service ----------
export const ServiceRow = memo(function ServiceRow({ item, index }: { item: Item; index: number }) {
  const open = useOpen(item);
  return (
    <Pressable onPress={open} style={({ pressed }) => [s.serviceRow, pressed && { backgroundColor: C.tint }]}>
      <Text style={s.serviceNum}>{String(index + 1).padStart(2, '0')}</Text>
      <View style={{ flex: 1 }}>
        <T v="title" style={{ color: C.navy }}>{item.title}</T>
        {item.summary ? <Text style={s.bioLine}>{item.summary}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.skySoft} />
    </Pressable>
  );
});

// ---------- Fuel price ----------
export const FuelRow = memo(function FuelRow({ item }: { item: Item }) {
  const m = item.meta || {};
  return (
    <View style={s.fuelRow}>
      <View style={{ flex: 1 }}>
        <T v="title">{item.category}</T>
        <Text style={s.meta}>{fmtDate(item.date)}</Text>
      </View>
      <View style={s.fuelCell}>
        <Text style={s.fuelVal}>${Number(m.petrol ?? 0).toFixed(2)}</Text>
        <Text style={s.fuelLbl}>Petrol</Text>
      </View>
      <View style={s.fuelCell}>
        <Text style={s.fuelVal}>${Number(m.diesel ?? 0).toFixed(2)}</Text>
        <Text style={s.fuelLbl}>Diesel</Text>
      </View>
    </View>
  );
});

// ---------- Partner logo ----------
export const PartnerLogo = memo(function PartnerLogo({ item }: { item: Item }) {
  return (
    <View style={s.logo}>
      <Img uri={item.image} contentFit="contain" style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }} />
    </View>
  );
});

const s = StyleSheet.create({
  meta: { fontFamily: F.medium, fontSize: 12.5, color: C.muted },
  eyebrowSm: { fontFamily: F.extrabold, fontSize: 11, letterSpacing: 1, color: C.blue, textTransform: 'uppercase' },
  readMore: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  readMoreText: { fontFamily: F.bold, fontSize: 14, color: C.blue },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  by: { fontFamily: F.bold, fontSize: 14, color: C.text, marginTop: 10 },
  journal: { fontFamily: F.regular, fontStyle: 'italic', fontSize: 13.5, color: '#555', marginTop: 2 },
  foot: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.borderSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footText: { fontFamily: F.medium, fontSize: 13, color: '#666' },
  pillBtn: { backgroundColor: C.navy, borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 7 },
  pillBtnText: { fontFamily: F.extrabold, fontSize: 13, color: C.white },
  client: { fontFamily: F.semibold, fontSize: 13.5, color: C.blue, marginVertical: 6, lineHeight: 19 },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.borderSoft,
  },
  fact: { fontFamily: F.medium, fontSize: 12.5, color: C.text, backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, maxWidth: '100%' },
  dateBadge: {
    position: 'absolute',
    left: 12,
    bottom: -18,
    backgroundColor: C.navy,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: C.white,
  },
  dateDay: { fontFamily: F.extrabold, fontSize: 18, color: C.white, lineHeight: 21 },
  dateMon: { fontFamily: F.bold, fontSize: 10.5, color: C.skySoft, textTransform: 'uppercase' },
  iconLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  playDot: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.white,
  },
  playBig: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioLine: { fontFamily: F.regular, fontSize: 13.5, lineHeight: 19, color: C.body },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16 },
  serviceNum: { fontFamily: F.extrabold, fontSize: 15, color: C.sky, width: 26 },
  fuelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 16 },
  fuelCell: { alignItems: 'flex-end', minWidth: 68 },
  fuelVal: { fontFamily: F.extrabold, fontSize: 17, color: C.navy },
  fuelLbl: { fontFamily: F.medium, fontSize: 11.5, color: C.muted },
  logo: {
    width: 110,
    height: 70,
    borderRadius: 14,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
  },
});
