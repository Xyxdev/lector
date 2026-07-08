# Play Store Release Checklist

## Build

- Generate a signed Android App Bundle (AAB).
- Confirm package name: `com.rezlector.app`.
- Confirm version code and version name are incremented.
- Run the app on a physical Android device.
- Confirm Google Play Billing works only from a Play Store/internal testing install.

## Store Listing

- Complete app name, short description, and full description.
- Upload screenshots for phone and tablet if required.
- Upload app icon and feature graphic.
- Add privacy policy URL.
- Complete Data Safety.
- Declare whether the app shows ads.
- Complete content rating.
- Select countries and regions.
- Set pricing and availability.

## Subscription

- Create subscription product `premium_monthly`.
- Create and activate a monthly base plan.
- Configure price and countries.
- Make sure the product is active before testing.
- Confirm the paywall shows price and renewal terms from Google Play.
- Confirm no hardcoded price is displayed in production.

## Internal Testing

- Upload signed AAB to Internal Testing.
- Add tester Gmail accounts.
- Publish internal test release.
- Send/accept opt-in link.
- Install from Google Play with tester account.
- Test purchase success.
- Test purchase cancellation.
- Test restore purchase.
- Test subscription cancellation from Google Play.
- Reopen app and confirm premium is removed after Google reports no active subscription.
- Test network/Billing unavailable messages.

## Review Readiness

- Include reviewer instructions if any premium functionality is blocked.
- Explain that premium uses Google Play Billing.
- Confirm digital subscription uses Google Play Billing only.
- Confirm there is no external payment method.
- Confirm privacy policy mentions local storage and purchases.
- Confirm ads declaration matches app behavior.

## Final Security Notes

- Do not trust local storage as the only entitlement source.
- Validate `purchaseToken` on a backend for stronger production security.
- Do not commit service account keys or API secrets.
