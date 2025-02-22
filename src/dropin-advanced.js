import { getClientConfig, fetchPaymentMethods, makePayment, handleAdditionalDetails, updateStateContainer } from "./util.js";

document.addEventListener("DOMContentLoaded", () => {
    // 0. Get clientKey
    getClientConfig().then(config => {
        if (!config) throw new Error("Failed to load client config");

        console.log("Client config received:", config);

        const pmReqConfig = {
            countryCode: "JP"
        };

        // 1. Get available payment methods
        fetchPaymentMethods(pmReqConfig).then(async paymentMethodsResponse => {
            if (!paymentMethodsResponse) throw new Error("Failed to load payment methods");

            console.log("Payment methods received:", paymentMethodsResponse);
            // paymentMethodsResponse.paymentMethods.reverse(); // Uncomment if needed

            const configObj = {
                paymentMethodsResponse,
                clientKey: config.clientKey,
                locale: "ja-JP",
                environment: config.environment,
                countryCode: "JP",
                onChange: state => {
                    updateStateContainer(state); // Demo purposes only
                },
                onSubmit: async (state, component, actions) => {
                    console.log('### drop-in::onSubmit:: calling');
                    try {
                        const { action, resultCode } = await makePayment(state.data);
                        if (!resultCode) actions.reject();

                        actions.resolve({
                            resultCode,
                            action
                        });

                    } catch (error) {
                        console.error("Payment submission error:", error);
                        actions.reject();
                    }
                },
                onAdditionalDetails: (details) => {
                    console.log('### drop-in::onAdditionalDetails:: calling');
                    handleAdditionalDetails(details).then(response => {
                        console.log('### drop-in::onAdditionalDetails:: response', response);
                    });
                }
            };

            // 2. Create an instance of AdyenCheckout
            const { AdyenCheckout, Dropin } = window.AdyenWeb;
            const checkout = await AdyenCheckout(configObj);

            // 3. Mount Drop-in
            new Dropin(checkout).mount("#dropin-container");
            console.log("Drop-in component mounted.");
        }).catch(error => console.error("Error fetching payment methods:", error));
    }).catch(error => console.error("Error fetching client config:", error));
});

