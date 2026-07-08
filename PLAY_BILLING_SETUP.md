# Google Play Billing Setup

This project is currently a vanilla HTML/CSS/JavaScript app packaged with Capacitor 8. There is no committed `android/` Gradle project yet. The APK source does not ship a JavaScript Billing bridge until the native Capacitor plugin exists, because Windows Defender flagged the temporary web bridge inside debug APK artifacts.

## Product ID

The subscription Product ID used by the app is:

```text
premium_monthly
```

When the native plugin is integrated, keep the same ID in the Android plugin/template and any bridge code you add.

## Current App Integration

The paywall is prepared to call a global `Billing` bridge when it exists. Until the native plugin is installed, it shows a clear "Google Play Billing unavailable" message instead of unlocking premium locally.

- `Billing.refreshEntitlement()` queries active Google Play purchases.
- `Billing.purchasePremium()` launches the purchase flow.
- `Billing.restorePurchases()` restores active subscriptions.
- `Billing.openManageSubscriptions()` opens Google Play subscription management.

Local storage is only a cache for UX. It is not treated as the source of truth.

For serious production, validate `purchaseToken` on a backend using the Google Play Developer API. The client-side entitlement check is useful, but server validation is stronger.

## Native Plugin Contract

The JavaScript layer expects this Capacitor plugin:

```js
window.Capacitor.Plugins.GooglePlayBilling
```

Required methods:

```ts
initialize({ productId })
getProductDetails({ productId })
queryPurchases({ productId })
purchase({ productId, offerToken })
openManageSubscriptions({ productId })
```

Expected product details response:

```json
{
  "productId": "premium_monthly",
  "formattedPrice": "$4.99",
  "billingPeriod": "month",
  "offerToken": "..."
}
```

Expected entitlement response:

```json
{
  "premium": true,
  "productId": "premium_monthly",
  "purchaseToken": "...",
  "acknowledged": true,
  "message": "Subscription active."
}
```

## Create Android Project

From this project folder:

```bash
npm install
npx cap add android
npx cap sync android
```

Then implement the native Capacitor plugin in the generated Android project using the official dependency:

```gradle
implementation "com.android.billingclient:billing-ktx:<latest-stable-compatible-version>"
```

Use the latest stable Google Play Billing version compatible with the generated Gradle/AGP setup.

This package includes a Kotlin starting point here:

```text
android-billing-template/GooglePlayBillingPlugin.kt
```

After `android/` exists, copy it into a package such as:

```text
android/app/src/main/java/com/rezlector/app/billing/GooglePlayBillingPlugin.kt
```

Then register the plugin from the generated MainActivity if Capacitor does not auto-discover it. The plugin uses the native name expected by the web app:

```text
GooglePlayBilling
```

## Play Console Subscription Setup

1. Open Google Play Console.
2. Create the app with package name from `capacitor.config.json`:

```text
com.rezlector.app
```

3. Go to Monetize > Products > Subscriptions.
4. Create a subscription with Product ID:

```text
premium_monthly
```

5. Create an active monthly base plan.
6. Add price and countries.
7. Activate the subscription and base plan.
8. Make sure the app is uploaded to Internal Testing before testing Billing.

## Internal Testing

1. Generate a signed AAB.
2. Upload it to Internal Testing.
3. Add tester Gmail accounts.
4. Publish the internal testing release.
5. Open the opt-in test link with the tester account.
6. Install the app from Google Play, not from a direct APK, when testing real purchases.
7. Open the premium paywall.
8. Confirm the price is loaded from Google Play.
9. Tap Activate Premium.
10. Test successful purchase, cancelled purchase, pending purchase if available, and restore.

## Restore Purchases

The Restore purchase button calls `queryPurchasesAsync` through the native plugin. It should:

- Find active subscriptions.
- Acknowledge purchases when needed.
- Update premium state if valid.
- Show a clear message if nothing active is found.

## Manage Subscription

The app opens:

```text
https://play.google.com/store/account/subscriptions
```

The native plugin should prefer an Android intent to the same Google Play subscription management screen.

## Backend Validation TODO

Before production at scale, add backend validation:

- Send `purchaseToken`.
- Send `productId`.
- Send `packageName`.
- Send `userId` if the app later adds accounts.
- Verify with Google Play Developer API.
- Return entitlement status to the app.

Do not store API secrets in the app.
