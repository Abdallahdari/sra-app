import { useState } from 'react';
import { View } from 'react-native';
import { ContentList } from '@/components/content-list';
import { Segmented } from '@/components/segmented';
import { C } from '@/constants/theme';

type Tab = 'research' | 'project' | 'story';

export default function Research() {
  const [tab, setTab] = useState<Tab>('research');
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'research', label: 'Publications' },
          { value: 'project', label: 'Projects' },
          { value: 'story', label: 'Impact' },
        ]}
      />
      <View style={{ flex: 1 }}>
        <ContentList key={tab} type={tab} />
      </View>
    </View>
  );
}
