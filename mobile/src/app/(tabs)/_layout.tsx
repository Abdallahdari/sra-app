import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { Platform, type ColorValue } from 'react-native';
import { C, F } from '@/constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
function icon(on: IconName, off: IconName) {
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? on : off} size={23} color={color as string} />;
  }
  return TabIcon;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.navy,
        tabBarInactiveTintColor: '#9A9DB3',
        tabBarLabelStyle: { fontFamily: F.bold, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: C.white,
          borderTopColor: C.border,
          height: Platform.OS === 'ios' ? 86 : 64,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        },
        headerTitleStyle: { fontFamily: F.extrabold, fontSize: 18, color: C.navy },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: C.white },
        sceneStyle: { backgroundColor: C.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', headerShown: false, tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights', tabBarIcon: icon('stats-chart', 'stats-chart-outline') }} />
      <Tabs.Screen name="research" options={{ title: 'Our work', tabBarIcon: icon('library', 'library-outline') }} />
      <Tabs.Screen name="media" options={{ title: 'Events & Podcast', tabBarLabel: 'Events', tabBarIcon: icon('mic', 'mic-outline') }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: icon('grid', 'grid-outline') }} />
    </Tabs>
  );
}
