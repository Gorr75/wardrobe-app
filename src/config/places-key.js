// Bundle id sent as X-Ios-Bundle-Identifier. Must match the iOS app restriction on the key.
export const IOS_BUNDLE_ID = 'se.jansson.boutiquejournal';

// Empty in git. ci_scripts/stamp_places_key.sh replaces this line when
// Xcode Cloud provides GOOGLE_PLACES_API_KEY. If the secret is absent, the
// empty string stays and the app skips Google Places.
export const GOOGLE_PLACES_API_KEY = '';
