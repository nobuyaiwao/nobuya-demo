import {
    getClientConfig,
    makeDetails,
    updatePaymentsLog
} from "../util.js";

// Function to get URL query parameters
const getQueryParam = (param) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
};

// 🔹 Load stored action from sessionStorage and process challenge
document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOM fully loaded, processing 3DS challenge...");

    const countryCode = sessionStorage.getItem("countryCode");
    const actionData = sessionStorage.getItem("threeDSAction");
    console.log(actionData);

    if (!actionData) {
        console.error("No 3DS challenge action found.");
        return;
    }

    const action = JSON.parse(actionData);
    //sessionStorage.removeItem("threeDSAction");

    try {
        const config = await getClientConfig();
        if (!config) throw new Error("Failed to load client config");

        const { AdyenCheckout } = window.AdyenWeb;
        const checkout = await AdyenCheckout({
            clientKey: config.clientKey,
            locale: "en-US",
            countryCode,
            environment: config.environment,
            //onAdditionalDetails: async (state, component, actions) => {
            //    // Make the /payments/details call and pass the resultCode back to the Component.
            //    const { action, resultCode } = await makeDetails(state.data);
            //    actions.resolve({ resultCode : resultCode });
            //},
            onAdditionalDetails: async (state, component, actions) => {
                console.log("### challenge::onAdditionalDetails:: calling");
                
                try {
                    updatePaymentsLog("Details Request", state.data);
                    const result = await makeDetails(state.data);
                    //const { action, resultCode } = result ; 
                    const { resultCode, action, order, donationToken } = result;
                    updatePaymentsLog("Details Response", result);

                    if (!result.resultCode) {
                        console.error("3DS Challenge failed: Missing resultCode.");
                        return;
                    }

                    console.log("Handling additional details:", { resultCode, action, order, donationToken });

                    actions.resolve({
                        resultCode,
                        action,
                        order,
                        donationToken,
                    });

                    //console.log("Challenge completed, redirecting back...");
                    //window.location.href = `index.html?redirectResult=${encodeURIComponent(result.resultCode)}`;

                } catch (error) {
                    console.error("Error processing 3DS challenge details:", error);
                }
            },
            onError(error) {
                console.log("### challenge::onError:: calling");
                console.log(error)
            },
            onPaymentCompleted(result, component) {
                console.log("### challenge::onPaymentCompleted:: calling");
                // Handle the successful payment flow.
                console.log(result);
            },
            onPaymentFailed(result, component) {
                console.log("### challenge::onPaymentFailed:: calling");
                // Handle the failed payment flow.
                console.log(result);
            }

        });

        checkout.createFromAction(action).mount("#challenge-container");
    } catch (error) {
        console.error("Error initializing 3DS challenge:", error);
    }
});

