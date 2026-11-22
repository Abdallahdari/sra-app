import Ionicons from '@expo/vector-icons/Ionicons';
import { FlashList } from '@shopify/flash-list';
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { useDeferredValue, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Img } from '@/components/cards';
import { ListSkeleton } from '@/components/skeleton';
import { Button, EmptyState, ErrorState, Tag, PressLink } from '@/components/ui';
import { C, F, R, S } from '@/constants/theme';
import { useAdminList, useSaveItem } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { fmtDate } from '@/lib/format';
import { useTypes } from '@/lib/queries';
import type { ContentType, Item } from '@/lib/types';

function Row({ item }: { item: Item }) {
  const save = useSaveItem();
  const published = item.published !== false;
  return (
    <PressLink href={{ pathname: '/admin/edit', params: { type: item.type, id: item._id } }}  style={({ pressed }) => [styles.row, pressed && { backgroundColor: C.tint }]}>
        <Img uri={item.image} style={styles.img} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {[item.category, fmtDate(item.date)].filter(Boolean).join(' · ')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
            {published ? <Tag tone="green" label="Published" /> : <Tag tone="outline" label="Draft" />}
            {item.featured ? <Tag label="★ Featured" /> : null}
          </View>
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            save.mutate({ id: item._id, data: { published: !published } });
          }}
          hitSlop={8}
          style={styles.toggle}
          accessibilityLabel={published ? 'Unpublish' : 'Publish'}>
          {save.isPending ? <ActivityIndicator size="small" color={C.navy} /> : <Ionicons name={published ? 'eye' : 'eye-off'} size={19} color={published ? C.navy : C.muted} />}
        </Pressable>
      </PressLink>
  );
}

export default function AdminTypeList() {
  const { type } = useLocalSearchParams<{ type: ContentType }>();
  const { user, ready } = useAuth();
  const types = useTypes();
  const def = types.data?.find((t) => t.type === type);
  const [search, setSearch] = useState('');
  const q = useDeferredValue(search.trim());
  const list = useAdminList(type, q || undefined);
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);

  if (ready && !user) return <Redirect href="/admin/login" />;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen
        options={{
          title: def?.label || '',
          headerRight: () => (
            <PressLink href={{ pathname: '/admin/edit', params: { type } }}  hitSlop={10} style={styles.addBtn} accessibilityLabel="Add new">
                <Ionicons name="add" size={20} color={C.white} />
              </PressLink>
          ),
        }}
      />
      <FlashList
        data={items}
        keyExtractor={(i) => i._id}
        renderItem={({ item }) => <Row item={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: C.borderSoft }} />}
        ListHeaderComponent={
          <View style={{ padding: S.gutter, gap: 12 }}>
            {def ? <Text style={styles.desc}>{def.description}</Text> : null}
            <Button label={`New ${def?.singular.toLowerCase() || 'item'}`} icon="add-circle-outline" href={{ pathname: '/admin/edit', params: { type } }} />
            <View style={styles.search}>
              <Ionicons name="search" size={18} color={C.muted} />
              <TextInput value={search} onChangeText={setSearch} placeholder="Search titles" placeholderTextColor="#9A9DB3" style={styles.searchInput} />
            </View>
            {list.data ? <Text style={styles.count}>{list.data.pages[0].total} items</Text> : null}
            {list.isPending ? <ListSkeleton kind="row" count={6} /> : null}
          </View>
        }
        ListEmptyComponent={
          list.isPending ? null : list.isError ? (
            <ErrorState message={(list.error as Error).message} onRetry={() => list.refetch()} />
          ) : (
            <EmptyState title="Nothing here yet" message={`Add the first ${def?.singular.toLowerCase() || 'item'}.`} />
          )
        }
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={C.navy} style={{ margin: 20 }} /> : <View style={{ height: 40 }} />}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={list.isRefetching && !list.isFetchingNextPage} onRefresh={() => void list.refetch()} tintColor={C.navy} />}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  desc: { fontFamily: F.regular, fontSize: 14, color: C.body, lineHeight: 20 },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.white,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: { flex: 1, fontFamily: F.medium, fontSize: 15, color: C.text, height: '100%' },
  count: { fontFamily: F.semibold, fontSize: 12.5, color: C.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: S.gutter, paddingVertical: 12, backgroundColor: C.white },
  img: { width: 58, height: 58, borderRadius: 10 },
  title: { fontFamily: F.bold, fontSize: 14.5, color: C.text, lineHeight: 19 },
  meta: { fontFamily: F.regular, fontSize: 12.5, color: C.muted },
  toggle: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center' },
});
