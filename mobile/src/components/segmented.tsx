import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F, R, S } from '@/constants/theme';

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View style={styles.wrap}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.opt, on && styles.on]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <Text style={[styles.text, on && { color: C.white }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderRadius: R.pill,
    padding: 4,
    marginHorizontal: S.gutter,
    marginTop: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  opt: { flex: 1, paddingVertical: 9, borderRadius: R.pill, alignItems: 'center' },
  on: { backgroundColor: C.navy },
  text: { fontFamily: F.bold, fontSize: 13.5, color: C.navy },
});
