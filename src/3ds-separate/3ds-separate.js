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

    const cardContainer = document.getElementById("card-container");
    if (!cardContainer) {
        console.error("card-container not found in the DOM.");
        return;
    }

    cardContainer.innerHTML = "<p>Processing your payment...</p>";

    try {
        // Call /payments/details with redirectResult
        const detailsResult = await makeDetails({ details: { redirectResult } });

        // Log details response in debug console
        updatePaymentsLog("Details Response", detailsResult);

        // Show final result in card-container
        cardContainer.innerHTML = `
            <h2>Payment Result</h2>
            <p><strong>Status:</strong> ${detailsResult.resultCode}</p>
        `;

        console.log("Details processed successfully:", detailsResult);
    } catch (error) {
        console.error("Error processing redirect result:", error);
    }
});


// 🔹 Function to initialize the 3D Secure separate flow
const initializePayment = async () => {
    console.log("Initializing payment...");

    const reference = generateReference();
    document.getElementById("reference").value = reference;
    document.getElementById("returnUrl").placeholder = generateReturnUrl(reference);

    const startPaymentButton = document.getElementById("start-payment");
    if (!startPaymentButton) {
        console.error("Start payment button not found!");
        return;
    }

    startPaymentButton.addEventListener("click", async () => {
        console.log("Starting payment...");
        document.querySelector(".input-container").style.display = "none";
        startPaymentButton.style.display = "none";

        const countryCode = document.getElementById("countryCode").value || "JP";
        const currency = document.getElementById("currency").value || "JPY";
        const value = parseInt(document.getElementById("amount").value || "5000", 10);
        const origin = window.location.origin;
        const reference = document.getElementById("reference")?.value;
        const returnUrl = document.getElementById("returnUrl")?.value || generateReturnUrl(reference);
        const nativeThreeDS = document.getElementById("nativeThreeDS")?.checked ? "preferred" : undefined;
        const shopperReference = document.getElementById("shopperReference")?.value || "guest";
        const recurringProcessingModel = document.getElementById("recurringProcessingModel")?.value || "CardOnFile";

        if (isNaN(value) || value <= 0) {
            console.error("Invalid amount value. Please enter a valid number.");
            return;
        }

        const pmReqConfig = {
            countryCode,
            amount: { currency, value }
        };

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
                locale: "en-US",
                environment: config.environment,
                countryCode,
                onSubmit: async (state, component, actions) => {
                    console.log("### 3ds-separate::onSubmit:: calling");
                    try {
                        //const paymentsReqData = {
                        //    ...state.data,
                        //    reference,
                        //    amount: { currency, value },
                        //    returnUrl: generateReturnUrl(reference),
                        //    origin,
                        //    channel: "Web"
                        //};
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
                            storePaymentMethod: true,
                            recurringProcessingModel
                        };

                        updatePaymentsLog("Payment Request", paymentsReqData);
                        const result = await makePayment(paymentsReqData);
                        updatePaymentsLog("Payment Response", result);

                        if (result.action && result.action.subtype === "challenge") {
                        //if (result.action && result.action.type === "threeDS2Challenge") {
                            sessionStorage.setItem("threeDSAction", JSON.stringify(result.action));
                            sessionStorage.setItem("countryCode", countryCode);
                            window.location.href = "challenge.html";
                            return;
                        }

                        actions.resolve(result);
                    } catch (error) {
                        console.error("Payment error:", error);
                        actions.reject();
                    }
                }
            };

            const { AdyenCheckout, Card } = window.AdyenWeb;
            const checkout = await AdyenCheckout(configObj);
            const card = new Card(checkout,cardConfiguration).mount("#card-container");

        } catch (error) {
            console.error("Error during initialization:", error);
        }
    });
};

document.addEventListener("DOMContentLoaded", initializePayment);

