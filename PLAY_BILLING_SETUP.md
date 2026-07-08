# Google Play Billing Setup

Rez Lector is a vanilla HTML/CSS/JavaScript app packaged with Capacitor 8.
This repository now includes a generated Android project in `android/` and a
native Capacitor plugin for Google Play Billing.

## Product

Subscription Product ID:

```text
premium_monthly
```

The same ID is used in:

- `www/js/billing.js`
- `android/app/src/main/java/com/rezlector/app/billing/GooglePlayBillingPlugin.kt`
- Play Console subscription setup

## Native Plugin

Capacitor plugin name:

```text
GooglePlayBilling
```

Android implementation:

```text
android/app/src/main/java/com/rezlector/app/billing/GooglePlayBillingPlugin.kt
```

Registered from:

```text
android/app/src/main/java/com/rezlector/app/MainActivity.java
```

Gradle dependency:

```gradle
implementation "com.android.billingclient:billing-ktx:9.1.0"
```

The plugin exposes:

```ts
initialize({ productId })
getProductDetails({ productId })
queryPurchases({ productId })
purchase({ productId, offerToken })
openManageSubscriptions({ productId })
```

It handles successful purchases, user cancellation, missing products, already
owned items, restore/query, acknowledgement, and pending purchases. Pending,
cancelled, invalid, or non-matching purchases do not unlock Premium.

## JavaScript Bridge

The web bridge lives at:

```text
www/js/billing.js
```

It exposes `window.Billing`, calls `window.Capacitor.Plugins.GooglePlayBilling`,
and only writes Premium state through:

```js
Storage.setPremiumFromBilling(true_or_false)
```

Local storage is only a UX cache. It is not a strong entitlement source.
Production apps should validate `purchaseToken`, `productId`, and `packageName`
on a backend using the Google Play Developer API.

## Build Commands

Install dependencies:

```bash
npm install
```

Sync web assets and native project:

```bash
npm run android:sync
```

Build debug APK:

```bash
npm run android:debug
```

Build release AAB:

```bash
npm run android:bundle
```

Open Android Studio:

```bash
npm run android:open
```

## Release Signing

Do not commit keystores or passwords.

Create a local keystore:

```bash
keytool -genkeypair -v -keystore rez-lector-release.jks -alias rezlector -keyalg RSA -keysize 2048 -validity 10000
```

Create `android/keystore.properties` locally:

```properties
storeFile=../rez-lector-release.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=rezlector
keyPassword=YOUR_KEY_PASSWORD
```

The repo ignores `keystore.properties`, `.jks`, and `.keystore` files.

## Play Console Subscription

1. Create the app with package `com.rezlector.app`.
2. Upload an AAB to Internal Testing.
3. Go to Monetize > Products > Subscriptions.
4. Create subscription product `premium_monthly`.
5. Create and activate a monthly base plan.
6. Configure price and countries.
7. Activate the subscription and base plan.
8. Install the app from Google Play Internal Testing with a tester account.
9. Confirm the paywall loads the Google Play price.
10. Test purchase success, cancellation, restore, pending state, and no-premium state.

## Production Notes

- Publish `PRIVACY_POLICY.md` at a public HTTPS URL.
- Support email is `sramirezerer@gmail.com`.
- Configure Play Console subscription `premium_monthly`.
- Configure release signing locally or in CI without committing secrets.
- Add backend purchase-token validation before scaling production usage.
