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

if (window.location.protocol !== "https:") {
    alert("Warning : You need HTTPS to run Apple Pay component. With this code you can run on Heroku alternatively.");
}


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
            if (!paymentMethodsResponse) throw new Error("Failed to load payment methods");

            const applepayConfiguration = {
                amount: {
                    value,
                    currency,
                },
                countryCode,
                isExpress: true,
                requiredShippingContactFields: ["postalAddress"],
                onClick: (resolve, reject) => {
                    console.log("onClick is called :)");
                    resolve();
                },
                onShippingContactSelected: async (resolve, reject, event) => {
                    console.log("onShippingContactSelected called.");
                    console.log("Shipping Contact Data:", event.shippingContact);
            
                    const shippingAddress = {
                        country: event.shippingContact.countryCode,
                        city: event.shippingContact.locality,
                        postalCode: event.shippingContact.postalCode,
                        addressLine1: event.shippingContact.addressLines ? event.shippingContact.addressLines[0] : "",
                        addressLine2: event.shippingContact.addressLines ? event.shippingContact.addressLines[1] : "",
                    };
            
                    console.log("Extracted Shipping Address:", shippingAddress);
            
                    const shippingOutputElement = document.getElementById("shippingAddressOutput");
                    if (shippingOutputElement) {
                        shippingOutputElement.style.display = "block";
                        shippingOutputElement.innerText = JSON.stringify(shippingAddress, null, 2);
                    }
            
                    resolve({
                        newTotal: {
                            label: "Total",
                            amount: `${value}`,
                            type: "final",
                        },
                    });
                },
                onPaymentAuthorized: async (resolve, reject, event) => {
                    console.log("### onPaymentAuthorized called ###");
                    console.log("Full Payment Authorization Event:", event);
            
                    const paymentData = event.payment;
                    console.log("Payment Token:", paymentData.token);
                    console.log("Transaction Identifier:", paymentData.transactionIdentifier);
                    console.log("Billing Contact:", paymentData.billingContact);
                    console.log("Shipping Contact:", paymentData.shippingContact);
                    console.log("Full Payment Data (JSON):", JSON.stringify(paymentData, null, 2));
            
                    resolve({
                        status: ApplePaySession.STATUS_SUCCESS
                    });
                }
            };


            const configObj = {
                // Global Configuration
                // https://docs.adyen.com/online-payments/build-your-integration/advanced-flow/?platform=Web&integration=Components&version=6.5.1#add
                paymentMethodsResponse,
                clientKey: config.clientKey,
                locale: "en-US",
                countryCode,
                environment: config.environment,
                onSubmit: async (state, component, actions) => {
                    console.log('### applepay::onSubmit:: calling');

                    try {
                        document.getElementById("state-container").style.display = "none";

                        // Payment Request Data for /payments
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
                    console.log("### applepay::onAdditionalDetails:: calling");

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

                    } catch (error) {
                        console.error("Additional details processing error:", error);
                        actions.reject();
                    }
                },
                onPaymentCompleted: async (result, component) => {

                    console.log("### applepay::onPaymentCompleted:: calling");
                    console.log(result);

                    const applepayContainer = document.getElementById("applepay-container");
                    applepayContainer.innerHTML = `
                        <h2>Payment Result</h2>
                        <p><strong>Status:</strong> ${result.resultCode}</p>
                    `;

                },
                onPaymentFailed: async (result, component) => {

                    console.log("### applepay::onPaymentFailed:: calling");
                    console.log(result);

                    const applepayContainer = document.getElementById("applepay-container");
                    applepayContainer.innerHTML = `
                        <h2>Payment Result</h2>
                        <p><strong>Status:</strong> ${result.resultCode}</p>
                    `;

                },
                onError: (error, component) => {
                    console.error(error.name, error.message, error.stack, component);
                },
                onChange: updateStateContainer,
            };

            // Load Required Module from AdyenWeb
            const { AdyenCheckout, ApplePay } = window.AdyenWeb;
            // Initiate AdyenCheckout with global configuration
            const checkout = await AdyenCheckout(configObj);
            // Create component object to mount to DOM
            const applePayComponent = new ApplePay(checkout, applepayConfiguration);

            applePayComponent
               .isAvailable()
               .then(() => {
                   applePayComponent.mount("#applepay-container");
               })
               .catch(e => {
                   console.error("Apple Pay is not available.");
                   //Apple Pay is not available
               });

        } catch (error) {
            console.error("Error during initialization:", error);
        }
    });
});

