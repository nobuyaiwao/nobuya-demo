import {
    getClientConfig,
    updateStateContainer,
    updatePaymentsLog,
    generateReference,
    generateReturnUrl,
    handleTestCardCopying,
    overrideConsoleLog,
    setupGlobalErrorHandler
} from "../util.js";

// Console override & error handling
document.addEventListener("DOMContentLoaded", () => {
    overrideConsoleLog();
    setupGlobalErrorHandler();
});

// Enable test card copying
handleTestCardCopying();

// Load shared test-cards.js
const script = document.createElement("script");
script.src = "/test-cards.js";
document.body.appendChild(script);

// Initialize Drop-in with session
document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOM fully loaded, initializing Drop-in Sessions...");

    const referenceField = document.getElementById("reference");
    const returnUrlField = document.getElementById("returnUrl");
    if (referenceField && returnUrlField) {
        const reference = generateReference();
        referenceField.value = reference;
        returnUrlField.placeholder = generateReturnUrl(reference);
    }

    const startPaymentButton = document.getElementById("start-payment");
    if (!startPaymentButton) {
        console.error("Start payment button not found!");
        return;
    }

    startPaymentButton.addEventListener("click", async () => {
        console.log("Here we go! button clicked.");

        document.querySelector(".input-container").style.display = "none";
        startPaymentButton.style.display = "none";

        const countryCode = document.getElementById("countryCode")?.value || "JP";
        const currency = document.getElementById("currency")?.value || "JPY";
        const value = parseInt(document.getElementById("amount")?.value || "5000", 10);
        const reference = document.getElementById("reference")?.value;
        const returnUrl = document.getElementById("returnUrl")?.value || generateReturnUrl(reference);
        const shopperReference = document.getElementById("shopperReference")?.value || "guest";
        const shopperEmail = document.getElementById("shopperEmail")?.value || "user@test.local";
        const recurringProcessingModel = document.getElementById("recurringProcessingModel")?.value || "CardOnFile";

        if (isNaN(value) || value <= 0) {
            console.error("Invalid amount value. Please enter a valid number.");
            return;
        }

        const sessionRequest = {
            countryCode,
            amount: { currency, value },
            shopperReference,
            shopperEmail,
            reference,
            returnUrl,
            recurringProcessingModel
        };

        console.log("Creating session with request:", sessionRequest);

        try {
            const sessionResponse = await fetch("/api/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(sessionRequest)
            }).then(res => res.json());

            if (!sessionResponse.id) {
                throw new Error("Failed to create session");
            }

            console.log("Session created:", sessionResponse);

            const config = await getClientConfig();
            if (!config) throw new Error("Failed to load client config");
            
            // Card Configuration
            const cardConfiguration = {
                hasHolderName: true,
                showStoredPaymentMethods: true,
                enableStoreDetails: true
            };

            // 🔹 globalConfiguration の作成
            const globalConfiguration = {
                session: sessionResponse,
                environment: config.environment,
                clientKey: config.clientKey,
                amount: { currency, value },
                locale: "en-US",
                countryCode,
                onPaymentCompleted: (result, component) => {
                    console.info("Payment completed:", result);
                    updatePaymentsLog("Payment Completed", result);
                },
                onPaymentFailed: (result, component) => {
                    console.info("Payment failed:", result);
                },
                onError: (error, component) => {
                    console.error("Payment error:", error);
                }
            };

            // 🔹 AdyenCheckout の初期化
            const { AdyenCheckout, Dropin, Card, GooglePay, PayPal, ApplePay, Ideal } = window.AdyenWeb;
            const checkout = await AdyenCheckout(globalConfiguration);

            // 🔹 dropinConfiguration の作成
            const dropinConfiguration = {
                //paymentMethodComponents: [Card, PayPal, GooglePay, ApplePay, Ideal],
                instantPaymentTypes: ['applepay', 'googlepay'],
                paymentMethodsConfiguration : {
                    card : cardConfiguration
                    //applepay : applepayConfiguration
                },
                onReady: () => {
                    console.log("Drop-in is ready");
                }
            };

            // 🔹 Drop-in のマウント
            new Dropin(checkout, dropinConfiguration).mount("#dropin-container");

        } catch (error) {
            console.error("Error during Drop-in Sessions initialization:", error);
        }
    });
});

