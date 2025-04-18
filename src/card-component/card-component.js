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

// 🔹 Enable test card copying
handleTestCardCopying();

// 🔹 Function to get URL query parameters
const getQueryParam = (param) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
};

// 🔹 Function to initialize the Card Component
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
        const shopperEmail = document.getElementById("shopperEmail")?.value || "test@example.com";
        const recurringProcessingModel = document.getElementById("recurringProcessingModel")?.value || "CardOnFile";
        const challengeWindowSize = document.getElementById("challengeWindowSize")?.value || "02";

        if (isNaN(value) || value < 0) {
            console.error("Invalid amount value. Please enter a valid number.");
            return;
        }

        const pmReqConfig = {
            countryCode,
            amount: { currency, value },
            shopperEmail,
            shopperReference
        };

        console.log("Payment request configuration:", pmReqConfig);

        try {
            const config = await getClientConfig();
            if (!config) throw new Error("Failed to load client config");

            const paymentMethodsResponse = await fetchPaymentMethods(pmReqConfig);
            if (!paymentMethodsResponse) throw new Error("Failed to load payment methods");

            // paymentMethodsResponse.paymentMethods array check
            if (!Array.isArray(paymentMethodsResponse.paymentMethods)) {
                console.error("Error: paymentMethodsResponse.paymentMethods is not an array", paymentMethodsResponse.paymentMethods);
            } else {
                console.log("paymentMethodsResponse.paymentMethods:", paymentMethodsResponse.paymentMethods);
            }

            // Define style object
            var styleObject = {
              base: {
                color: '#000',
                background: '#ccffe5', 
                boxShadow: '0 4px 0 0 #007bff',
                paddingBottom: '8px'
              },
              focus: {
                boxShadow: '0 4px 0 0 #00bcd4'
              },
              error: {
                boxShadow: '0 4px 0 0 red'
              },
              placeholder: {
                color: '#aaa'
              }
            };
            
            //// Click To Pay Availability Check
            //const isClickToPayAvailable = paymentMethodsResponse.paymentMethods?.some(
            //    pm => pm.type === "scheme" && pm.clickToPay
            //);
            //console.log("Click to Pay available:", isClickToPayAvailable);

            // Card component configuration
            const cardConfiguration = {
                hasHolderName: true,
                enableStoreDetails: false,
                //clickToPayConfiguration: {
                //    "merchantDisplayName" : "CTP Merchant Name",
                //    shopperEmail
                //},
                //styles: styleObject,
                //installmentOptions: {
                //    card: {
                //        values: [ 2, 3, 5, 8, 10, 12, 15],
                //        plans: [ 'regular', 'revolving' ]
                //    },
                //},
                challengeWindowSize,
                onFieldValid: (cbObj) => {
                    console.log("### card::onFieldValid:: calling:",cbObj);
                },
                onBinValue: (cbObj) => {
                    console.log("### card::onBinValue:: calling:",cbObj);
                },
                onBinLookup: (cbObj) => {
                    console.log("### card::onBinLookup:: calling:",cbObj);
                } 
            };
            console.log("Card Configuration:", cardConfiguration);

            const translations = {
                "ja-JP": {
                    "payButton": "このカードを登録",
                    "form.instruction": ""
                }
            };

            const configObj = {
                paymentMethodsResponse,
                clientKey: config.clientKey,
                //locale: "en-US",
                locale: "ja-JP",
                translations,
                environment: config.environment,
                countryCode,
                onChange: updateStateContainer,
                onSubmit: async (state, component, actions) => {
                    console.log('### card::onSubmit:: calling');

                    try {
                        document.getElementById("state-container").style.display = "none";

                        const paymentsReqData = {
                            ...state.data,
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
                        updatePaymentsLog("Payment Response", result );

                        if (!result.resultCode) {
                            console.error("Payment failed, missing resultCode.");
                            actions.reject();
                            return;
                        }

                        const {
                            resultCode,
                            action,
                            order,
                            donationToken
                        } = result;

                        actions.resolve({
                            resultCode,
                            action,
                            order,
                            donationToken,
                        });

                    } catch (error) {
                        console.error("Payment error:", error);
                        actions.reject();
                    }
                },
                onAdditionalDetails: async (state, component, actions) => {
                    console.log("### card::onAdditionalDetails:: calling");

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
                        actions.resolve({ resultCode });
                        //actions.resolve({ resultCode, action });
                    } catch (error) {
                        console.error("Additional details processing error:", error);
                        actions.reject();
                    }
                },
                onPaymentCompleted: async (result, component) => {

                    console.log("### card::onPaymentCompleted:: calling");
                    console.log(result);

                    const cardContainer = document.getElementById("card-container");
                    cardContainer.innerHTML = `
                        <h2>Payment Result</h2>
                        <p><strong>Status:</strong> ${result.resultCode}</p>
                    `;

                }
            };

            const { AdyenCheckout, Card } = window.AdyenWeb;
            const checkout = await AdyenCheckout(configObj);
            const card = new Card(checkout,cardConfiguration).mount("#card-container");
            //const cardComponent = checkout.create("card", cardConfiguration);
            //cardComponent.mount("#card-container");

        } catch (error) {
            console.error("Error during initialization:", error);
        }
    });
});

