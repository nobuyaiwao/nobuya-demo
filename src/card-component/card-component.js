import {
    getClientConfig,
    fetchPaymentMethods,
    makePayment,
    makeDetails,
    updateStateContainer,
    updatePaymentsLog
} from "../util.js";

// 🔹 Function to initialize the card component
document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOM fully loaded and parsed.");

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
        const origin = window.location.origin;

        if (isNaN(value) || value <= 0) {
            console.error("Invalid amount value. Please enter a valid number.");
            return;
        }

        const pmReqConfig = {
            countryCode,
            amount: { currency, value }
        };

        console.log("Payment request configuration:", pmReqConfig);

        try {
            const config = await getClientConfig();
            if (!config) throw new Error("Failed to load client config");

            const paymentMethodsResponse = await fetchPaymentMethods(pmReqConfig);
            if (!paymentMethodsResponse) throw new Error("Failed to load payment methods");

            const cardConfiguration = {
                hasHolderName: true,
                enableStoreDetails: true
            };

            const configObj = {
                paymentMethodsResponse,
                clientKey: config.clientKey,
                locale: "ja-JP",
                environment: config.environment,
                countryCode,
                onChange: updateStateContainer,
                onSubmit: async (state, component, actions) => {
                    console.log('### card::onSubmit:: calling');

                    try {
                        document.getElementById("state-container").style.display = "none";

                        const paymentsReqData = {
                            ...state.data,
                            amount: { currency, value },
                            origin,
                            channel: "Web",
                            storePaymentMethod: true
                        };

                        const { action, resultCode } = await makePayment(paymentsReqData);

                        if (!resultCode) {
                            console.error("Payment failed, missing resultCode.");
                            actions.reject();
                            return;
                        }

                        console.log("Handling action:", action);
                        actions.resolve({ resultCode, action });

                    } catch (error) {
                        console.error("Payment error:", error);
                        actions.reject();
                    }
                },
                onAdditionalDetails: async (state, component, actions) => {
                    console.log("### card::onAdditionalDetails:: calling");

                    try {
                        const result = await makeDetails(state.data);

                        if (!result.resultCode) {
                            console.error("Additional details processing failed: Missing resultCode.");
                            actions.reject();
                            return;
                        }

                        const { resultCode, action } = result;

                        console.log("Handling additional details:", { resultCode, action });

                        actions.resolve({ resultCode, action });
                    } catch (error) {
                        console.error("Additional details processing error:", error);
                        actions.reject();
                    }
                }
            };

            const { AdyenCheckout, Card } = window.AdyenWeb;
            const checkout = await AdyenCheckout(configObj);
            const card = new Card(checkout,cardConfiguration).mount("#card-container");
            //checkout.create("card",cardConfiguration).mount("#card-container");

        } catch (error) {
            console.error("Error during initialization:", error);
        }
    });
});

