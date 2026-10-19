import { registerRootComponent } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import App from './App';

// Works for Android (Expo Go / native build) and the web build.
registerRootComponent(App);

// Home-screen widgets: installed Android builds only (Expo Go and the web build don't have the native part).
// Loaded lazily so the web build never touches them.
const widgetsAvailable = Platform.OS === 'android' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
if (widgetsAvailable) {
  try {
    const { registerWidgetTaskHandler } = require('react-native-android-widget') as typeof import('react-native-android-widget');
    const { widgetTaskHandler } = require('./src/widget/handler') as typeof import('./src/widget/handler');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch {
    // Widgets are a bonus; the app runs without them.
  }
}
