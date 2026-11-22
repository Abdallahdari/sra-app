import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EpisodeCard, EventCard, Img, InsightCard, PartnerLogo, ProjectCard, ServiceRow, StoryCard, VideoCard } from '@/components/cards';
import { HomeSkeleton } from '@/components/skeleton';
import { Button, ErrorState, SectionHeader, T, PressLink } from '@/components/ui';
import { C, F, R, S, shadow } from '@/constants/theme';
import { imageUrl } from '@/lib/api';
import { useHome } from '@/lib/queries';
import type { Item } from '@/lib/types';

function Rail({ data, render, width }: { data: Item[]; render: (item: Item, w: number) => React.ReactElement; width: number }) {
  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={(i) => i._id}
      renderItem={({ item }) => render(item, width)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: S.gutter, gap: S.gap, paddingBottom: 6 }}
      snapToInterval={width + S.gap}
      decelerationRate="fast"
      initialNumToRender={3}
      windowSize={5}
    />
  );
}

export default function Home() {
  const { data, isPending, isError, refetch, error } = useHome();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isPending) return <HomeSkeleton />;
  if (isError && !data) return <View style={{ paddingTop: insets.top + 40 }}><ErrorState message={(error as Error)?.message} onRetry={refetch} /></View>;

  const { settings, stories, insights, projects, events, episodes, videos, partners, services } = data;
  const hero = settings.hero || {};
  const cardW = Math.min(width * 0.8, 360);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.white} progressViewOffset={insets.top} />}>
      {/* ---------- Hero ---------- */}
      <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <Image source={imageUrl(hero.image)} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" priority="high" transition={200} />
        <LinearGradient colors={['rgba(20,10,110,0.55)', 'rgba(27,14,132,0.82)', C.navy]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.topBar}>
          <View style={styles.logoWrap}>
            <Image source={require('@/assets/images/sra-mark.png')} style={{ width: 52, height: 32 }} contentFit="contain" />
          </View>
          <Pressable onPress={() => router.push('/list/insight?search=1')} style={styles.searchBtn} hitSlop={8} accessibilityLabel="Search">
            <Ionicons name="search" size={20} color={C.white} />
          </Pressable>
        </View>
        <Text style={styles.heroTitle}>{hero.title}</Text>
        <Text style={styles.heroSub}>{hero.subtitle}</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <Button label="Our services" variant="light" href="/list/service" />
          <Button label="See our work" variant="onDark" href="/research" />
        </View>
      </View>

      {/* ---------- Stats ---------- */}
      {settings.stats?.length ? (
        <View style={styles.stats}>
          {settings.stats.map((s) => (
            <View key={s.label} style={styles.stat}>
              <Text style={styles.statVal}>{s.value}</Text>
              <Text style={styles.statLbl} numberOfLines={2}>{s.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {settings.announcement ? (
        <View style={styles.announce}>
          <Ionicons name="megaphone" size={18} color={C.navy} />
          <T style={{ flex: 1, color: C.navy, fontFamily: F.semibold, fontSize: 14 }}>{settings.announcement}</T>
        </View>
      ) : null}

      {/* ---------- Featured stories ---------- */}
      {stories.length ? (
        <View style={styles.section}>
          <SectionHeader eyebrow="Policy impact" title="Evidence that changes decisions" linkLabel="All" href="/list/story" style={styles.pad} />
          <Rail data={stories} width={cardW} render={(i, w) => <StoryCard item={i} width={w} />} />
        </View>
      ) : null}

      {/* ---------- Flash cards ---------- */}
      {insights.length ? (
        <View style={styles.section}>
          <SectionHeader eyebrow="Latest data" title="Somalia in numbers" linkLabel="All cards" href="/insights" style={styles.pad} />
          <Rail data={insights} width={Math.min(width * 0.46, 210)} render={(i, w) => <InsightCard item={i} width={w} />} />
        </View>
      ) : null}

      {/* ---------- Projects ---------- */}
      {projects.length ? (
        <View style={styles.section}>
          <SectionHeader eyebrow="Our work in the field" title="Where the data comes from" linkLabel="All projects" href="/list/project" style={styles.pad} />
          <Rail data={projects} width={cardW} render={(i, w) => <ProjectCard item={i} width={w} />} />
        </View>
      ) : null}

      {/* ---------- Coverage ---------- */}
      {settings.regions?.length ? (
        <View style={[styles.section, styles.pad]}>
          <View style={styles.coverage}>
            <T v="eyebrow">Nationwide coverage</T>
            <T v="h2" style={{ marginTop: 6 }}>Field teams across Somalia</T>
            <T style={{ marginTop: 6 }}>Local enumerators who speak the language and know the communities, in Banadir and every member state.</T>
            <View style={styles.regions}>
              {settings.regions.map((r) => (
                <View key={r} style={styles.region}>
                  <Ionicons name="location" size={13} color={C.blue} />
                  <Text style={styles.regionText}>{r}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : null}

      {/* ---------- Services ---------- */}
      {services.length ? (
        <View style={[styles.section, styles.pad]}>
          <SectionHeader eyebrow="What we do" title="From study design to the final report" />
          <View style={styles.listBox}>
            {services.map((s, i) => (
              <View key={s._id}>
                {i > 0 && <View style={styles.sep} />}
                <ServiceRow item={s} index={i} />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* ---------- Events ---------- */}
      {events.length ? (
        <View style={styles.section}>
          <SectionHeader eyebrow="Events & community" title="Bringing Somali researchers together" linkLabel="All" href="/list/event" style={styles.pad} />
          <Rail data={events} width={cardW} render={(i, w) => <EventCard item={i} width={w} />} />
        </View>
      ) : null}

      {/* ---------- Podcast ---------- */}
      {episodes.length ? (
        <View style={[styles.section, styles.pad]}>
          <View style={styles.podcast}>
            <Text style={[styles.podEyebrow]}>CILMI IYO COD PODCAST</Text>
            <Text style={styles.podTitle}>Research you can listen to</Text>
            <Text style={styles.podSub}>Somali researchers and experts talk about their findings on health, education, the economy and society, in Somali.</Text>
            <View style={{ gap: 10, marginTop: 16 }}>
              {episodes.slice(0, 3).map((e) => (
                <EpisodeCard key={e._id} item={e} compact />
              ))}
            </View>
            <Button label="All episodes" variant="light" href="/list/episode" style={{ marginTop: 16, alignSelf: 'flex-start' }} small icon="mic" />
            <Text style={styles.sponsor}>Proudly sponsored by Hormuud Telecom</Text>
          </View>
        </View>
      ) : null}

      {/* ---------- Videos ---------- */}
      {videos.length ? (
        <View style={styles.section}>
          <SectionHeader eyebrow="Featured videos" title="See SRA in action" linkLabel="All videos" href="/list/video" style={styles.pad} />
          <Rail data={videos} width={Math.min(width * 0.66, 300)} render={(i, w) => <VideoCard item={i} width={w} />} />
        </View>
      ) : null}

      {/* ---------- Partners ---------- */}
      {partners.length ? (
        <View style={styles.section}>
          <SectionHeader eyebrow="Partnerships" title="Our clients and partners" style={styles.pad} />
          <FlatList
            horizontal
            data={partners.filter((p) => p.category !== 'MoU')}
            keyExtractor={(i) => i._id}
            renderItem={({ item }) => <PartnerLogo item={item} />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: S.gutter, gap: 10 }}
          />
          {partners
            .filter((p) => p.category === 'MoU')
            .map((p) => (
              <View key={p._id} style={[styles.mou, styles.pad]}>
                <Img uri={p.image} style={{ width: 84, height: 64, borderRadius: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.mouTag}>MOU · {p.date ? new Date(p.date).getUTCFullYear() : ''}</Text>
                  <T v="title" style={{ color: C.navy }}>{p.title}</T>
                </View>
              </View>
            ))}
        </View>
      ) : null}

      {/* ---------- CTA ---------- */}
      <View style={[styles.section, styles.pad]}>
        <View style={styles.cta}>
          <Text style={styles.ctaTitle}>Planning a study, survey or evaluation?</Text>
          <Text style={styles.ctaSub}>Tell us what you need to know and where. Our team will get back to you.</Text>
          <Button label="Contact our team" variant="light" href="/contact" style={{ marginTop: 16, alignSelf: 'flex-start' }} icon="chatbubbles" />
        </View>
        <PressLink href="/about"  style={styles.footerLink}>
            <Text style={styles.footerText}>© {new Date().getFullYear()} Somali Researchers Association</Text>
          </PressLink>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: S.gutter },
  section: { marginTop: 34 },
  hero: { paddingHorizontal: S.gutter, paddingBottom: 72, overflow: 'hidden', backgroundColor: C.navy },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 34 },
  logoWrap: { backgroundColor: C.white, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontFamily: F.extrabold, fontSize: 31, lineHeight: 38, color: C.white, letterSpacing: -0.5 },
  heroSub: { fontFamily: F.regular, fontSize: 15.5, lineHeight: 23, color: 'rgba(255,255,255,0.86)', marginTop: 12 },
  stats: {
    flexDirection: 'row',
    marginHorizontal: S.gutter,
    marginTop: -46,
    backgroundColor: C.white,
    borderRadius: R.xl,
    paddingVertical: 16,
    paddingHorizontal: 6,
    ...shadow,
  },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  statVal: { fontFamily: F.extrabold, fontSize: 21, color: C.navy },
  statLbl: { fontFamily: F.medium, fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 2, lineHeight: 14 },
  announce: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginHorizontal: S.gutter,
    marginTop: 18,
    backgroundColor: C.tint,
    borderColor: C.tint2,
    borderWidth: 1,
    borderRadius: R.md,
    padding: 12,
  },
  coverage: { backgroundColor: C.tint, borderRadius: R.xl, padding: 20, borderWidth: 1, borderColor: '#CFE3FB' },
  regions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  region: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.white,
    borderRadius: R.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#CFE3FB',
  },
  regionText: { fontFamily: F.semibold, fontSize: 13.5, color: C.navy },
  listBox: { backgroundColor: C.white, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  sep: { height: 1, backgroundColor: C.borderSoft, marginLeft: 56 },
  podcast: { backgroundColor: C.navy, borderRadius: R.xl, padding: 20, overflow: 'hidden' },
  podEyebrow: { fontFamily: F.extrabold, fontSize: 11.5, letterSpacing: 1.4, color: C.sky },
  podTitle: { fontFamily: F.extrabold, fontSize: 23, color: C.white, marginTop: 6 },
  podSub: { fontFamily: F.regular, fontSize: 14.5, lineHeight: 21, color: 'rgba(255,255,255,0.82)', marginTop: 6 },
  sponsor: { fontFamily: F.medium, fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 14 },
  mou: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 12 },
  mouTag: { fontFamily: F.extrabold, fontSize: 11, letterSpacing: 1, color: C.blue, marginBottom: 2 },
  cta: { backgroundColor: C.navy, borderRadius: R.xl, padding: 22 },
  ctaTitle: { fontFamily: F.extrabold, fontSize: 21, lineHeight: 27, color: C.white },
  ctaSub: { fontFamily: F.regular, fontSize: 14.5, lineHeight: 21, color: 'rgba(255,255,255,0.85)', marginTop: 8 },
  footerLink: { alignItems: 'center', marginTop: 22 },
  footerText: { fontFamily: F.medium, fontSize: 12.5, color: C.muted },
});
