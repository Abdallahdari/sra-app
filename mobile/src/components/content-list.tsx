import Ionicons from '@expo/vector-icons/Ionicons';
import { FlashList } from '@shopify/flash-list';
import { useCallback, useDeferredValue, useMemo, useState, type ReactElement } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { C, F, R, S } from '@/constants/theme';
import { useCategories, useList } from '@/lib/queries';
import type { ContentType, Item } from '@/lib/types';
import { EpisodeCard, EventCard, FuelRow, InsightCard, PartnerLogo, PersonCard, ProjectCard, ResearchCard, ServiceRow, StoryCard, VideoCard } from './cards';
import { ListSkeleton } from './skeleton';
import { Chip, EmptyState, ErrorState } from './ui';

const GRID: ContentType[] = ['insight'];
const skeletonKind: Record<ContentType, 'card' | 'row' | 'person' | 'grid' | 'text'> = {
  insight: 'grid',
  story: 'card',
  research: 'text',
  project: 'text',
  event: 'card',
  episode: 'row',
  video: 'card',
  researcher: 'person',
  fuel: 'row',
  service: 'row',
  partner: 'row',
};

const EMPTY: Partial<Record<ContentType, { title: string; message: string }>> = {
  fuel: { title: 'No fuel reports yet', message: 'SRA enumerators are starting weekly reports from cities across Somalia.' },
};

export function renderItemFor(type: ContentType, item: Item, index: number): ReactElement {
  switch (type) {
    case 'insight':
      return <InsightCard item={item} />;
    case 'story':
      return <StoryCard item={item} />;
    case 'research':
      return <ResearchCard item={item} />;
    case 'project':
      return <ProjectCard item={item} />;
    case 'event':
      return <EventCard item={item} />;
    case 'episode':
      return <EpisodeCard item={item} />;
    case 'video':
      return <VideoCard item={item} />;
    case 'researcher':
      return <PersonCard item={item} />;
    case 'fuel':
      return (
        <View style={styles.box}>
          <FuelRow item={item} />
        </View>
      );
    case 'service':
      return (
        <View style={styles.box}>
          <ServiceRow item={item} index={index} />
        </View>
      );
    case 'partner':
      return <PartnerLogo item={item} />;
  }
}

export function ContentList({
  type,
  header,
  searchable = true,
  filterable = true,
  autoFocusSearch = false,
}: {
  type: ContentType;
  header?: ReactElement | null;
  searchable?: boolean;
  filterable?: boolean;
  autoFocusSearch?: boolean;
}) {
  const [category, setCategory] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const q = useDeferredValue(search.trim());
  const cats = useCategories(type);
  const list = useList(type, { category, q: q.length >= 2 ? q : undefined });
  const [refreshing, setRefreshing] = useState(false);

  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);
  const total = list.data?.pages[0]?.total;
  const grid = GRID.includes(type);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([list.refetch(), cats.refetch()]);
    setRefreshing(false);
  }, [list, cats]);

  const Header = (
    <View style={{ gap: 12, paddingBottom: 14 }}>
      {header}
      {searchable ? (
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={C.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by title, topic or name"
            placeholderTextColor="#9A9DB3"
            style={styles.searchInput}
            returnKeyType="search"
            autoFocus={autoFocusSearch}
            autoCorrect={false}
          />
          {search ? <Ionicons name="close-circle" size={18} color={C.muted} onPress={() => setSearch('')} /> : null}
        </View>
      ) : null}
      {filterable && (cats.data?.length ?? 0) > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -S.gutter }}>
          <View style={{ width: S.gutter - 8 }} />
          <Chip label="All" active={!category} onPress={() => setCategory(undefined)} />
          {cats.data!.map((c) => (
            <Chip key={c.name} label={c.name} count={c.count} active={category === c.name} onPress={() => setCategory(category === c.name ? undefined : c.name)} />
          ))}
          <View style={{ width: S.gutter - 8 }} />
        </ScrollView>
      ) : null}
    </View>
  );

  if (list.isPending) {
    return (
      <View style={{ padding: S.gutter }}>
        {Header}
        <ListSkeleton kind={skeletonKind[type]} count={grid ? 6 : 5} />
      </View>
    );
  }

  return (
    <FlashList
      data={items}
      key={grid ? 'grid' : 'list'}
      numColumns={grid ? 2 : 1}
      keyExtractor={(i) => i._id}
      renderItem={({ item, index }) => (
        <View style={grid ? { flex: 1, paddingHorizontal: 6, paddingBottom: 12 } : { paddingBottom: S.gap }}>{renderItemFor(type, item, index)}</View>
      )}
      ListHeaderComponent={<View style={grid ? { paddingHorizontal: 6 } : undefined}>{Header}</View>}
      ListEmptyComponent={
        list.isError ? (
          <ErrorState message={(list.error as Error)?.message} onRetry={() => list.refetch()} />
        ) : (
          <EmptyState
            icon={q ? 'search' : 'albums-outline'}
            title={q ? 'No matches' : EMPTY[type]?.title || 'Nothing here yet'}
            message={q ? `Nothing matches "${q}".` : EMPTY[type]?.message}
          />
        )
      }
      ListFooterComponent={
        list.isFetchingNextPage ? (
          <ActivityIndicator color={C.navy} style={{ marginVertical: 20 }} />
        ) : total && !list.hasNextPage && items.length > 6 ? (
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <Ionicons name="checkmark-circle-outline" size={18} color={C.muted} />
          </View>
        ) : null
      }
      contentContainerStyle={{ padding: grid ? S.gutter - 6 : S.gutter, paddingBottom: 40 }}
      onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
      onEndReachedThreshold={0.6}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.navy} />}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    />
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.white,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    height: 46,
  },
  searchInput: { flex: 1, fontFamily: F.medium, fontSize: 15, color: C.text, height: '100%' },
  box: { backgroundColor: C.white, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
});
