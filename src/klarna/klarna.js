import {
    getClientConfig,
    fetchPaymentMethods,
    fetchStoredPaymentMethods,
    makePayment,
    makeDetails,
    updateStateContainer,
    updatePaymentsLog,
    generateReference,
    generateReturnUrl,
    handleTestCardCopying
} from "../util.js";

// Enable test card copying
handleTestCardCopying();

// Function to get URL query parameters
const getQueryParam = (param) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
};

//
//const countryCode = document.getElementById("countryCode")?.value || "GB";
//const telephoneNumber = document.getElementById("telephoneNumber")?.value || "+447755564318";
//const currency = document.getElementById("currency")?.value || "GBP";
//const value = parseInt(document.getElementById("amount")?.value || "2000", 10);
//const reference = document.getElementById("reference")?.value;
//const returnUrl = document.getElementById("returnUrl")?.value || generateReturnUrl(reference);
//const nativeThreeDS = document.getElementById("nativeThreeDS")?.checked ? "preferred" : undefined;
//const storePaymentMethod = document.getElementById("storePaymentMethod")?.checked ? true : false;
//const origin = window.location.origin;
//const klarnaOption = document.getElementById("klarnaOption")?.value || "klarna_paynow";
//const shopperLocale = document.getElementById("shopperLocale")?.value || "en-GB";
//const shopperReference = document.getElementById("shopperReference")?.value || "guest";
//const shopperEmail = document.getElementById("shopperEmail")?.value || "customer@email.uk";
//const shopperAddress = document.getElementById("shopperAddress")?.value || undefined;
//const recurringProcessingModel = document.getElementById("recurringProcessingModel")?.value || "CardOnFile";
//const challengeWindowSize = document.getElementById("challengeWindowSize")?.value || "02";

// Function to initialize the Klarna Component
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

        const countryCode = document.getElementById("countryCode")?.value || "GB";
        const telephoneNumber = document.getElementById("telephoneNumber")?.value || "+447755564318";
        const currency = document.getElementById("currency")?.value || "GBP";
        const value = parseInt(document.getElementById("amount")?.value || "2000", 10);
        const reference = document.getElementById("reference")?.value;
        const returnUrl = document.getElementById("returnUrl")?.value || generateReturnUrl(reference);
        const nativeThreeDS = document.getElementById("nativeThreeDS")?.checked ? "preferred" : undefined;
        const storePaymentMethod = document.getElementById("storePaymentMethod")?.checked ? true : false;
        const origin = window.location.origin;
        const klarnaOption = document.getElementById("klarnaOption")?.value || "klarna_paynow";
        const shopperLocale = document.getElementById("shopperLocale")?.value || "en-GB";
        const shopperReference = document.getElementById("shopperReference")?.value || "guest";
        const shopperEmail = document.getElementById("shopperEmail")?.value || "customer@email.uk";

        //const shopperAddress = document.getElementById("shopperAddress")?.value || undefined;
        const shopperAddressValue = document.getElementById("shopperAddress")?.value;
        const shopperAddress = shopperAddressValue ? JSON.parse(shopperAddressValue) : undefined;

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
            shopperReference,
            shopperLocale
        };

        const storedPmConfig = {
            shopperReference
        };

        console.log("Payment request configuration:", pmReqConfig);

        try {
            const config = await getClientConfig();
            if (!config) throw new Error("Failed to load client config");

            const paymentMethodsResponse = await fetchPaymentMethods(pmReqConfig);
            if (!paymentMethodsResponse) throw new Error("Failed to load payment methods");

            renderStoredKlarnaMethods(shopperReference);
            //const storedPaymentMethodsResponse = await fetchStoredPaymentMethods(storedPmConfig);
            //console.log(storedPaymentMethodsResponse);

            if (!Array.isArray(paymentMethodsResponse.paymentMethods)) {
                console.error("Error: paymentMethodsResponse.paymentMethods is not an array", paymentMethodsResponse.paymentMethods);
            } else {
                console.log("paymentMethodsResponse.paymentMethods:", paymentMethodsResponse.paymentMethods);
            }
            
            const klarnaConfiguration = {
                type: klarnaOption,
                useKlarnaWidget: true // When set to true, the Klarna widget is shown. Set to false or leave the configuration object out to initiate a redirect flow.
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
                            countryCode,
                            //telephoneNumber,
                            shopperReference,
                            //shopperEmail,
                            returnUrl,
                            origin,
                            channel: "Web",
                            storePaymentMethod : storePaymentMethod,
                            recurringProcessingModel,
                            //billingAddress: shopperAddress,
                            //deliveryAddress: shopperAddress,
                            lineItems: [
                                {
                                  quantity: "1",
                                  amountExcludingTax: "2000",
                                  //taxPercentage: "2000",
                                  description: "Shoes",
                                  id: "Item #1",
                                  taxAmount: "400",
                                  amountIncludingTax: "2400"
                                },
                                {
                                  quantity: "2",
                                  amountExcludingTax: "500",
                                  //taxPercentage: "2000",
                                  description: "Socks",
                                  id: "Item #2",
                                  taxAmount: "100",
                                  amountIncludingTax: "600"
                                },
                                // The following line item specifies the discount
                                {
                                  quantity: "1",
                                  description: "Point redemption",
                                  id: "Point-Reddmption",
                                  amountIncludingTax: "-1600"
                                }
                              ]
                            //lineItems: [
                            //        {
                            //            quantity: "1",
                            //            description: "Shoes",
                            //            id: "Item #1"
                            //            //amountIncludingTax: "2000"
                            //        }
                            //    ]
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

                    const cardContainer = document.getElementById("klarna-container");
                    cardContainer.innerHTML = `
                        <h2>Payment Result</h2>
                        <p><strong>Status:</strong> ${result.resultCode}</p>
                    `;

                }
            };

            const { AdyenCheckout, Klarna } = window.AdyenWeb;
            const checkout = await AdyenCheckout(configObj);
            const klarna = new Klarna(checkout,klarnaConfiguration).mount("#klarna-container");

        } catch (error) {
            console.error("Error during initialization:", error);
        }
    });
});

// Klarna options
const KLARNA_BRANDS = ["klarna", "klarna_paynow", "klarna_account"];

// Render stored Klarna options
export const renderStoredKlarnaMethods = async (shopperReference) => {
    try {
        const response = await fetchStoredPaymentMethods({ shopperReference });

        if (!response || !Array.isArray(response.storedPaymentMethods)) {
            console.log("No stored payment methods found for Klarna.");
            return;
        }

        const storedKlarna = response.storedPaymentMethods.filter(pm =>
            KLARNA_BRANDS.includes(pm.brand)
        );

        if (storedKlarna.length === 0) {
            console.log("No stored Klarna payment methods to display.");
            return;
        }

        const klarnaContainer = document.getElementById("klarna-container");
        if (!klarnaContainer) {
            console.error("#klarna-container not found in DOM.");
            return;
        }

        const existing = document.getElementById("stored-klarna-container");
        if (existing) existing.remove();

        const wrapper = document.createElement("div");
        wrapper.id = "stored-klarna-container";
        wrapper.className = "stored-klarna-wrapper";

        wrapper.innerHTML = `
            <h3 class="stored-klarna-title">Saved Klarna payments</h3>
            <div class="stored-klarna-list">
                ${storedKlarna.map(pm => `
                    <div class="stored-klarna-item" data-id="${pm.id}" data-brand="${pm.brand}">
                        <div class="stored-klarna-cell stored-klarna-brand">
                            ${pm.brand}
                        </div>
                        <div class="stored-klarna-cell stored-klarna-id">
                            ${pm.id}
                        </div>
                        <div class="stored-klarna-cell stored-klarna-action">
                            <button class="stored-klarna-button" data-id="${pm.id}" data-brand="${pm.brand}">
                                One Click to Pay!
                            </button>
                        </div>
                    </div>
                `).join("")}
            </div>
        `;

        klarnaContainer.insertAdjacentElement("afterend", wrapper);

        wrapper.addEventListener("click", async (event) => {
            const button = event.target.closest(".stored-klarna-button");
            if (!button) return;
        
            const storedId = button.dataset.id;
            const brand = button.dataset.brand;
        
            console.log("Klarna One Click Pay clicked:", { storedId, brand });

            const countryCode = document.getElementById("countryCode")?.value || "GB";
            //const telephoneNumber = document.getElementById("telephoneNumber")?.value || "+447755564318";
            const currency = document.getElementById("currency")?.value || "GBP";
            const value = parseInt(document.getElementById("amount")?.value || "2000", 10);
            //const reference = document.getElementById("reference")?.value;
            //const returnUrl = document.getElementById("returnUrl")?.value || generateReturnUrl(reference);
            //const nativeThreeDS = document.getElementById("nativeThreeDS")?.checked ? "preferred" : undefined;
            //const storePaymentMethod = document.getElementById("storePaymentMethod")?.checked ? true : false;
            //const origin = window.location.origin;
            //const klarnaOption = document.getElementById("klarnaOption")?.value || "klarna_paynow";
            const shopperLocale = document.getElementById("shopperLocale")?.value || "en-GB";
            const shopperReference = document.getElementById("shopperReference")?.value || "guest";
            const shopperEmail = document.getElementById("shopperEmail")?.value || "customer@email.uk";
            const shopperAddress = document.getElementById("shopperAddress")?.value || undefined;
            const recurringProcessingModel = document.getElementById("recurringProcessingModel")?.value || "CardOnFile";
        
            const oneClickReq = {
                reference: "OneClick Klarna",
                amount: {
                    currency,
                    value
                },
                paymentMethod: {
                    type: brand,
                    storedPaymentMethodId: storedId
                },
                shopperReference,
                channel: "Web",
                shopperInteraction: "ContAuth",
                recurringProcessingModel,
                shopperLocale,
                countryCode
            };
        
            console.log(oneClickReq);
        
            const result = await makePayment(oneClickReq);
            console.log(result);
        });

    } catch (error) {
        console.error("Error rendering stored Klarna payment methods:", error);
    }
};

