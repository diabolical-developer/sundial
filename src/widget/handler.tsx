import type { WidgetInfo, WidgetTaskHandlerProps } from 'react-native-android-widget';

import { loadWidgetState, toggleFromWidget } from './data';
import { StreakWidget, SundialWidget } from './SundialWidget';

export const WIDGETS = { today: 'SundialToday', streak: 'SundialStreak' } as const;

/** Builds the widget for its current size, in both light and dark versions. */
export async function renderFor(info: Pick<WidgetInfo, 'widgetName' | 'width' | 'height'>) {
  const s = await loadWidgetState();
  if (info.widgetName === WIDGETS.streak) {
    return <StreakWidget s={s} size={Math.min(info.width, info.height)} />;
  }
  return {
    light: <SundialWidget s={s} width={info.width} height={info.height} dark={false} />,
    dark: <SundialWidget s={s} width={info.width} height={info.height} dark />,
  };
}

/** Runs in the background whenever Android asks a widget to draw, or someone taps it. */
export async function widgetTaskHandler({ widgetInfo, widgetAction, clickAction, clickActionData, renderWidget }: WidgetTaskHandlerProps) {
  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      renderWidget(await renderFor(widgetInfo));
      break;
    case 'WIDGET_CLICK':
      if (clickAction === 'TOGGLE' && typeof clickActionData?.id === 'string') {
        await toggleFromWidget(clickActionData.id);
        renderWidget(await renderFor(widgetInfo));
        // Keep the other widget (if it's on the home screen too) in step.
        (require('./refresh') as typeof import('./refresh')).refreshWidgets();
      }
      break;
    default:
      break;
  }
}
