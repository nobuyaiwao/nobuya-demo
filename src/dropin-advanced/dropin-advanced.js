import { getClientConfig, fetchPaymentMethods, makePayment, makeDetails, updateStateContainer, updatePaymentsLog } from "./util.js";

// 🔹 Handle test card copying
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".copy-btn").forEach(button => {
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            const cardNumber = button.parentElement.dataset.card;
            navigator.clipboard.writeText(cardNumber).then(() => {
                console.log(`Copied card number: ${cardNumber}`);
                button.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => button.innerHTML = '<i class="fas fa-copy"></i> Copy', 1500);
            }).catch(err => console.error("Failed to copy card number:", err));
        });
    });
});

// 🔹 Generate a merchant reference
const generateReference = () => {
    const now = new Date();
    return `nobuya-demo-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-` +
           `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
};

// 🔹 Generate return URL based on reference
const generateReturnUrl = (reference) => {
    const host = window.location.origin;
    return `${host}/returnurl.html?reference=${reference}`;
};

document.addEventListener("DOMContentLoaded", () => {
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
                        // 🔹 Hide state.data display after submission
                        document.getElementById("state-container").style.display = "none";

                        // 🔹 Call makePayment(), which already logs the request & response
                        const paymentsReqData = {
                            ...state.data,
                            reference,
                            amount: { currency, value },
                            returnUrl,
                            origin,
                            channel: "Web",
                            ...(nativeThreeDS && {
                                authenticationData: {
                                    threeDSRequestData: {
                                        nativeThreeDS
                                    }
                                }
                            })
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
                        // 🔹 Call makeDetails(), which already logs the request & response
                        const result = await makeDetails(state.data);
                
                        if (!result.resultCode) {
                            console.error("Additional details processing failed: Missing resultCode.");
                            actions.reject();
                            return;
                        }
                
                        const { resultCode, action, order, donationToken } = result;
                
                        console.log("Handling additional details:", { resultCode, action, order, donationToken });
                
                        actions.resolve({
                            resultCode,
                            action,
                            order,
                            donationToken,
                        });
                
                    } catch (error) {
                        console.error("Additional details processing error:", error);
                        actions.reject();
                    }
                }
            };

            const { AdyenCheckout, Dropin } = window.AdyenWeb;
            const checkout = await AdyenCheckout(configObj);
            new Dropin(checkout).mount("#dropin-container");

        } catch (error) {
            console.error("Error during initialization:", error);
        }
    });
});

