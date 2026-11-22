import { useState } from 'react';
import { View } from 'react-native';
import { ContentList } from '@/components/content-list';
import { Segmented } from '@/components/segmented';
import { C } from '@/constants/theme';

type Tab = 'event' | 'episode' | 'video';

export default function Media() {
  const [tab, setTab] = useState<Tab>('event');
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'event', label: 'Events' },
          { value: 'episode', label: 'Podcast' },
          { value: 'video', label: 'Videos' },
        ]}
      />
      <View style={{ flex: 1 }}>
        <ContentList key={tab} type={tab} searchable={tab !== 'event'} filterable={tab !== 'event'} />
      </View>
    </View>
  );
}
