import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { SplashScreen } from '@capacitor/splash-screen';

const isNative = Capacitor.isNativePlatform();

if (isNative) {
  document.documentElement.classList.add('capacitor-native');
  SplashScreen.hide().catch(() => {});
}

function isShareCancel(err) {
  return err?.name === 'AbortError' || /cancel/i.test(String(err?.message || err));
}

async function writeTextFile(directory, fileName, text) {
  const written = await Filesystem.writeFile({
    path: fileName,
    data: text,
    directory,
    encoding: Encoding.UTF8,
  });
  return written.uri || (await Filesystem.getUri({ path: fileName, directory })).uri;
}

async function shareFileUri(fileName, fileUri) {
  await Share.share({
    title: fileName,
    files: [fileUri],
  });
}

async function pickContactNative() {
  try {
    const { Contacts } = await import('@capacitor/contacts');
    const contact = await Contacts.pickContact();
    const given = contact?.name?.givenName || '';
    const family = contact?.name?.familyName || '';
    const structured = [given, family].filter(Boolean).join(' ').trim();
    const name = (contact?.displayName || structured || contact?.nickname || '').trim();
    const phone = contact?.phoneNumbers?.[0]?.value || '';
    const email = contact?.emails?.[0]?.value || '';
    const note = contact?.note || '';
    return { name, phone, email, note };
  } catch (err) {
    if (isShareCancel(err)) return null;
    throw err;
  }
}

window.BoutiqueNative = {
  isNative,

  hapticLight() {
    if (!isNative) return Promise.resolve();
    return Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  },

  async shareText({ title, text, url } = {}) {
    if (!isNative) return false;
    const options = {
      title: title || 'Boutique Journal',
      text: text || '',
    };
    if (url) options.url = url;
    if (!options.text && !options.url) throw new Error('Nothing to share');
    try {
      await Share.share(options);
      return true;
    } catch (err) {
      if (isShareCancel(err)) return false;
      throw err;
    }
  },

  async saveBackupFile(jsonText, fileName, { share = true } = {}) {
    if (!isNative) return null;
    const docsUri = await writeTextFile(Directory.Documents, fileName, jsonText);

    let cacheUri = '';
    try {
      cacheUri = await writeTextFile(Directory.Cache, fileName, jsonText);
    } catch {
      /* best-effort */
    }

    if (share) {
      try {
        await shareFileUri(fileName, docsUri);
        return { uri: docsUri, fileName, shared: true };
      } catch (err) {
        if (isShareCancel(err)) return { uri: docsUri, fileName, shared: false };
        if (cacheUri) {
          try {
            await shareFileUri(fileName, cacheUri);
            return { uri: cacheUri, fileName, shared: true };
          } catch (err2) {
            if (isShareCancel(err2)) return { uri: docsUri, fileName, shared: false };
            throw err2;
          }
        }
        throw err;
      }
    }

    return { uri: docsUri, fileName, shared: false };
  },

  async saveAndShareTextFile(text, fileName, { share = true } = {}) {
    if (!isNative) return null;
    const uri = await writeTextFile(Directory.Cache, fileName, text);
    if (share) {
      try {
        await shareFileUri(fileName, uri);
        return { uri, fileName, shared: true };
      } catch (err) {
        if (isShareCancel(err)) return { uri, fileName, shared: false };
        throw err;
      }
    }
    return { uri, fileName, shared: false };
  },

  pickContact() {
    if (!isNative) return Promise.resolve(null);
    return pickContactNative();
  },

  onDeepLink(listener) {
    if (!isNative || typeof listener !== 'function') return () => {};
    const listeners = new Set([listener]);
    const emit = (url) => {
      if (!url) return;
      listeners.forEach((fn) => {
        try {
          fn(String(url));
        } catch (err) {
          console.warn('Deep link handler failed', err);
        }
      });
    };
    App.addListener('appUrlOpen', (event) => emit(event?.url)).catch(() => {});
    App.getLaunchUrl()
      .then((result) => emit(result?.url))
      .catch(() => {});
    return () => listeners.delete(listener);
  },
};
