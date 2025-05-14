import {
    getClientConfig,
    fetchPaymentMethods,
    makePayment,
    makeDetails,
    updateStateContainer,
    updatePaymentsLog,
    generateReference,
    generateReturnUrl,
    handleTestCardCopying
} from "../util.js";

import {
    onConfigSuccess,
    onBrand,
    onBinLookup,
    onFocus,
    onChangeV5,
    setCCErrors
} from "./securedfields-config.js";

// Enable test card copying
handleTestCardCopying();

// DOMContentLoaded

document.addEventListener("DOMContentLoaded", async () => {
    const referenceField = document.getElementById("reference");
    const returnUrlField = document.getElementById("returnUrl");

    if (referenceField && returnUrlField) {
        const reference = generateReference();
        referenceField.value = reference;
        returnUrlField.placeholder = generateReturnUrl(reference);
    }

    const startPaymentButton = document.getElementById("start-payment");
    if (!startPaymentButton) return;

    startPaymentButton.addEventListener("click", async () => {
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
        const shopperEmail = document.getElementById("shopperEmail")?.value || "test@example.com";
        const recurringProcessingModel = document.getElementById("recurringProcessingModel")?.value || "CardOnFile";
        const challengeWindowSize = document.getElementById("challengeWindowSize")?.value || "02";

        if (isNaN(value) || value < 0) return;

        const pmReqConfig = {
            countryCode,
            amount: { currency, value },
            shopperEmail,
            shopperReference
        };

        try {
            const config = await getClientConfig();
            const paymentMethodsResponse = await fetchPaymentMethods(pmReqConfig);

            const translations = {
                "ja-JP": {
                    "payButton": "このカードを登録",
                    "form.instruction": ""
                }
            };

            const checkout = await AdyenCheckout({
                paymentMethodsResponse,
                clientKey: config.clientKey,
                locale: "ja-JP",
                translations,
                environment: config.environment,
                countryCode,
                onChange: onChangeV5
            });

            const securedFieldsComponent = checkout.create("securedfields", {
                type: "card",
                brands: ["visa", "mc"],
                //styles: {
                //    base: {
                //        color: '#000',
                //        background: '#ccffe5',
                //        paddingBottom: '8px'
                //    },
                //    focus: {
                //        boxShadow: '0 4px 0 0 #00bcd4'
                //    },
                //    error: {
                //        boxShadow: '0 4px 0 0 red'
                //    },
                //    placeholder: {
                //        color: '#aaa'
                //    }
                //},
                onConfigSuccess,
                onBrand,
                onFocus,
                onBinLookup,
                onError: setCCErrors
            });

            securedFieldsComponent.mount("#card-container");

            const payButton = document.createElement("button");
            payButton.textContent = "Pay";
            payButton.className = "adyen-checkout__button js-securedfields-pay-button";
            payButton.addEventListener("click", async () => {
                if (!securedFieldsComponent.isValid) {
                    securedFieldsComponent.showValidation();
                    return;
                }

                const paymentMethod = {
                    type: "scheme",
                    ...securedFieldsComponent.state.data
                };

                const paymentsReqData = {
                    paymentMethod,
                    reference,
                    amount: { currency, value },
                    shopperReference,
                    shopperEmail,
                    returnUrl,
                    origin,
                    channel: "Web",
                    ...(nativeThreeDS && {
                        authenticationData: {
                            threeDSRequestData: {
                                nativeThreeDS
                            }
                        }
                    }),
                    storePaymentMethod: true,
                    recurringProcessingModel
                };

                updatePaymentsLog("Payment Request", paymentsReqData);
                const result = await makePayment(paymentsReqData);
                updatePaymentsLog("Payment Response", result);

                const { resultCode, action, order, donationToken } = result;

                // handle action, fallback (you could expand this section)
                if (action) {
                    checkout.submitDetails(action);
                } else {
                    const cardContainer = document.getElementById("card-container");
                    cardContainer.innerHTML = `<h2>Payment Result</h2><p><strong>Status:</strong> ${resultCode}</p>`;
                }
            });

            document.querySelector("#card-container").appendChild(payButton);

        } catch (err) {
            console.error("Error initializing Secured Fields:", err);
        }
    });
});

