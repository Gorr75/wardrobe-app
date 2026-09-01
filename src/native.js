export function isNativeApp() {
  return Boolean(window.BoutiqueNative?.isNative);
}

export function hapticLight() {
  return window.BoutiqueNative?.hapticLight?.() ?? Promise.resolve();
}
