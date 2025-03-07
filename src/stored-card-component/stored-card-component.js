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

// 🔹 Function to initialize the Stored Card Component
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

        const countryCode = document.getElementById("countryCode")?.value || "JP";
        const currency = document.getElementById("currency")?.value || "JPY";
        const value = parseInt(document.getElementById("amount")?.value || "5000", 10);
        const reference = document.getElementById("reference")?.value;
        const returnUrl = document.getElementById("returnUrl")?.value || generateReturnUrl(reference);
        const nativeThreeDS = document.getElementById("nativeThreeDS")?.checked ? "preferred" : undefined;
        const origin = window.location.origin;
        const shopperReference = document.getElementById("shopperReference")?.value || "guest";
        const recurringProcessingModel = document.getElementById("recurringProcessingModel")?.value || "CardOnFile";

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

        try {
            const config = await getClientConfig();
            if (!config) throw new Error("Failed to load client config");

            const paymentMethodsResponse = await fetchPaymentMethods(pmReqConfig);
            //paymentMethodsResponse.storedPaymentMethods.forEach(method => {
            //    if (method.supportedRecurringProcessingModels) {
            //        method.supportedRecurringProcessingModels = ["CardOnFile"];
            //    }
            //    if (method.supportedShopperInteractions) {
            //        method.supportedShopperInteractions = ["Ecommerce"];
            //    }
            //});

            if (!paymentMethodsResponse) throw new Error("Failed to load payment methods");

            // Stored Card configuration
            const storedCardConfiguration = {
                hideCVC: true
            };

            const translations = {
                "ja-JP": {
                    "payButton": "決済",
                    "form.instruction": ""
                }
            };

            const configObj = {
                paymentMethodsResponse,
                clientKey: config.clientKey,
                locale: "ja-JP",
                translations,
                environment: config.environment,
                countryCode,
                onChange: updateStateContainer,
                onSubmit: async (state, component, actions) => {
                    console.log('### stored-card::onSubmit:: calling');

                    try {
                        document.getElementById("state-container").style.display = "none";

                        const paymentsReqData = {
                            ...state.data,
                            reference,
                            amount: { currency, value },
                            shopperReference,
                            recurringProcessingModel,
                            ...(nativeThreeDS && {
                                authenticationData: {
                                    threeDSRequestData: {
                                        nativeThreeDS
                                    }
                                }
                            }),
                            returnUrl,
                            origin,
                            channel: "Web"
                        };

                        updatePaymentsLog("Payment Request", paymentsReqData);
                        const { action, resultCode } = await makePayment(paymentsReqData);
                        updatePaymentsLog("Payment Response", { resultCode, action });

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
                    console.log("### stored-card::onAdditionalDetails:: calling");

                    try {
                        updatePaymentsLog("Details Request", state.data);
                        const result = await makeDetails(state.data);
                        updatePaymentsLog("Details Response", result);

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
                },
                onPaymentCompleted: async (result, component) => {

                    console.log("### card::onPaymentCompleted:: calling");
                    console.log(result);

                    const cardContainer = document.getElementById("stored-card-container");
                    cardContainer.innerHTML = `
                        <h2>Payment Result</h2>
                        <p><strong>Status:</strong> ${result.resultCode}</p>
                    `;

                }
            };

            const { AdyenCheckout, Card } = window.AdyenWeb;
            const checkout = await AdyenCheckout(configObj);

            // Mount stored card payment method
            const storedPaymentMethod = checkout.paymentMethodsResponse.storedPaymentMethods[0];
            const storedCardComponent = new Card(checkout,{
                ...storedPaymentMethod,
                hideCVC: true
            }).mount("#stored-card-container");

        } catch (error) {
            console.error("Error during initialization:", error);
        }
    });
});

