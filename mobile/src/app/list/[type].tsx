import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { ContentList } from '@/components/content-list';
import { EmptyState } from '@/components/ui';
import { C } from '@/constants/theme';
import type { ContentType } from '@/lib/types';

const TITLES: Record<ContentType, string> = {
  insight: 'Flash cards',
  story: 'Policy impact',
  research: 'Research library',
  project: 'Projects',
  event: 'Events',
  episode: 'Cilmi iyo Cod podcast',
  video: 'Videos',
  researcher: 'Our researchers',
  fuel: 'Fuel prices',
  service: 'Our services',
  partner: 'Partners & clients',
};

export default function ListScreen() {
  const { type, search } = useLocalSearchParams<{ type: ContentType; search?: string }>();
  if (!TITLES[type]) return <EmptyState title="Page not found" />;
  const small = type === 'service' || type === 'partner';
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ title: search ? 'Search' : TITLES[type] }} />
      <ContentList type={type} searchable={!small} filterable={!small} autoFocusSearch={!!search} />
    </View>
  );
}
