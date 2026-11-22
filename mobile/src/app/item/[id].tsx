import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { FlatList, Linking, Modal, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Img, openExternal } from '@/components/cards';
import { Markdown } from '@/components/markdown';
import { DetailSkeleton, Skeleton, SkeletonGroup } from '@/components/skeleton';
import { Button, ErrorState, T, Tag } from '@/components/ui';
import { C, F, R, S } from '@/constants/theme';
import { fmtDate, isUpcoming, youtubeId } from '@/lib/format';
import { useItem } from '@/lib/queries';
import type { Item } from '@/lib/types';

function Mp4Player({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return (
    <View style={{ width: '100%', aspectRatio: 1, backgroundColor: '#000' }}>
      <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls contentFit="contain" fullscreenOptions={{ enable: true }} />
    </View>
  );
}

function YouTubeHero({ url, image }: { url: string; image?: string }) {
  const id = youtubeId(url);
  return (
    <Pressable onPress={() => openExternal(url)} accessibilityRole="button" accessibilityLabel="Play on YouTube">
      <Img uri={image || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : undefined)} style={{ width: '100%', aspectRatio: 16 / 10 }} />
      <LinearGradient colors={['rgba(20,10,110,0.25)', 'rgba(20,10,110,0.7)']} style={StyleSheet.absoluteFill} />
      <View style={styles.ytBtn}>
        <Ionicons name="logo-youtube" size={22} color="#E62117" />
        <Text style={styles.ytText}>Watch on YouTube</Text>
      </View>
    </Pressable>
  );
}

function Gallery({ images }: { images: string[] }) {
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState<number | null>(null);
  const size = (width - S.gutter * 2 - 8) / 3;
  return (
    <View style={{ marginTop: 26 }}>
      <T v="eyebrow" style={{ marginBottom: 10 }}>Photos ({images.length})</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
        {images.map((g, i) => (
          <Pressable key={g + i} onPress={() => setOpen(i)}>
            <Img uri={g} style={{ width: size, height: size, borderRadius: 8 }} priority="low" />
          </Pressable>
        ))}
      </View>
      <Modal visible={open !== null} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <View style={styles.viewer}>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            initialScrollIndex={open ?? 0}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={(g, i) => g + i}
            renderItem={({ item }) => <Img uri={item} contentFit="contain" style={{ width, height: '100%', backgroundColor: 'transparent' }} />}
            showsHorizontalScrollIndicator={false}
          />
          <Pressable onPress={() => setOpen(null)} style={styles.close} hitSlop={12} accessibilityLabel="Close">
            <Ionicons name="close" size={26} color={C.white} />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

function Facts({ item }: { item: Item }) {
  const m = item.meta || {};
  const rows: [string, string | undefined][] = [];
  if (item.type === 'project') rows.push(['Client', m.client], ['Period', m.period]);
  if (item.type === 'research') rows.push(['Type', [m.kind, m.year].filter(Boolean).join(' · ')], ['Author(s)', m.authors], ['Journal', m.journal], ['Source', m.source]);
  if (item.type === 'event') rows.push(['Date', fmtDate(item.date, true)], ['Venue', m.venue]);
  if (item.type === 'episode') rows.push(['Guest', m.guest], ['Episode', m.number ? `#${m.number}` : undefined]);
  if (item.type === 'researcher') rows.push(['Role', m.role], ['Research area', item.category]);
  if (item.type === 'fuel') rows.push(['City', item.category], ['Petrol', m.petrol != null ? `$${m.petrol} / litre` : undefined], ['Diesel', m.diesel != null ? `$${m.diesel} / litre` : undefined]);
  const visible = rows.filter(([, v]) => v);
  if (!visible.length) return null;
  return (
    <View style={styles.facts}>
      {visible.map(([k, v]) => (
        <View key={k} style={styles.factRow}>
          <Text style={styles.factKey}>{k}</Text>
          <Text style={styles.factVal}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: item, isPending, isError, refetch, isPlaceholderData, isRefetching } = useItem(id);
  const insets = useSafeAreaInsets();

  if (isPending) return <DetailSkeleton />;
  if (isError && !item) return <View style={{ paddingTop: insets.top + 60 }}><ErrorState onRetry={refetch} /></View>;
  if (!item) return null;

  const isVideo = item.type === 'video';
  const mp4 = isVideo && item.videoUrl && !youtubeId(item.videoUrl) ? item.videoUrl : null;
  const yt = item.type === 'episode' ? item.link : isVideo && youtubeId(item.videoUrl) ? item.videoUrl : null;
  const isPerson = item.type === 'researcher';
  const label = item.meta?.label || item.category;
  const share = () => {
    const url = item.link || item.videoUrl || 'https://www.sra.so';
    Share.share({ message: `${item.title}\n${url}` }).catch(() => {});
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.white }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      refreshControl={<RefreshControl refreshing={isRefetching && !isPlaceholderData} onRefresh={() => void refetch()} tintColor={C.navy} />}>
      {/* Header media */}
      <View style={{ paddingTop: mp4 || yt ? insets.top + 44 : 0, backgroundColor: mp4 || yt ? C.navy : C.white }}>
        {mp4 ? (
          <Mp4Player uri={mp4} />
        ) : yt ? (
          <YouTubeHero url={yt} image={item.image} />
        ) : isPerson ? (
          <View style={[styles.personHead, { paddingTop: insets.top + 60 }]}>
            <Img uri={item.image} style={styles.avatar} />
          </View>
        ) : item.image ? (
          <Img uri={item.image} style={{ width: '100%', aspectRatio: item.type === 'insight' ? 1 : item.type === 'partner' ? 2 : 4 / 3 }} contentFit={item.type === 'partner' ? 'contain' : 'cover'} priority="high" />
        ) : (
          <View style={{ height: insets.top + 56, backgroundColor: C.tint }} />
        )}
      </View>

      <View style={styles.body}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: isPerson ? 'center' : 'flex-start' }}>
          {label ? <Tag label={label} /> : null}
          {item.type === 'project' && item.meta?.ongoing ? <Tag tone="green" label="● Ongoing" /> : null}
          {item.type === 'event' && isUpcoming(item.date) ? <Tag tone="green" label="Upcoming" /> : null}
        </View>
        <T v="h1" style={[{ marginTop: 12, fontSize: 25, lineHeight: 32 }, isPerson && { textAlign: 'center' }]}>{item.title}</T>
        {item.date && !isPerson && item.type !== 'service' && item.type !== 'partner' ? (
          <Text style={styles.date}>{fmtDate(item.date, true)}</Text>
        ) : null}

        <Facts item={item} />

        {item.summary && !(item.body || '').includes(item.summary.slice(0, 60)) ? <Text style={styles.lead}>{item.summary}</Text> : null}

        {item.body ? (
          <View style={{ marginTop: 18 }}>
            <Markdown body={item.body} />
          </View>
        ) : isPlaceholderData ? (
          <View style={{ marginTop: 18 }}>
            <DetailLinesSkeleton />
          </View>
        ) : null}

        {Array.isArray(item.meta?.facts) && item.meta!.facts.length ? (
          <View style={{ marginTop: 22, gap: 8 }}>
            <T v="eyebrow">Key facts</T>
            {item.meta!.facts.map((f: string) => (
              <View key={f} style={styles.factChip}>
                <Ionicons name="checkmark-circle" size={16} color={C.blue} />
                <Text style={styles.factChipText}>{f}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {item.gallery && item.gallery.length > 0 ? <Gallery images={item.gallery} /> : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 28 }}>
          {item.link && item.type !== 'episode' ? (
            <Button
              label={item.type === 'research' ? 'Read the article' : item.type === 'service' ? 'Apply online' : 'Open on sra.so'}
              icon="open-outline"
              onPress={() => Linking.openURL(item.link!).catch(() => {})}
            />
          ) : null}
          {item.type === 'service' ? <Button label="Request a quote" variant="outline" href="/contact" icon="chatbubbles-outline" /> : null}
          <Button label="Share" variant="ghost" icon="share-social-outline" onPress={share} />
        </View>
      </View>
    </ScrollView>
  );
}

/** Shown while the full text loads (the card's summary is already visible). */
function DetailLinesSkeleton() {
  return (
    <SkeletonGroup>
      <View style={{ gap: 10 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} w={i === 5 ? '60%' : '100%'} h={13} />
        ))}
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: S.gutter, paddingTop: 20 },
  date: { fontFamily: F.semibold, fontSize: 13.5, color: C.muted, marginTop: 8 },
  lead: { fontFamily: F.medium, fontSize: 17, lineHeight: 27, color: '#333', marginTop: 16 },
  facts: { marginTop: 18, backgroundColor: C.tint, borderRadius: R.lg, padding: 14, gap: 10, borderWidth: 1, borderColor: '#CFE3FB' },
  factRow: { flexDirection: 'row', gap: 12 },
  factKey: { fontFamily: F.extrabold, fontSize: 11.5, letterSpacing: 1, color: C.navy, textTransform: 'uppercase', width: 92, paddingTop: 2 },
  factVal: { flex: 1, fontFamily: F.medium, fontSize: 14.5, color: C.text, lineHeight: 20 },
  factChip: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: C.bg, borderRadius: 10, padding: 10 },
  factChipText: { flex: 1, fontFamily: F.medium, fontSize: 14, color: C.text, lineHeight: 20 },
  personHead: { alignItems: 'center', backgroundColor: C.tint, paddingBottom: 24 },
  avatar: { width: 140, height: 140, borderRadius: 70, borderWidth: 4, borderColor: C.white },
  ytBtn: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.white,
    paddingHorizontal: 18,
    height: 48,
    borderRadius: R.pill,
  },
  ytText: { fontFamily: F.bold, fontSize: 15, color: C.navy },
  viewer: { flex: 1, backgroundColor: 'rgba(5,3,30,0.96)', justifyContent: 'center' },
  close: { position: 'absolute', top: 54, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
});
