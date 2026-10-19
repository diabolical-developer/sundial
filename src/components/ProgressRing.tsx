import Svg, { Circle } from 'react-native-svg';

import { useTween } from '../useNow';

interface Props {
  size: number;
  stroke: number;
  progress: number;
  color: string;
  track: string;
}

/** A ring that eases to its new value when progress changes. */
export function ProgressRing({ size, stroke, progress, color, track }: Props) {
  const p = useTween(Math.max(0, Math.min(1, progress)), 800);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      {p > 0.001 && (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - p)}
        />
      )}
    </Svg>
  );
}
