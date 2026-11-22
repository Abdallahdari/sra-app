// Tiny renderer for the "markdown-lite" body format stored by the backend.
// Supports: ## headings, - bullets, ![alt](img), [label](url), **bold**, paragraphs.
import { memo, useMemo } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { C, F, R } from '@/constants/theme';
import { Img } from './cards';

type Block =
  | { t: 'h'; text: string }
  | { t: 'p'; text: string }
  | { t: 'li'; text: string }
  | { t: 'img'; src: string; alt: string }
  | { t: 'link'; label: string; url: string };

function parse(md: string): Block[] {
  return md
    .split(/\n{2,}|\n(?=## |- )/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((line): Block => {
      if (line.startsWith('## ')) return { t: 'h', text: line.slice(3) };
      if (line.startsWith('- ')) return { t: 'li', text: line.slice(2) };
      const img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (img) return { t: 'img', alt: img[1], src: img[2] };
      const link = line.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) return { t: 'link', label: link[1], url: link[2] };
      return { t: 'p', text: line };
    });
}

/** Inline **bold** and [label](url) */
function Inline({ text, style }: { text: string; style: any }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);
  return (
    <Text style={style}>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) return <Text key={i} style={{ fontFamily: F.bold, color: C.text }}>{p.slice(2, -2)}</Text>;
        const l = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (l)
          return (
            <Text key={i} style={{ color: C.blue, fontFamily: F.semibold }} onPress={() => Linking.openURL(l[2]).catch(() => {})}>
              {l[1]}
            </Text>
          );
        return p;
      })}
    </Text>
  );
}

export const Markdown = memo(function Markdown({ body }: { body?: string }) {
  const blocks = useMemo(() => parse(body || ''), [body]);
  return (
    <View style={{ gap: 12 }}>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'h':
            return <Text key={i} style={st.h}>{b.text}</Text>;
          case 'li':
            return (
              <View key={i} style={st.li}>
                <View style={st.bullet} />
                <Inline text={b.text} style={[st.p, { flex: 1 }]} />
              </View>
            );
          case 'img':
            return (
              <View key={i}>
                <Img uri={b.src} style={st.img} />
                {b.alt ? <Text style={st.caption}>{b.alt}</Text> : null}
              </View>
            );
          case 'link':
            return (
              <Text key={i} style={st.linkBlock} onPress={() => Linking.openURL(b.url).catch(() => {})}>
                {b.label} ↗
              </Text>
            );
          default:
            return <Inline key={i} text={b.text} style={st.p} />;
        }
      })}
    </View>
  );
});

const st = StyleSheet.create({
  h: { fontFamily: F.extrabold, fontSize: 19, lineHeight: 25, color: C.navy, marginTop: 10 },
  p: { fontFamily: F.regular, fontSize: 16, lineHeight: 26, color: '#333' },
  li: { flexDirection: 'row', gap: 10, paddingLeft: 4 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.sky, marginTop: 10 },
  img: { width: '100%', aspectRatio: 16 / 10, borderRadius: R.lg },
  caption: { fontFamily: F.regular, fontSize: 13.5, color: C.muted, marginTop: 6, lineHeight: 19 },
  linkBlock: {
    fontFamily: F.bold,
    fontSize: 15,
    color: C.navy,
    backgroundColor: C.tint,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: 'hidden',
  },
});
