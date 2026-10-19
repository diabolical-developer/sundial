import { type Phase, SKY } from '../theme';
import { fitLandscape, LANDSCAPE } from '../ui/landscape';
import { seeded } from '../ui/motion';

export interface ArtMarker {
  /** 0 to 1 along the path. */
  at: number;
  state: 'open' | 'done' | 'late';
}

interface Options {
  width: number;
  height: number;
  phase: Phase;
  /** Where the sun (or moon) sits, 0 to 1 along the path. */
  at: number;
  night: boolean;
  markers: ArtMarker[];
  /** Round the bottom corners too (when the sky is the whole widget). */
  roundBottom: boolean;
  radius: number;
  /** Highest point the path may reach, so it stays clear of the text above it. */
  top?: number;
  /** Where the path meets the horizon (defaults to just above the near hills). */
  base?: number;
  /** Colour below the sky (the widget panel), for the valley mist to fade into. */
  ground?: string;
}

const f = (n: number) => n.toFixed(1);

/**
 * The widget's sky as one SVG: the gradient for the time of day, stars or clouds, the glow on the
 * horizon, layered hills, the sun's (or moon's) path with today's tasks on it, and the sun itself.
 * Mirrors the in-app header so the widget feels like a window onto the app.
 */
export function skyArt({ width: W, height: H, phase, at, night, markers, roundBottom, radius: R, top = 0, base, ground }: Options) {
  const sky = SKY[phase];
  const stops = sky.colors.map((c, i) => `<stop offset="${sky.locations[i]}" stop-color="${c}"/>`).join('');

  const clip = roundBottom
    ? `<rect width="${W}" height="${H}" rx="${R}" ry="${R}"/>`
    : `<path d="M0 ${R} A${R} ${R} 0 0 1 ${R} 0 H${W - R} A${R} ${R} 0 0 1 ${W} ${R} V${H} H0 Z"/>`;

  const stars =
    sky.stars > 0
      ? Array.from({ length: 30 }, (_, i) => i)
          .filter((i) => seeded(i, 7) < sky.stars)
          .map((i) => {
            const r = 0.5 + seeded(i, 3) * 0.9;
            return `<circle cx="${f(seeded(i, 1) * W)}" cy="${f(seeded(i, 2) * H * 0.6)}" r="${f(r)}" fill="#FFFFFF" fill-opacity="${f(0.35 + seeded(i, 4) * 0.6)}"/>`;
          })
          .join('')
      : '';

  // Soft cumulus: feathered puffs with a shaded underside (same shapes as in the app).
  const puffs: [number, number, number, number][] = [[30, 30, 20, 15], [50, 21, 22, 19], [70, 28, 19, 15], [40, 35, 24, 11], [64, 36, 24, 10], [18, 38, 14, 8], [84, 37, 14, 8]];
  const cloud = (x: number, y: number, s: number, o: number) =>
    `<g transform="translate(${f(x)} ${f(y)}) scale(${s})" opacity="${o}">${puffs
      .map(([cx, cy, rx, ry]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#puff)"/>`)
      .join('')}<ellipse cx="52" cy="40" rx="40" ry="8" fill="url(#shade)"/></g>`;
  const clouds = sky.clouds ? cloud(W * 0.46, H * 0.04, 1.1, 0.6) + cloud(W * 0.78, H * 0.36, 0.7, 0.5) : '';

  // The app's mountains, fitted into the bottom band; mist melts them into `ground` when given.
  const band = Math.min(64, H * 0.44);
  const fit = fitLandscape(W, band, H - band);
  const layer = (d: string, fill: string) =>
    `<path transform="translate(${f(fit.x)} ${f(fit.y)}) scale(${fit.scale.toFixed(4)})" fill="${fill}" d="${d}"/>`;
  const hills =
    layer(LANDSCAPE.far, 'url(#far)') +
    `<rect x="0" y="${f(H - band * 0.7)}" width="${W}" height="${f(band * 0.5)}" fill="url(#haze)"/>` +
    layer(LANDSCAPE.mid, 'url(#mid)') +
    layer(LANDSCAPE.near, sky.land[2]) +
    (ground ? `<rect x="0" y="${f(H - band * 0.4)}" width="${W}" height="${f(band * 0.4 + 1)}" fill="url(#mist)"/>` : '');

  // The path across the sky.
  const pad = 16;
  const baseY = base ?? H - band * 0.42;
  const rx = (W - pad * 2) / 2;
  const ry = Math.max(18, Math.min(H * 0.48, rx * 0.7, baseY - top));
  const pt = (p: number) => {
    const th = Math.PI * (1 - p);
    return { x: W / 2 + rx * Math.cos(th), y: baseY - ry * Math.sin(th) };
  };
  const arc = `M ${pad} ${f(baseY)} A ${f(rx)} ${f(ry)} 0 0 1 ${W - pad} ${f(baseY)}`;
  const sun = pt(at);
  const trail = night ? '#E4E5FF' : '#FFFFFF';
  // The travelled part of the path, as its own arc from sunrise to now.
  const travelled =
    at > 0.01 ? `<path d="M ${pad} ${f(baseY)} A ${f(rx)} ${f(ry)} 0 0 1 ${f(sun.x)} ${f(sun.y)}" stroke="${trail}" stroke-width="2.4" stroke-linecap="round" fill="none" stroke-opacity="0.95"/>` : '';

  const dots = markers
    .map((m) => {
      const p = pt(m.at);
      const fill = m.state === 'done' ? '#3CCB8B' : m.state === 'late' ? '#FF6A55' : '#FFFFFF';
      const stroke = m.state === 'open' ? sky.arc : '#FFFFFF';
      return `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="4.6" fill="${fill}" stroke="${stroke}" stroke-width="1.8"/>`;
    })
    .join('');

  const { x: sx, y: sy } = sun;
  const body = night
    ? `<circle cx="${f(sx)}" cy="${f(sy)}" r="26" fill="url(#moonGlow)"/>
       <circle cx="${f(sx)}" cy="${f(sy)}" r="8.5" fill="url(#moonFace)"/>
       <ellipse cx="${f(sx - 2.4)}" cy="${f(sy - 2)}" rx="3.4" ry="2.8" fill="url(#mare)"/>
       <ellipse cx="${f(sx + 2.8)}" cy="${f(sy - 2.9)}" rx="2.2" ry="1.8" fill="url(#mare)"/>
       <ellipse cx="${f(sx + 1.2)}" cy="${f(sy + 2)}" rx="2.9" ry="2.1" fill="url(#mare)"/>
       <circle cx="${f(sx)}" cy="${f(sy)}" r="8.5" fill="url(#moonShadow)"/>`
    : `<circle cx="${f(sx)}" cy="${f(sy)}" r="34" fill="url(#bloom)"/>
       ${[0, 1, 2, 3, 4, 5, 6, 7]
         .map((i) => {
           const a = (i / 8) * Math.PI * 2 + 0.2;
           const len = i % 2 ? 22 : 30;
           const nx = -Math.sin(a) * 1.2;
           const ny = Math.cos(a) * 1.2;
           return `<path d="M${f(sx + nx)} ${f(sy + ny)} L${f(sx + Math.cos(a) * len)} ${f(sy + Math.sin(a) * len)} L${f(sx - nx)} ${f(sy - ny)} Z" fill="#FFFFFF" fill-opacity="0.28"/>`;
         })
         .join('')}
       <ellipse cx="${f(sx)}" cy="${f(sy)}" rx="34" ry="1.4" fill="url(#flare)"/>
       <circle cx="${f(sx)}" cy="${f(sy)}" r="8" fill="url(#disc)"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>
    <radialGradient id="horizon" cx="0.5" cy="1" r="0.75"><stop offset="0" stop-color="${sky.glow}" stop-opacity="${night ? 0.35 : 0.55}"/><stop offset="1" stop-color="${sky.glow}" stop-opacity="0"/></radialGradient>
    <radialGradient id="bloom"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.12" stop-color="#FFF7E2" stop-opacity="0.95"/><stop offset="0.24" stop-color="${sky.sunGlow}" stop-opacity="0.55"/><stop offset="0.5" stop-color="${sky.sunGlow}" stop-opacity="0.16"/><stop offset="1" stop-color="${sky.sunGlow}" stop-opacity="0"/></radialGradient>
    <radialGradient id="flare"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.5"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
    <radialGradient id="disc" cx="0.46" cy="0.44" r="0.55"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="#FFF9E6"/><stop offset="1" stop-color="#FFE6A3"/></radialGradient>
    <radialGradient id="moonGlow"><stop offset="0.2" stop-color="#DDE2FF" stop-opacity="0.5"/><stop offset="0.45" stop-color="#AEB6F5" stop-opacity="0.16"/><stop offset="1" stop-color="#AEB6F5" stop-opacity="0"/></radialGradient>
    <radialGradient id="moonFace" cx="0.44" cy="0.42" r="0.62"><stop offset="0" stop-color="#FBFAF4"/><stop offset="0.7" stop-color="#E9E7DD"/><stop offset="1" stop-color="#C4C2BA"/></radialGradient>
    <radialGradient id="mare"><stop offset="0" stop-color="#8E8C88" stop-opacity="0.5"/><stop offset="1" stop-color="#8E8C88" stop-opacity="0"/></radialGradient>
    <radialGradient id="moonShadow" cx="0.78" cy="0.8" r="0.7"><stop offset="0" stop-color="#141A44" stop-opacity="0.28"/><stop offset="1" stop-color="#141A44" stop-opacity="0"/></radialGradient>
    <linearGradient id="far" x1="0" y1="0" x2="0" y2="1"><stop offset="0.05" stop-color="${sky.land[0]}"/><stop offset="0.75" stop-color="${sky.colors[3]}" stop-opacity="0.95"/></linearGradient>
    <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky.glow}" stop-opacity="0"/><stop offset="0.6" stop-color="${sky.glow}" stop-opacity="${night ? 0.12 : 0.3}"/><stop offset="1" stop-color="${sky.glow}" stop-opacity="0"/></linearGradient>
    <linearGradient id="mid" x1="0" y1="0" x2="0" y2="1"><stop offset="0.35" stop-color="${sky.land[1]}"/><stop offset="1" stop-color="${sky.land[0]}"/></linearGradient>
    ${ground ? `<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ground}" stop-opacity="0"/><stop offset="0.45" stop-color="${ground}" stop-opacity="0.55"/><stop offset="1" stop-color="${ground}"/></linearGradient>` : ''}
    ${sky.clouds ? `<radialGradient id="puff" cx="0.5" cy="0.42" r="0.5"><stop offset="0" stop-color="${sky.clouds[0]}"/><stop offset="0.62" stop-color="${sky.clouds[0]}" stop-opacity="0.92"/><stop offset="1" stop-color="${sky.clouds[0]}" stop-opacity="0"/></radialGradient><radialGradient id="shade"><stop offset="0" stop-color="${sky.clouds[1]}" stop-opacity="0.55"/><stop offset="1" stop-color="${sky.clouds[1]}" stop-opacity="0"/></radialGradient>` : ''}
    <clipPath id="frame">${clip}</clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    <rect width="${W}" height="${H}" fill="url(#horizon)"/>
    ${stars}${clouds}${hills}
    <path d="${arc}" stroke="${sky.arc}" stroke-opacity="0.55" stroke-width="1.3" stroke-dasharray="2 5" stroke-linecap="round" fill="none"/>
    ${travelled}${dots}${body}
  </g>
</svg>`;
}

/** A round checkbox for a widget row. */
export function checkArt(size: number, state: 'open' | 'done', ring: string, fill: string) {
  const c = size / 2;
  const r = c - 1.5;
  return state === 'done'
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${c}" cy="${c}" r="${r + 1}" fill="${fill}"/><path d="M${f(size * 0.3)} ${f(size * 0.52)} l${f(size * 0.13)} ${f(size * 0.13)} l${f(size * 0.27)} ${f(-size * 0.28)}" stroke="#FFFFFF" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${ring}" stroke-width="2"/></svg>`;
}

/** A progress ring around the streak sun, for the small widget. */
export function streakArt(size: number, progress: number, phase: Phase) {
  const sky = SKY[phase];
  const c = size / 2;
  const r = c * 0.74;
  const circ = 2 * Math.PI * r;
  const stops = sky.colors.map((col, i) => `<stop offset="${sky.locations[i]}" stop-color="${col}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient>
    <radialGradient id="glow"><stop offset="0.35" stop-color="#FFD65A" stop-opacity="0.6"/><stop offset="1" stop-color="#FFD65A" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bg)"/>
  <circle cx="${c}" cy="${c}" r="${r * 0.95}" fill="url(#glow)"/>
  <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#FFFFFF" stroke-opacity="0.22" stroke-width="5"/>
  ${progress > 0.001 ? `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#FFC21A" stroke-width="5" stroke-linecap="round" stroke-dasharray="${f(circ * progress)} ${f(circ)}" transform="rotate(-90 ${c} ${c})"/>` : ''}
  <circle cx="${c}" cy="${c}" r="${r * 0.58}" fill="#FFD34D" stroke="#FFF4C8" stroke-width="2"/>
</svg>`;
}
