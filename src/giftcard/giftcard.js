import {
    getClientConfig,
    fetchPaymentMethods,
    makePayment,
    makeDetails,
    updateStateContainer,
    updatePaymentsLog,
    generateReference,
    generateReturnUrl
} from "../util.js";

// 🔹 Function to initialize the Giftcard Component
document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOM fully loaded and parsed.");

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

        // Standard fields for Adyen component
        const countryCode = document.getElementById("countryCode")?.value || "JP";
        const currency = document.getElementById("currency")?.value || "JPY";
        const value = parseInt(document.getElementById("amount")?.value || "5000", 10);
        const reference = document.getElementById("reference")?.value;
        const returnUrl = document.getElementById("returnUrl")?.value || generateReturnUrl(reference);
        const origin = window.location.origin;
        const shopperReference = document.getElementById("shopperReference")?.value || "guest";

        if (isNaN(value) || value <= 0) {
            console.error("Invalid amount value. Please enter a valid number.");
            return;
        }

        const pmReqConfig = {
            countryCode,
            amount: { currency, value },
            shopperReference
        };

        console.log("Payment request configuration:", pmReqConfig);
        console.log("currency : ", currency);

        try {
            const config = await getClientConfig();
            if (!config) throw new Error("Failed to load client config");

            const paymentMethodsResponse = await fetchPaymentMethods(pmReqConfig);
            if (!paymentMethodsResponse) throw new Error("Failed to load payment methods");

            // 
            const configObj = {
                paymentMethodsResponse,
                clientKey: config.clientKey,
                locale: "en-US",
                amount: { currency, value },
                environment: config.environment,
                countryCode,
                onChange: updateStateContainer
            };

            // 🔹 Giftcard の設定
            const giftcardConfiguration = {
                onBalanceCheck: async (resolve, reject, data) => {
                    console.log("Checking balance:", data);
                    try {
                        const response = await fetch("/api/balance", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(data)
                        });

                        if (!response.ok) throw new Error("Failed to check balance");

                        const balanceData = await response.json();
                        console.log("Balance Response:", balanceData);
                        resolve(balanceData);
                    } catch (error) {
                        console.error("Balance check failed:", error);
                        reject(error);
                    }
                },

                onOrderRequest: async (resolve, reject, data) => {
                    console.log("Creating order:", data);
                    try {
                        const { amount } = { amount: { currency, value }} ; 
                        console.log("amount for order:", amount);
                
                        const response = await fetch("/api/orders", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ amount })  
                        });
                
                        if (!response.ok) throw new Error("Failed to create order");
                
                        const orderData = await response.json();
                        console.log("Order Response:", orderData);
                        resolve(orderData);
                    } catch (error) {
                        console.error("Order creation failed:", error);
                        reject(error);
                    }
                },

                onOrderCancel: async (order) => {
                    console.log("Cancelling order:", order);
                    try {
                        const response = await fetch("/api/orders/cancel", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(order)
                        });

                        if (!response.ok) throw new Error("Failed to cancel order");

                        console.log("Order cancelled successfully");
                    } catch (error) {
                        console.error("Order cancellation failed:", error);
                    }
                },

                onSubmit: async (state, component, actions) => {
                    console.log("Submitting payment:", state.data);

                    try {
                        const paymentsReqData = {
                            ...state.data,
                            reference,
                            amount: { currency, value },
                            shopperReference,
                            returnUrl,
                            origin,
                            channel: "Web"
                        };

                        updatePaymentsLog("Payment Request", paymentsReqData);
                        const result = await makePayment(paymentsReqData);
                        updatePaymentsLog("Payment Response", result);

                        if (!result.resultCode) {
                            console.error("Payment failed, missing resultCode.");
                            actions.reject();
                            return;
                        }

                        actions.resolve({ resultCode: result.resultCode, action: result.action });
                    } catch (error) {
                        console.error("Payment error:", error);
                        actions.reject();
                    }
                },

                onAdditionalDetails: async (state, component, actions) => {
                    console.log("Processing additional details:", state.data);

                    try {
                        updatePaymentsLog("Details Request", state.data);
                        const result = await makeDetails(state.data);
                        updatePaymentsLog("Details Response", result);

                        if (!result.resultCode) {
                            console.error("Additional details processing failed: Missing resultCode.");
                            actions.reject();
                            return;
                        }

                        actions.resolve({ resultCode: result.resultCode });
                    } catch (error) {
                        console.error("Additional details processing error:", error);
                        actions.reject();
                    }
                },

                onPaymentCompleted: (result) => {
                    console.log("Payment completed:", result);

                    const giftcardContainer = document.getElementById("giftcard-container");
                    giftcardContainer.innerHTML = `
                        <h2>Payment Result</h2>
                        <p><strong>Status:</strong> ${result.resultCode}</p>
                    `;
                }
            };

            // 🔹 Checkout と Giftcard Component の作成
            const { AdyenCheckout, Giftcard } = window.AdyenWeb;
            const checkout = await AdyenCheckout(configObj);
            const giftcardComponent = new Giftcard(checkout, giftcardConfiguration);

            giftcardComponent.isAvailable()
                .then(() => {
                    giftcardComponent.mount("#giftcard-container");
                })
                .catch(e => {
                    console.error("Giftcard is not available:", e);
                });

        } catch (error) {
            console.error("Error during initialization:", error);
        }
    });
});

