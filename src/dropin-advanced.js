document.getElementById("start-payment").addEventListener("click", async () => {
    try {
        console.log("Fetching available payment methods...");

        // Call backend to get available payment methods
        const response = await fetch("/api/paymentMethods", { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ countryCode: "US", amount: { currency: "USD", value: 1000 } })
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch payment methods: ${response.statusText}`);
        }

        const paymentMethods = await response.json();
        console.log("Payment methods received:", paymentMethods);

        // Configure Adyen Checkout
        const configuration = {
            locale: "en_US",
            environment: "test", // Change to "live" in production
            clientKey: "your_adyen_client_key", // Replace with actual Client Key
            paymentMethodsResponse: paymentMethods,
            onSubmit: (state, dropin) => {
                console.log("Payment submitted:", state);
                // TODO: Call /api/payments to process the payment
            },
            onError: (error) => {
                console.error("Error:", error);
            }
        };

        // Mount Drop-in UI
        const checkout = new AdyenCheckout(configuration);
        checkout.create("dropin").mount("#dropin-container");
        console.log("Drop-in component mounted.");

    } catch (error) {
        console.error("Failed to load payment methods:", error);
    }
});

