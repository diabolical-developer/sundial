import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'plus' | 'check' | 'x' | 'bell' | 'play' | 'pause' | 'trash' | 'clock' | 'undo' | 'focus'
  | 'sun' | 'moon' | 'calendar' | 'arrowUp' | 'reset' | 'note' | 'chevronRight' | 'minus';

interface Props {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}

/** A small, consistent line-icon set (24px grid, round caps). */
export function Icon({ name, size = 20, color, strokeWidth = 2 }: Props) {
  const s = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" pointerEvents="none">
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...s} />}
      {name === 'minus' && <Path d="M5 12h14" {...s} />}
      {name === 'check' && <Path d="M20 6 9 17l-5-5" {...s} />}
      {name === 'x' && <Path d="M18 6 6 18M6 6l12 12" {...s} />}
      {name === 'bell' && (
        <>
          <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" {...s} />
          <Path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" {...s} />
        </>
      )}
      {name === 'play' && <Path d="M7 4.8v14.4a1 1 0 0 0 1.5.86l11.6-7.2a1 1 0 0 0 0-1.72L8.5 3.94A1 1 0 0 0 7 4.8Z" fill={color} />}
      {name === 'pause' && (
        <>
          <Rect x={6} y={4.5} width={4} height={15} rx={1.2} fill={color} />
          <Rect x={14} y={4.5} width={4} height={15} rx={1.2} fill={color} />
        </>
      )}
      {name === 'trash' && <Path d="M4 7h16M9 7V4.5h6V7M18.5 7l-.9 12.2a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8L5.5 7" {...s} />}
      {name === 'clock' && (
        <>
          <Circle cx={12} cy={12} r={9} {...s} />
          <Path d="M12 7v5l3 2" {...s} />
        </>
      )}
      {name === 'undo' && <Path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" {...s} />}
      {name === 'focus' && (
        <>
          <Circle cx={12} cy={12} r={9} {...s} />
          <Circle cx={12} cy={12} r={4.5} {...s} />
          <Circle cx={12} cy={12} r={1.2} fill={color} />
        </>
      )}
      {name === 'sun' && (
        <>
          <Circle cx={12} cy={12} r={4} {...s} />
          <Path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" {...s} />
        </>
      )}
      {name === 'moon' && <Path d="M20.5 13.3A8.5 8.5 0 1 1 10.7 3.5a6.6 6.6 0 0 0 9.8 9.8Z" {...s} />}
      {name === 'calendar' && (
        <>
          <Rect x={3.5} y={5} width={17} height={15.5} rx={3} {...s} />
          <Path d="M8 3v4M16 3v4M3.5 10.5h17" {...s} />
        </>
      )}
      {name === 'arrowUp' && <Path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" {...s} />}
      {name === 'reset' && <Path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5M3.5 3.5v5h5" {...s} />}
      {name === 'note' && <Path d="M5 5h14M5 10h14M5 15h9" {...s} />}
      {name === 'chevronRight' && <Path d="m9.5 6 6 6-6 6" {...s} />}
    </Svg>
  );
}
