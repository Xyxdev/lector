package com.rezlector.app.billing

import android.content.Intent
import android.net.Uri
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "GooglePlayBilling")
class GooglePlayBillingPlugin : Plugin(), PurchasesUpdatedListener {
    private var billingClient: BillingClient? = null
    private var productDetails: ProductDetails? = null
    private var pendingPurchaseCall: PluginCall? = null
    private var currentProductId: String = PRODUCT_ID

    @PluginMethod
    fun initialize(call: PluginCall) {
        currentProductId = call.getString("productId") ?: PRODUCT_ID
        connectBillingClient(
            onReady = { call.resolve(JSObject().put("ready", true).put("productId", currentProductId)) },
            onError = { result -> call.reject(messageFor(result), codeFor(result)) }
        )
    }

    @PluginMethod
    fun getProductDetails(call: PluginCall) {
        currentProductId = call.getString("productId") ?: PRODUCT_ID
        ensureReady(call) {
            val product = QueryProductDetailsParams.Product.newBuilder()
                .setProductId(currentProductId)
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
            val params = QueryProductDetailsParams.newBuilder()
                .setProductList(listOf(product))
                .build()

            billingClient?.queryProductDetailsAsync(params) { result, queryResult ->
                if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                    call.reject(messageFor(result), codeFor(result))
                    return@queryProductDetailsAsync
                }
                val details = queryResult.productDetailsList.firstOrNull()
                if (details == null) {
                    call.reject("Subscription product not found: $currentProductId", "PRODUCT_NOT_FOUND")
                    return@queryProductDetailsAsync
                }
                productDetails = details
                call.resolve(detailsToJs(details))
            }
        }
    }

    @PluginMethod
    fun queryPurchases(call: PluginCall) {
        currentProductId = call.getString("productId") ?: PRODUCT_ID
        ensureReady(call) {
            queryMatchingSubscription(
                onResult = { purchase ->
                    resolveEntitlement(call, purchase)
                },
                onError = { result -> call.reject(messageFor(result), codeFor(result)) }
            )
        }
    }

    @PluginMethod
    fun purchase(call: PluginCall) {
        currentProductId = call.getString("productId") ?: PRODUCT_ID
        ensureReady(call) {
            val details = productDetails
            if (details == null) {
                call.reject("Product details must be loaded before purchase.", "PRODUCT_DETAILS_MISSING")
                return@ensureReady
            }
            val offerToken = call.getString("offerToken")
                ?: details.subscriptionOfferDetails?.firstOrNull()?.offerToken
            if (offerToken == null) {
                call.reject("No subscription offer token found.", "OFFER_TOKEN_MISSING")
                return@ensureReady
            }

            val productParams = BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(details)
                .setOfferToken(offerToken)
                .build()
            val flowParams = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(listOf(productParams))
                .build()

            pendingPurchaseCall = call
            val result = billingClient?.launchBillingFlow(activity, flowParams)
            if (result?.responseCode != BillingClient.BillingResponseCode.OK) {
                pendingPurchaseCall = null
                call.reject(messageFor(result), codeFor(result))
            }
        }
    }

    @PluginMethod
    fun openManageSubscriptions(call: PluginCall) {
        val productId = call.getString("productId") ?: PRODUCT_ID
        val uri = Uri.parse("https://play.google.com/store/account/subscriptions?sku=$productId&package=${context.packageName}")
        val intent = Intent(Intent.ACTION_VIEW, uri)
        activity.startActivity(intent)
        call.resolve(JSObject().put("opened", true))
    }

    override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
        val call = pendingPurchaseCall ?: return
        pendingPurchaseCall = null

        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> {
                val purchase = purchases?.firstOrNull { it.products.contains(currentProductId) }
                if (purchase == null) {
                    call.resolve(entitlement(null, "No matching purchase returned."))
                    return
                }
                resolveEntitlement(call, purchase)
            }
            BillingClient.BillingResponseCode.USER_CANCELED -> {
                call.resolve(entitlement(null, "Purchase cancelled by user.").put("cancelled", true))
            }
            BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> {
                queryMatchingSubscription(
                    onResult = { purchase -> resolveEntitlement(call, purchase) },
                    onError = { error -> call.reject(messageFor(error), codeFor(error)) }
                )
            }
            else -> call.reject(messageFor(result), codeFor(result))
        }
    }

    private fun ensureReady(call: PluginCall, action: () -> Unit) {
        val client = billingClient
        if (client != null && client.isReady) {
            action()
            return
        }
        connectBillingClient(
            onReady = action,
            onError = { result -> call.reject(messageFor(result), codeFor(result)) }
        )
    }

    private fun connectBillingClient(onReady: () -> Unit, onError: (BillingResult) -> Unit) {
        val existing = billingClient
        if (existing != null && existing.isReady) {
            onReady()
            return
        }
        val pendingParams = PendingPurchasesParams.newBuilder()
            .enableOneTimeProducts()
            .enablePrepaidPlans()
            .build()

        billingClient = BillingClient.newBuilder(context)
            .setListener(this)
            .enablePendingPurchases(pendingParams)
            .build()

        billingClient?.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                if (result.responseCode == BillingClient.BillingResponseCode.OK) onReady()
                else onError(result)
            }

            override fun onBillingServiceDisconnected() {
                // The next Billing operation reconnects.
            }
        })
    }

    private fun queryMatchingSubscription(onResult: (Purchase?) -> Unit, onError: (BillingResult) -> Unit) {
        val params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.SUBS)
            .build()
        billingClient?.queryPurchasesAsync(params) { result, purchases ->
            if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                onError(result)
                return@queryPurchasesAsync
            }
            val purchase = purchases.firstOrNull { it.products.contains(currentProductId) }
            onResult(purchase)
        }
    }

    private fun resolveEntitlement(call: PluginCall, purchase: Purchase?) {
        if (purchase == null) {
            call.resolve(entitlement(null, "No active subscription found."))
            return
        }
        if (purchase.purchaseState == Purchase.PurchaseState.PENDING) {
            call.resolve(entitlement(purchase, "Subscription is pending and premium is not unlocked yet."))
            return
        }
        if (purchase.purchaseState != Purchase.PurchaseState.PURCHASED || !purchase.products.contains(PRODUCT_ID)) {
            call.resolve(entitlement(purchase, "Purchase is not valid for premium."))
            return
        }
        acknowledgeIfNeeded(
            purchase = purchase,
            onDone = { call.resolve(entitlement(purchase, "Subscription active.")) },
            onError = { result -> call.reject(messageFor(result), codeFor(result)) }
        )
    }

    private fun acknowledgeIfNeeded(
        purchase: Purchase,
        onDone: () -> Unit,
        onError: (BillingResult) -> Unit
    ) {
        if (purchase.isAcknowledged || purchase.purchaseState != Purchase.PurchaseState.PURCHASED) {
            onDone()
            return
        }
        val params = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchase.purchaseToken)
            .build()
        billingClient?.acknowledgePurchase(params) { result ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK) onDone()
            else onError(result)
        }
    }

    private fun detailsToJs(details: ProductDetails): JSObject {
        val offer = details.subscriptionOfferDetails?.firstOrNull()
        val phase = offer?.pricingPhases?.pricingPhaseList?.firstOrNull()
        return JSObject()
            .put("productId", details.productId)
            .put("title", details.title)
            .put("description", details.description)
            .put("formattedPrice", phase?.formattedPrice)
            .put("priceCurrencyCode", phase?.priceCurrencyCode)
            .put("billingPeriod", periodLabel(phase?.billingPeriod))
            .put("offerToken", offer?.offerToken)
    }

    private fun entitlement(purchase: Purchase?, message: String): JSObject {
        val active = purchase != null &&
            purchase.purchaseState == Purchase.PurchaseState.PURCHASED &&
            purchase.products.contains(PRODUCT_ID)
        return JSObject()
            .put("premium", active)
            .put("productId", PRODUCT_ID)
            .put("purchaseToken", purchase?.purchaseToken)
            .put("acknowledged", purchase?.isAcknowledged ?: false)
            .put("pending", purchase?.purchaseState == Purchase.PurchaseState.PENDING)
            .put("packageName", context.packageName)
            .put("message", message)
    }

    private fun periodLabel(isoPeriod: String?): String {
        return when (isoPeriod) {
            "P1M" -> "month"
            "P1Y" -> "year"
            "P1W" -> "week"
            else -> isoPeriod ?: "month"
        }
    }

    private fun codeFor(result: BillingResult?): String {
        return result?.responseCode?.toString() ?: "BILLING_ERROR"
    }

    private fun messageFor(result: BillingResult?): String {
        return when (result?.responseCode) {
            BillingClient.BillingResponseCode.SERVICE_DISCONNECTED -> "Google Play Billing disconnected."
            BillingClient.BillingResponseCode.SERVICE_UNAVAILABLE -> "Google Play Billing service unavailable."
            BillingClient.BillingResponseCode.BILLING_UNAVAILABLE -> "Billing unavailable on this device/account."
            BillingClient.BillingResponseCode.ITEM_UNAVAILABLE -> "Subscription product unavailable."
            BillingClient.BillingResponseCode.DEVELOPER_ERROR -> "Billing configuration error."
            BillingClient.BillingResponseCode.ERROR -> "Google Play Billing error."
            else -> result?.debugMessage ?: "Unknown Billing error."
        }
    }

    companion object {
        private const val PRODUCT_ID = "premium_monthly"
    }
}
