# Play Store Release Checklist

## Local Build

- Run `npm install`.
- Run `npm test`.
- Run `npm run android:sync`.
- Run `npm run android:debug`.
- Configure release signing locally.
- Run `npm run android:bundle`.
- Confirm package name is `com.rezlector.app`.
- Confirm visible app name is `Rez Lector`.
- Confirm `versionCode 1` and `versionName 1.0.0` for the first release.
- Confirm `minSdk 24`, `compileSdk 36`, and `targetSdk 36`.

## Release Signing

- Create a local release keystore with `keytool`.
- Create `android/keystore.properties` locally.
- Never commit `.jks`, `.keystore`, `keystore.properties`, service accounts, tokens, or passwords.
- Store release credentials in a secure password manager.

## Play Console App Setup

- Create the Android app in Play Console.
- Package name: `com.rezlector.app`.
- Upload app icon and feature graphic.
- Add phone screenshots and tablet screenshots if required.
- Add short description and full description.
- Add public privacy policy URL.
- Complete Content Rating.
- Complete Data Safety.
- Declare no real ads until an ad SDK is actually integrated.
- Declare Google Play Billing subscription for digital Premium features.

## Subscription Setup

- Go to Monetize > Products > Subscriptions.
- Create Product ID `premium_monthly`.
- Create a monthly base plan.
- Configure price, countries, and renewal terms.
- Activate the subscription and base plan.
- Confirm the product is active before purchase tests.

## Internal Testing

- Upload the signed AAB to Internal Testing.
- Add tester Gmail accounts.
- Publish the internal test release.
- Open the opt-in link with a tester account.
- Install from Google Play, not by side-loading, for real Billing tests.
- Test user without Premium.
- Test successful purchase.
- Test user-cancelled purchase.
- Test pending purchase if available in your test setup.
- Test restore purchase.
- Cancel subscription from Google Play and verify Premium is removed when Google reports no active subscription.
- Confirm ad placeholders are hidden for Premium.
- Confirm Premium unlocks more books, speed above 250 ppm, 2-3 word grouping, stats, and accent colors.

## Privacy And Data Safety

- Publish `PRIVACY_POLICY.md` at a public HTTPS URL.
- Replace the TODO support email before production.
- Data Safety should match the app: no analytics, no tracking SDKs, no real ads, local book storage only, Google Play Billing for purchases.
- Explain that Google Play processes payments and the app may receive `productId`, `purchaseToken`, and `packageName`.
- Confirm no external payment links or external subscription purchase flows exist.

## Manifest And Permissions

- Keep `INTERNET` for Billing/web support.
- Keep `VIBRATE` only because the app uses tap feedback.
- Do not add storage, location, camera, microphone, contacts, or dangerous permissions.
- Keep `android:usesCleartextTraffic="false"`.
- Keep Capacitor `allowMixedContent: false`.
- Use Android system picker for file import.

## New Play Console Personal Accounts

If this is a new personal Play Console account, Google may require closed
testing with 12 testers for 14 days before production access. Plan this before
launch.

## Production Readiness

Internal Testing: ready after Play Console app, signing, subscription, and privacy URL are configured.

Production: not ready until the privacy URL/support email are live, release
signing is secured, Play Console review forms are complete, subscription tests
pass, and ideally backend purchase-token validation is implemented.
