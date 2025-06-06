import {
    getClientConfig,
    fetchPaymentMethods,
    makePayment,
    makeDetails,
    updateStateContainer,
    updatePaymentsLog,
    generateReference,
    generateReturnUrl,
    handleTestCardCopying,
    overrideConsoleLog,
    setupGlobalErrorHandler
} from "../util.js";

// Coonsole override
document.addEventListener("DOMContentLoaded", () => {
    overrideConsoleLog();
    setupGlobalErrorHandler();
});

// 🔹 Enable test card copying
handleTestCardCopying();

// Load shared test-cards.js
const script = document.createElement("script");
script.src = "/test-cards.js";
document.body.appendChild(script);

// 🔹 Function to get URL query parameters
const getQueryParam = (param) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
};

// 🔹 Handle redirection back to call /details
document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOM fully loaded, processing redirect result...");

    const redirectResult = getQueryParam("redirectResult");
    if (!redirectResult) return;

    console.log("Redirect result detected:", redirectResult);

    // Hide input fields, button, and state-container
    const inputContainer = document.querySelector(".input-container");
    const startPaymentButton = document.getElementById("start-payment");
    const stateContainer = document.getElementById("state-container");

    if (inputContainer) inputContainer.style.display = "none";
    if (startPaymentButton) startPaymentButton.style.display = "none";
    if (stateContainer) stateContainer.style.display = "none";

    const dropinContainer = document.getElementById("dropin-container");
    if (!dropinContainer) {
        console.error("dropin-container not found in the DOM.");
        return;
    }

    dropinContainer.innerHTML = "<p>Processing your payment...</p>";

    try {
        // Call /payments/details with redirectResult
        const detailsResult = await makeDetails({ details: { redirectResult } });

        // Log details response in debug console
        updatePaymentsLog("Details Response", detailsResult);

        // Show final result in dropin-container
        dropinContainer.innerHTML = `
            <h2>Payment Result</h2>
            <p><strong>Status:</strong> ${detailsResult.resultCode}</p>
        `;

        console.log("Details processed successfully:", detailsResult);
    } catch (error) {
        console.error("Error processing redirect result:", error);
    }
});

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
        const shopperReference = document.getElementById("shopperReference")?.value || "guest";
        const shopperEmail = document.getElementById("shopperEmail")?.value || "user@test.local";
        const recurringProcessingModel = document.getElementById("recurringProcessingModel")?.value || "CardOnFile";


        if (isNaN(value) || value < 0) {
            console.error("Invalid amount value. Please enter a valid number.");
            return;
        }

        //const merchantDisplayName = "NobuyaIwaoCOM";

        const pmReqConfig = {
            countryCode,
            amount: { currency, value },
            shopperReference,
            shopperEmail
        };

        console.log("Payment request configuration:", pmReqConfig);

        try {
            const config = await getClientConfig();
            if (!config) throw new Error("Failed to load client config");

            const paymentMethodsResponse = await fetchPaymentMethods(pmReqConfig);
            if (!paymentMethodsResponse) throw new Error("Failed to load payment methods");


            // card configuration
            const cardConfiguration = {
                hasHolderName: true,
                showStoredPaymentMethods: true, 
                enableStoreDetails: true,
                enableClickToPay: true,
                clickToPayConfiguration: {
                    merchantDisplayName : "Click To Pay Merchant Name",
                    shopperEmail
                }
            };
            console.log(cardConfiguration);

            // Apple Pay configuration with shipping address collection
            const applepayConfiguration = {
                countryCode,
                amount: { currency, value },
                isExpress: true,
                requiredShippingContactFields: ["postalAddress"], // 住所情報を取得
                onShippingContactSelected: async (resolve, reject, event) => {
                    console.log("onShippingContactSelected called.");
                    console.log("Shipping Contact Data:", event.shippingContact);
                
                    // 住所情報の取得
                    const shippingContact = event.shippingContact;
                    const shippingAddress = {
                        country: shippingContact.countryCode,
                        city: shippingContact.locality,
                        postalCode: shippingContact.postalCode,
                        addressLine1: shippingContact.addressLines ? shippingContact.addressLines[0] : "",
                        addressLine2: shippingContact.addressLines ? shippingContact.addressLines[1] : "",
                    };
                
                    console.log("Extracted Shipping Address:", shippingAddress);
                
                    // HTML要素が存在する場合のみ表示
                    const shippingOutputElement = document.getElementById("shippingAddressOutput");
                    if (shippingOutputElement) {
                        shippingOutputElement.innerText = JSON.stringify(shippingAddress, null, 2);
                    } else {
                        console.warn("shippingAddressOutput element not found in DOM.");
                    }
                
                    // Apple Pay の UI を更新
                    resolve({
                        newTotal: {
                            label: "Total",
                            amount: `${value}`,
                            type: "final",
                        },
                    });
                }
                
                //onShippingContactSelected: async (resolve, reject, event) => {
                //    console.log("onShippingContactSelected called.");
                //    console.log("Shipping Contact Data:", event.shippingContact);
            
                //    // 住所情報の取得
                //    const shippingContact = event.shippingContact;
                //    const shippingAddress = {
                //        country: shippingContact.countryCode,
                //        city: shippingContact.locality,
                //        postalCode: shippingContact.postalCode,
                //        addressLine1: shippingContact.addressLines ? shippingContact.addressLines[0] : "",
                //        addressLine2: shippingContact.addressLines ? shippingContact.addressLines[1] : "",
                //    };
            
                //    console.log("Extracted Shipping Address:", shippingAddress);
            
                //    // 取得した住所をHTMLに反映 (デバッグ用)
                //    document.getElementById("shippingAddressOutput").innerText = JSON.stringify(shippingAddress, null, 2);
            
                //    // Apple Pay の UI を更新 (例えば、送料を変更)
                //    resolve({
                //        newTotal: {
                //            label: "Total",
                //            amount: `${value}`,
                //            type: "final",
                //        },
                //    });
                //}
            };

            // dropin configuration
            const dropinConfiguration = {
                //paymentMethodComponents: [Card, PayPal, GooglePay, ApplePay, Ideal],
                instantPaymentTypes: ['applepay', 'googlepay'],
                //showPaymentMethods: false,
                paymentMethodsConfiguration : {
                    card : cardConfiguration,
                    applepay : applepayConfiguration
                }
            };

            const configObj = {
                paymentMethodsResponse,
                clientKey: config.clientKey,
                locale: "en-US",
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
                            //storePaymentMethod: true,       // ??
                            recurringProcessingModel,
                            ...(state.data.paymentMethod?.storedPaymentMethodId && { shopperInteraction: "ContAuth" })
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
                },
                onError: (error,component) => {
                    console.log("### card::onError:: calling");
                    console.log(error);
                }
            };

            const { AdyenCheckout, Dropin } = window.AdyenWeb;
            const checkout = await AdyenCheckout(configObj);
            new Dropin(checkout,dropinConfiguration).mount("#dropin-container");

        } catch (error) {
            console.error("Error during initialization:", error);
        }
    });
});

