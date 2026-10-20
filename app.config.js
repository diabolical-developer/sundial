// Extends app.json. Lets the web build live under a sub-path: GitHub Pages serves this repo at
// https://<user>.github.io/sundial/, so the Pages workflow sets EXPO_BASE_URL=/sundial.
// Local runs, the Android app and root-domain hosts build at "/" (no variable set).
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...(config.experiments ?? {}),
    baseUrl: process.env.EXPO_BASE_URL ?? '',
  },
});
