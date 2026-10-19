import { FlexWidget, OverlapWidget, SvgWidget, TextWidget, type ColorProp } from 'react-native-android-widget';

import type { WidgetState } from './data';
import { checkArt, skyArt, streakArt } from './skyArt';

const DISPLAY = 'BricolageGrotesque_800ExtraBold';
const SEMI = 'Figtree_600SemiBold';
const BOLD = 'Figtree_700Bold';

const PALETTE = {
  light: { panel: '#FFFFFF', ink: '#17143A', muted: '#646089', faint: '#A3A0C2', line: '#E0E1EE', ring: '#B9B6D6' },
  dark: { panel: '#1A1740', ink: '#F1EFFF', muted: '#A19DC9', faint: '#6A6696', line: '#2A2756', ring: '#5E5A92' },
} as const;

const SOL = '#FFC21A';
const SOL_INK = '#17143A';
const LEAF = '#1C9A63';
const EMBER = '#E5432E';
const AMBER = '#D99500';
const RADIUS = 26;

export const ADD_URI = 'sundial://add';
export const CALENDAR_URI = 'sundial://calendar';
export const taskUri = (id: string) => `sundial://task/${id}`;

function headline(s: WidgetState) {
  if (!s.onboarded) return 'Open Sundial to start';
  if (s.total === 0) return 'Nothing planned';
  if (s.done === s.total) return `All ${s.total} done`;
  return `${s.done} of ${s.total} done`;
}

function StreakPill({ streak }: { streak: number }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: CALENDAR_URI }}
      accessibilityLabel={`${streak} day streak`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.22)',
      }}
    >
      <TextWidget text="☀" style={{ fontSize: 11, color: '#FFD65A', marginRight: 4 }} />
      <TextWidget text={`${streak}`} style={{ fontSize: 12, fontFamily: BOLD, color: '#FFFFFF' }} />
    </FlexWidget>
  );
}

function PlusButton({ size }: { size: number }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: ADD_URI }}
      accessibilityLabel="Add a task"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: SOL, alignItems: 'center', justifyContent: 'center' }}
    >
      <TextWidget text="+" style={{ fontSize: size * 0.56, fontFamily: BOLD, color: SOL_INK }} />
    </FlexWidget>
  );
}

/** Sky header content: date, streak, and the day in one line. */
function SkyText({ s, big }: { s: WidgetState; big: boolean }) {
  return (
    <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', padding: 14 }}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
        <TextWidget text={s.date} maxLines={1} truncate="END" style={{ fontSize: 12, fontFamily: SEMI, color: 'rgba(255, 255, 255, 0.86)', flex: 1 } as never} />
        {s.streak > 0 && <StreakPill streak={s.streak} />}
      </FlexWidget>
      <TextWidget
        text={headline(s)}
        maxLines={1}
        style={{
          fontSize: big ? 24 : 21,
          fontFamily: DISPLAY,
          color: '#FFFFFF',
          letterSpacing: -0.02,
          marginTop: 2,
          textShadowColor: 'rgba(10, 8, 40, 0.25)',
          textShadowRadius: 6,
          textShadowOffset: { width: 0, height: 1 },
        }}
      />
    </FlexWidget>
  );
}

/** The main home-screen widget: a window onto today's sky, with the next tasks under it. */
export function SundialWidget({ s, width, height, dark }: { s: WidgetState; width: number; height: number; dark: boolean }) {
  const p = dark ? PALETTE.dark : PALETTE.light;
  const compact = height < 190;
  const open = s.rows.filter((r) => !r.done);

  if (compact) {
    const next = open[0];
    return (
      <OverlapWidget style={{ width: 'match_parent', height: 'match_parent', borderRadius: RADIUS, overflow: 'hidden' }}>
        <SvgWidget
          svg={skyArt({ width, height, phase: s.phase, at: s.at, night: s.night, markers: s.markers, roundBottom: true, radius: RADIUS, top: 62, base: height - 58 })}
          style={{ width, height }}
          clickAction="OPEN_APP"
        />
        <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', height: 'match_parent' }}>
          <SkyText s={s} big={false} />
          <FlexWidget style={{ flex: 1 }} />
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', paddingHorizontal: 10, paddingBottom: 10 }}>
            <FlexWidget
              clickAction="OPEN_URI"
              clickActionData={{ uri: next ? taskUri(next.id) : ADD_URI }}
              style={{
                flex: 1,
                height: 38,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                borderRadius: 14,
                backgroundColor: 'rgba(23, 20, 58, 0.55)',
                marginRight: 8,
              }}
            >
              <TextWidget text={next ? 'Next' : '☾'} style={{ fontSize: 11.5, fontFamily: BOLD, color: '#FFD65A', marginRight: 7 }} />
              <TextWidget
                text={next ? next.title : s.total ? 'Today is clear. Nice.' : 'Plan something for today'}
                maxLines={1}
                truncate="END"
                style={{ fontSize: 13, fontFamily: SEMI, color: '#FFFFFF', flex: 1 } as never}
              />
              {next?.time && (
                <TextWidget text={next.time} style={{ fontSize: 12, fontFamily: BOLD, color: next.late ? '#FF8A78' : 'rgba(255, 255, 255, 0.8)', marginLeft: 6 }} />
              )}
            </FlexWidget>
            <PlusButton size={38} />
          </FlexWidget>
        </FlexWidget>
      </OverlapWidget>
    );
  }

  const skyH = Math.round(Math.min(150, Math.max(128, height * 0.42)));
  const rowH = 40;
  const room = Math.max(1, Math.floor((height - skyH - 62) / rowH));
  const rows = s.rows.slice(0, room);
  const more = s.rows.length - rows.length;

  return (
    <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', height: 'match_parent', borderRadius: RADIUS, backgroundColor: p.panel as ColorProp, overflow: 'hidden' }}>
      <OverlapWidget style={{ width: 'match_parent', height: skyH }}>
        <SvgWidget
          svg={skyArt({ width, height: skyH, phase: s.phase, at: s.at, night: s.night, markers: s.markers, roundBottom: false, radius: RADIUS, top: 68, ground: p.panel })}
          style={{ width, height: skyH }}
          clickAction="OPEN_APP"
        />
        <SkyText s={s} big />
      </OverlapWidget>

      <FlexWidget style={{ flexDirection: 'column', flex: 1, width: 'match_parent', paddingHorizontal: 12, paddingTop: 6 }}>
        {rows.length === 0 ? (
          <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: ADD_URI }} style={{ flex: 1, width: 'match_parent', alignItems: 'center', justifyContent: 'center' }}>
            <TextWidget text="Nothing planned for today" style={{ fontSize: 14, fontFamily: BOLD, color: p.ink as ColorProp }} />
            <TextWidget text="Tap + to add your first task" style={{ fontSize: 12.5, fontFamily: SEMI, color: p.muted as ColorProp, marginTop: 2 }} />
          </FlexWidget>
        ) : (
          rows.map((r) => (
            <FlexWidget key={r.id} style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', height: rowH }}>
              <FlexWidget
                clickAction="TOGGLE"
                clickActionData={{ id: r.id }}
                accessibilityLabel={`${r.done ? 'Mark not done' : 'Mark done'}: ${r.title}`}
                style={{ width: 36, height: rowH, alignItems: 'center', justifyContent: 'center' }}
              >
                <SvgWidget
                  svg={checkArt(22, r.done ? 'done' : 'open', r.priority === 'high' ? AMBER : r.priority === 'low' ? p.faint : p.ring, LEAF)}
                  style={{ width: 22, height: 22 }}
                />
              </FlexWidget>
              <FlexWidget
                clickAction="OPEN_URI"
                clickActionData={{ uri: taskUri(r.id) }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', height: rowH, paddingLeft: 4 }}
              >
                <TextWidget
                  text={r.title}
                  maxLines={1}
                  truncate="END"
                  style={{ fontSize: 14, fontFamily: SEMI, color: (r.done ? p.faint : p.ink) as ColorProp, flex: 1 } as never}
                />
                {r.time && (
                  <TextWidget
                    text={r.late ? `${r.time} · late` : r.time}
                    style={{ fontSize: 12.5, fontFamily: BOLD, color: (r.done ? p.faint : r.late ? EMBER : p.muted) as ColorProp, marginLeft: 8 }}
                  />
                )}
              </FlexWidget>
            </FlexWidget>
          ))
        )}
      </FlexWidget>

      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', paddingHorizontal: 12, paddingBottom: 12, paddingTop: 4 }}>
        <TextWidget
          text={more > 0 ? `+${more} more in the app` : ''}
          clickAction="OPEN_APP"
          style={{ flex: 1, fontSize: 12, fontFamily: SEMI, color: p.muted as ColorProp } as never}
        />
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: ADD_URI }}
          accessibilityLabel="Add a task"
          style={{ flexDirection: 'row', alignItems: 'center', height: 38, paddingLeft: 6, paddingRight: 14, borderRadius: 19, backgroundColor: SOL }}
        >
          <FlexWidget style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: SOL_INK, alignItems: 'center', justifyContent: 'center', marginRight: 7 }}>
            <TextWidget text="+" style={{ fontSize: 16, fontFamily: BOLD, color: SOL }} />
          </FlexWidget>
          <TextWidget text="Add a task" style={{ fontSize: 13.5, fontFamily: BOLD, color: SOL_INK }} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

/** Small square widget: your streak inside a sun, ringed by today's progress. */
export function StreakWidget({ s, size }: { s: WidgetState; size: number }) {
  return (
    <OverlapWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: CALENDAR_URI }}
      accessibilityLabel={`${s.streak} day streak. ${s.done} of ${s.total} done today.`}
      style={{ width: 'match_parent', height: 'match_parent' }}
    >
      <SvgWidget svg={streakArt(size, s.total ? s.done / s.total : 0, s.phase)} style={{ width: size, height: size }} />
      <FlexWidget style={{ width: size, height: size, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <TextWidget text={`${s.streak}`} style={{ fontSize: size * 0.2, fontFamily: DISPLAY, color: SOL_INK }} />
        <TextWidget text={s.streak === 1 ? 'day' : 'days'} style={{ fontSize: size * 0.075, fontFamily: BOLD, color: SOL_INK, marginTop: -2 }} />
      </FlexWidget>
      <FlexWidget style={{ width: size, height: size, flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: size * 0.03 }}>
        <TextWidget
          text={s.total ? `${s.done}/${s.total} today` : 'streak'}
          style={{ fontSize: size * 0.07, fontFamily: BOLD, color: 'rgba(255, 255, 255, 0.92)' }}
        />
      </FlexWidget>
    </OverlapWidget>
  );
}
