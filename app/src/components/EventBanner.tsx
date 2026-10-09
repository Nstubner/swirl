import { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarClock, Zap } from 'lucide-react-native';
import { useExtras } from '@/lib/extras';
import { useExplain } from '@/lib/explain-context';
import { C, F } from '@/lib/theme';

function until(iso: string, now: number) {
  const mins = Math.max(0, Math.round((new Date(iso).getTime() - now) / 60000));
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
}

function when(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

/** Live event ("Swirl Night: likes count 2× · 1h 20m left") or the next upcoming one. */
export default function EventBanner() {
  const { extras } = useExtras();
  const explain = useExplain();
  const ev = extras?.event;
  const next = extras?.next_event;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  if (ev) {
    return (
      <Pressable onPress={() => explain('event', ev)} style={{ marginHorizontal: 16, marginBottom: 6 }} accessibilityRole="button">
        <LinearGradient colors={['#FF8A5B', C.pink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Zap size={16} color="#fff" fill="#fff" />
          <Text style={{ fontFamily: F.bold, fontSize: 13, color: '#fff', flex: 1 }} numberOfLines={1}>
            {ev.name}: likes count {Number(ev.multiplier)}×
          </Text>
          <Text style={{ fontFamily: F.semibold, fontSize: 12, color: '#fff' }}>{until(ev.ends_at, now)} left</Text>
        </LinearGradient>
      </Pressable>
    );
  }
  if (next && new Date(next.starts_at).getTime() - now < 3 * 86400000) {
    return (
      <Pressable onPress={() => explain('event', next)} accessibilityRole="button"
        style={{ marginHorizontal: 16, marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.surface2 }}>
        <CalendarClock size={16} color={C.pink} />
        <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.text, flex: 1 }} numberOfLines={1}>
          {next.name} · {when(next.starts_at)}
        </Text>
      </Pressable>
    );
  }
  return null;
}
