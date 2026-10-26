import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AnalyzedTurn, MemberSpeech, MemberUptake } from '../lib/analysis';
import { MEMBER_COLORS } from '../lib/types';

export function memberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length] ?? '#6E6E6E';
}

function useDarkChart(): boolean {
  const [dark, setDark] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false,
  );
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setDark(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return dark;
}

interface ShareProps {
  members: MemberSpeech[];
  colors: Map<string, string>;
  mode: 'words' | 'turns';
  equalShare: number;
}

/** Bar chart of speaking share, with a dashed line at an even split. */
export function ParticipationChart({ members, colors, mode, equalShare }: ShareProps) {
  const dark = useDarkChart();
  const tick = dark ? '#A3AAA6' : '#6B7280';
  const grid = dark ? '#31403B' : '#E5E7EB';
  const data = members.map((member) => ({
    name: member.name,
    percent: Math.round((mode === 'words' ? member.wordShare : member.turnShare) * 100),
    color: colors.get(member.memberId) ?? '#6E6E6E',
  }));
  const equal = Math.round(equalShare * 100);

  return (
    <div className="w-full min-w-0">
      <div className="h-72 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={grid} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: tick, fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: tick, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              unit="%"
              width={48}
            />
            <Tooltip formatter={(value) => [`${Number(value)}%`, mode === 'words' ? 'Share of words' : 'Share of turns']} />
            <ReferenceLine y={equal} stroke={tick} strokeDasharray="4 4" />
            <Bar dataKey="percent" radius={[6, 6, 0, 0]} maxBarSize={48} isAnimationActive={false}>
              {data.map((row) => (
                <Cell key={row.name} fill={row.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-sm text-muted dark:text-muted-dark">The dashed line is an even split, {equal}%.</p>
    </div>
  );
}

interface UptakeProps {
  members: MemberUptake[];
}

/** Grouped bars for ideas picked up and ideas this person built on. */
export function UptakeChart({ members }: UptakeProps) {
  const dark = useDarkChart();
  const tick = dark ? '#A3AAA6' : '#6B7280';
  const grid = dark ? '#31403B' : '#E5E7EB';
  const data = members.map((member) => ({
    name: member.name,
    pickedUp: member.ideasPickedUp,
    builtOn: member.builtOnOthers,
  }));

  return (
    <div className="h-72 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis dataKey="name" tick={{ fill: tick, fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: tick, fontSize: 12 }} axisLine={false} tickLine={false} width={32} />
          <Tooltip />
          <Legend />
          <Bar dataKey="pickedUp" name="Ideas picked up" fill="#2F5D50" radius={[6, 6, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          <Bar dataKey="builtOn" name="Built on others" fill="#D98E4A" radius={[6, 6, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface TimelineProps {
  turns: AnalyzedTurn[];
  colors: Map<string, string>;
  names: Map<string, string>;
}

/** One block per turn. Width follows how many words were in that turn. */
export function ConversationTimeline({ turns, colors, names }: TimelineProps) {
  const legend = [...names.entries()];
  return (
    <div className="space-y-3">
      <div
        className="flex h-10 w-full overflow-hidden rounded-lg"
        role="img"
        aria-label={turns.map((turn) => `${turn.name}, ${turn.wordCount} words`).join('. ')}
      >
        {turns.map((turn) => (
          <div
            key={turn.index}
            title={`${turn.name}: ${turn.wordCount} words`}
            style={{
              flexGrow: turn.wordCount,
              flexBasis: 0,
              minWidth: 2,
              background: colors.get(turn.memberId) ?? '#6E6E6E',
            }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-3">
        {legend.map(([id, name]) => (
          <li key={id} className="flex items-center gap-2 text-sm text-ink dark:text-ink-dark">
            <span className="h-3 w-3 rounded-sm" style={{ background: colors.get(id) ?? '#6E6E6E' }} aria-hidden="true" />
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}
