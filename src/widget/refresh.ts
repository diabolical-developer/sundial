import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

const available = Platform.OS === 'android' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

let timer: ReturnType<typeof setTimeout> | null = null;

/** Redraw the home-screen widgets after the app changes something. Android only; a no-op elsewhere. */
export function refreshWidgets() {
  if (!available) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    try {
      // Loaded lazily so the web build never touches the native widget module.
      const { requestWidgetUpdate } = require('react-native-android-widget') as typeof import('react-native-android-widget');
      const { renderFor, WIDGETS } = require('./handler') as typeof import('./handler');
      for (const widgetName of Object.values(WIDGETS)) {
        requestWidgetUpdate({ widgetName, renderWidget: (info) => renderFor(info) }).catch(() => {});
      }
    } catch {
      // No widget support in this build.
    }
  }, 400);
}
