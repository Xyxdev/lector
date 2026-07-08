# Play Store Release Checklist

## 1. Local Setup

- Install Node dependencies: `npm install`.
- Install Android Studio or a JDK 17/21 compatible with Android Gradle Plugin.
- Confirm Java is modern enough: `java -version`.
- Run app tests: `npm test`.
- Sync Capacitor: `npm run android:sync`.
- Build debug APK: `npm run android:debug`.

## 2. Release Signing

- Create a local release keystore:

```powershell
keytool -genkeypair -v -keystore rez-lector-release.jks -alias rezlector -keyalg RSA -keysize 2048 -validity 10000
```

- Create `android/keystore.properties` locally:

```properties
storeFile=../rez-lector-release.jks
storePassword=TU_PASSWORD
keyAlias=rezlector
keyPassword=TU_PASSWORD
```

- Keep `.jks`, `.keystore`, and `keystore.properties` out of git.
- Generate release AAB: `npm run android:bundle`.
- AAB output: `android/app/build/outputs/bundle/release/app-release.aab`.

## 3. Play Console App

- Create or finish Play Console account setup.
- Complete identity verification and Google Payments Profile if Google requires it.
- Create the app in Play Console.
- Package name: `com.rezlector.app`.
- App name: `Rez Lector`.
- Upload icon, feature graphic, screenshots, short description, and full description.
- Publish `PRIVACY_POLICY.md` on a public HTTPS URL and paste it in Play Console.
- Complete Content Rating.
- Complete App Access. The app has no login or restricted account area.
- Complete Data Safety:
  - No analytics SDKs.
  - No tracking SDKs.
  - No real advertising SDKs.
  - No cloud sync.
  - Books/progress/preferences/stats are stored locally.
  - Google Play Billing handles the monthly Premium subscription.
  - The app may receive `productId`, `purchaseToken`, `packageName`, and subscription status.

## 4. Subscription

- Go to Monetize > Products > Subscriptions.
- Create Product ID `premium_monthly`.
- Create a monthly base plan.
- Configure countries and price.
- Activate the subscription and base plan.
- Add license testers in Play Console.
- Make sure testers install from Google Play Internal Testing, not from a side-loaded APK, when testing real Billing.

## 5. Internal Testing

- Upload signed AAB to Internal Testing.
- Add tester Gmail accounts.
- Publish the internal test release.
- Share the opt-in link.
- Install the app from the opt-in link with a tester account.
- Test user without Premium.
- Test successful purchase.
- Test cancelled purchase.
- Test pending purchase where available.
- Test restore purchase.
- Cancel subscription in Google Play and verify Premium is removed when Google reports no active subscription.
- Confirm Premium unlocks more books, speed above 250 ppm, 2-3 word grouping, stats, and accent colors.
- Confirm no fake ad banners or fake interstitials appear.

## 6. New Personal Play Console Accounts

New personal Play Console accounts may need closed testing with 12 testers for
14 days before production access. Follow the current Play Console requirement
shown on the account.

## 7. Production Checklist

- Internal Testing purchase/restore/cancel flows pass.
- Privacy Policy URL is live.
- Support email is `sramirezerer@gmail.com`.
- Data Safety matches the app behavior.
- Content Rating is complete.
- App Access is complete.
- Subscription `premium_monthly` is active.
- Release signing credentials are stored securely outside git.
- Version code is increased for every future Play upload.
