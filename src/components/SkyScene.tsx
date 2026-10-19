import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, LinearGradient as SvgGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { type Phase, SKY } from '../theme';
import { LAND_H, LAND_W, LANDSCAPE, mix } from '../ui/landscape';
import { loop, seeded } from '../ui/motion';

interface Props {
  phase: Phase;
  /** Colour of the page below, so the valley mist melts into it. */
  ground: string;
  /** Height of the landscape band at the bottom of the scene. */
  landHeight?: number;
  /** Sky only, no landscape. */
  bare?: boolean;
}

const STAR_TINTS = ['#FFFFFF', '#D6E4FF', '#FFF0D6', '#FFFFFF', '#E4E0FF'];

const STARS = Array.from({ length: 46 }, (_, i) => ({
  left: seeded(i, 1) * 100,
  top: seeded(i, 2) * 70,
  size: 0.8 + Math.pow(seeded(i, 3), 3) * 2.4,
  base: 0.35 + seeded(i, 4) * 0.6,
  twinkle: 2200 + seeded(i, 5) * 3600,
  delay: seeded(i, 6) * 4000,
  rank: seeded(i, 7),
  tint: STAR_TINTS[i % STAR_TINTS.length],
}));

/** The brightest few get a soft halo. */
const BRIGHT = [
  { left: 14, top: 16, size: 16, delay: 0 },
  { left: 72, top: 8, size: 13, delay: 1400 },
  { left: 88, top: 36, size: 18, delay: 2600 },
  { left: 62, top: 31, size: 12, delay: 3600 },
];

/** Faint dust of the Milky Way: tiny stars scattered along a diagonal band. */
const DUST = Array.from({ length: 90 }, (_, i) => {
  const t = seeded(i, 21);
  const spread = (seeded(i, 22) - 0.5) * 18 * (0.4 + seeded(i, 23));
  return { x: t * 120 - 10, y: 62 - t * 50 + spread, r: 0.15 + seeded(i, 24) * 0.35, o: 0.25 + seeded(i, 25) * 0.5 };
});

/** Puffs that make up a cumulus cloud, on a 100 × 50 grid: big round tops over a flatter base. */
const PUFFS = [
  { cx: 30, cy: 30, rx: 20, ry: 15 },
  { cx: 50, cy: 21, rx: 22, ry: 19 },
  { cx: 70, cy: 28, rx: 19, ry: 15 },
  { cx: 40, cy: 35, rx: 24, ry: 11 },
  { cx: 64, cy: 36, rx: 24, ry: 10 },
  { cx: 18, cy: 38, rx: 14, ry: 8 },
  { cx: 84, cy: 37, rx: 14, ry: 8 },
];

const CLOUDS = [
  { id: 'a', left: '58%', top: '3%', w: 150, o: 0.75, drift: -30, dur: 30000 },
  { id: 'b', left: '78%', top: '36%', w: 92, o: 0.6, drift: 18, dur: 21000 },
  { id: 'c', left: '-8%', top: '52%', w: 120, o: 0.45, drift: 24, dur: 26000 },
] as const;

/** A soft, volumetric cloud: overlapping puffs with feathered edges and a shaded underside. */
export function Cloud({ id, w, lit, shade }: { id: string; w: number; lit: string; shade: string }) {
  return (
    <Svg width={w} height={w / 2} viewBox="0 0 100 50">
      <Defs>
        <RadialGradient id={`puff-${id}`} cx="50%" cy="42%" r="50%">
          <Stop offset="0" stopColor={lit} stopOpacity={1} />
          <Stop offset="0.62" stopColor={lit} stopOpacity={0.92} />
          <Stop offset="1" stopColor={lit} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`shade-${id}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={shade} stopOpacity={0.55} />
          <Stop offset="1" stopColor={shade} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {PUFFS.map((p, i) => (
        <Ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} fill={`url(#puff-${id})`} />
      ))}
      <Ellipse cx={52} cy={40} rx={40} ry={8} fill={`url(#shade-${id})`} />
    </Svg>
  );
}

/**
 * The living sky behind the header: a gradient for the time of day, twinkling coloured stars, the
 * Milky Way and the odd shooting star at night, soft clouds by day, light pooling on the horizon,
 * and a mountain landscape that sinks into valley mist the colour of the page.
 */
function SkySceneBase({ phase, ground, landHeight = 128, bare }: Props) {
  const sky = SKY[phase];
  const reduceMotion = useReducedMotion();
  const visibleStars = STARS.filter((s) => s.rank < sky.stars);
  const night = phase === 'night';

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={sky.colors} locations={sky.locations} style={StyleSheet.absoluteFill} />

      {/* Light pooling on the horizon. */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={`horizon-${phase}`} cx="50%" cy="100%" rx="75%" ry="60%" fx="50%" fy="100%">
            <Stop offset="0" stopColor={sky.glow} stopOpacity={night ? 0.3 : 0.6} />
            <Stop offset="0.5" stopColor={sky.glow} stopOpacity={night ? 0.1 : 0.22} />
            <Stop offset="1" stopColor={sky.glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={50} cy={100} rx={95} ry={65} fill={`url(#horizon-${phase})`} />
      </Svg>

      {night && (
        <>
          <View style={styles.milkyWay}>
            <LinearGradient
              colors={['rgba(150,160,255,0)', 'rgba(170,175,255,0.10)', 'rgba(255,240,230,0.08)', 'rgba(150,160,255,0)']}
              locations={[0, 0.42, 0.58, 1]}
              style={StyleSheet.absoluteFill}
            />
          </View>
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            {DUST.map((d, i) => (
              <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#FFFFFF" fillOpacity={d.o} />
            ))}
          </Svg>
        </>
      )}

      {visibleStars.map((s, i) => (
        <Animated.View
          key={i}
          style={[
            styles.star,
            { left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, opacity: s.base, backgroundColor: s.tint },
            loop(reduceMotion, { from: { opacity: s.base }, to: { opacity: s.base * 0.25 } }, s.twinkle, {
              delayMs: s.delay,
              alternate: true,
            }),
          ]}
        />
      ))}

      {night &&
        BRIGHT.map((s, i) => (
          <Animated.View
            key={`b-${i}`}
            style={[
              { position: 'absolute', left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size },
              loop(
                reduceMotion,
                { from: { opacity: 1, transform: [{ scale: 1 }] }, to: { opacity: 0.45, transform: [{ scale: 0.7 }] } },
                3400,
                { delayMs: s.delay, alternate: true },
              ),
            ]}
          >
            <Svg width={s.size} height={s.size} viewBox="0 0 20 20">
              <Defs>
                <RadialGradient id={`bright-${i}`} cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity={1} />
                  <Stop offset="0.15" stopColor="#E8ECFF" stopOpacity={0.9} />
                  <Stop offset="0.4" stopColor="#B9C4FF" stopOpacity={0.25} />
                  <Stop offset="1" stopColor="#B9C4FF" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={10} cy={10} r={10} fill={`url(#bright-${i})`} />
              {/* Faint diffraction spikes, as a camera sees a bright star. */}
              <Path d="M10 1 L10.35 10 L10 19 L9.65 10 Z M1 10 L10 9.65 L19 10 L10 10.35 Z" fill="#FFFFFF" fillOpacity={0.5} />
            </Svg>
          </Animated.View>
        ))}

      {night && !reduceMotion && (
        <Animated.View
          style={[
            styles.meteorPath,
            loop(
              false,
              {
                '0%': { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }] },
                '2%': { opacity: 1 },
                '7%': { opacity: 0, transform: [{ translateX: -170 }, { translateY: 96 }] },
                '100%': { opacity: 0, transform: [{ translateX: -170 }, { translateY: 96 }] },
              },
              13000,
              { delayMs: 2500, linear: true },
            ),
          ]}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.95)', 'rgba(200,210,255,0.35)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.meteor}
          />
        </Animated.View>
      )}

      {sky.clouds &&
        CLOUDS.map((c) => (
          <Animated.View
            key={c.id}
            style={[
              { position: 'absolute', left: c.left, top: c.top, opacity: c.o },
              loop(
                reduceMotion,
                { from: { transform: [{ translateX: 0 }] }, to: { transform: [{ translateX: c.drift }] } },
                c.dur,
                { alternate: true },
              ),
            ]}
          >
            <Cloud id={`${phase}-${c.id}`} w={c.w} lit={sky.clouds![0]} shade={sky.clouds![1]} />
          </Animated.View>
        ))}

      {!bare && <Landscape phase={phase} ground={ground} height={landHeight} />}
    </View>
  );
}

/**
 * Mountains on the horizon: a far range that fades into haze at its base, rolling middle hills,
 * and a pine treeline sinking into valley mist the colour of whatever sits below.
 */
export function Landscape({ phase, ground, height }: { phase: Phase; ground: string; height: number }) {
  const sky = SKY[phase];
  const id = `${phase}-${ground.replace('#', '')}`;
  return (
    <>
      {/* A strip of ground under the mist, so no hairline of sky shows through at the seam. */}
      <View pointerEvents="none" style={[styles.seam, { backgroundColor: ground }]} />
      <Svg
        pointerEvents="none"
        style={[styles.land, { height }]}
        width="100%"
        height={height}
        viewBox={`0 0 ${LAND_W} ${LAND_H}`}
        preserveAspectRatio="xMidYMax slice"
      >
        <Defs>
          <SvgGradient id={`far-${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.1" stopColor={sky.land[0]} />
            <Stop offset="0.55" stopColor={mix(sky.land[0], sky.colors[3], 0.55)} />
          </SvgGradient>
          <SvgGradient id={`haze-${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={sky.glow} stopOpacity={0} />
            <Stop offset="0.6" stopColor={sky.glow} stopOpacity={phase === 'night' ? 0.1 : 0.26} />
            <Stop offset="1" stopColor={sky.glow} stopOpacity={0} />
          </SvgGradient>
          <SvgGradient id={`mid-${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.35" stopColor={sky.land[1]} />
            <Stop offset="1" stopColor={sky.land[0]} />
          </SvgGradient>
          <SvgGradient id={`mist-${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={ground} stopOpacity={0} />
            <Stop offset="0.45" stopColor={ground} stopOpacity={0.55} />
            <Stop offset="1" stopColor={ground} stopOpacity={1} />
          </SvgGradient>
        </Defs>
        {/* Each range is darker and less hazy than the one behind it; haze pools in the valleys between. */}
        <Path d={LANDSCAPE.far} fill={`url(#far-${id})`} />
        <Rect x={0} y={18} width={LAND_W} height={44} fill={`url(#haze-${id})`} />
        <Path d={LANDSCAPE.ridge} fill={mix(sky.land[0], sky.land[1], 0.45)} />
        <Rect x={0} y={40} width={LAND_W} height={34} fill={`url(#haze-${id})`} />
        <Path d={LANDSCAPE.mid} fill={`url(#mid-${id})`} />
        <Path d={LANDSCAPE.near} fill={sky.land[2]} />
        <Rect x={0} y={64} width={LAND_W} height={LAND_H - 64} fill={`url(#mist-${id})`} />
      </Svg>
    </>
  );
}

/** Kept for older call sites. */
export const Hills = Landscape;

export const SkyScene = memo(SkySceneBase);

const styles = StyleSheet.create({
  star: { position: 'absolute', borderRadius: 2 },
  milkyWay: {
    position: 'absolute',
    left: '-30%',
    right: '-30%',
    top: '22%',
    height: 110,
    transform: [{ rotate: '-24deg' }],
  },
  meteorPath: { position: 'absolute', right: '8%', top: '6%', opacity: 0 },
  meteor: { width: 96, height: 1.6, borderRadius: 1, transform: [{ rotate: '-29.5deg' }] },
  land: { position: 'absolute', left: 0, right: 0, bottom: -1 },
  seam: { position: 'absolute', left: 0, right: 0, bottom: -1, height: 6 },
});
