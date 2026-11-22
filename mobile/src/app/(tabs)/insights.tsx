import { useState } from 'react';
import { View } from 'react-native';
import { ContentList } from '@/components/content-list';
import { Segmented } from '@/components/segmented';
import { C } from '@/constants/theme';

type Tab = 'insight' | 'video' | 'fuel';

export default function Insights() {
  const [tab, setTab] = useState<Tab>('insight');
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'insight', label: 'Flash cards' },
          { value: 'video', label: 'Videos' },
          { value: 'fuel', label: 'Fuel prices' },
        ]}
      />
      <View style={{ flex: 1 }}>
        <ContentList key={tab} type={tab} searchable={tab !== 'fuel'} />
      </View>
    </View>
  );
}
