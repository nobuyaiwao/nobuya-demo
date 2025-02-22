// 🔹 Fetch payment methods from the backend
export const fetchPaymentMethods = async (options) => {
    try {
        const payload = {
            countryCode: options.countryCode || "US",
            amount: {
                currency: options.currency || "USD",
                value: options.amount || 1000
            }
        };

        const response = await fetch("/api/paymentMethods", { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch payment methods: ${response.statusText}`);
        }

        const paymentMethods = await response.json();
        console.log("Payment methods received:", paymentMethods);
        return paymentMethods;

    } catch (error) {
        console.error("Error fetching payment methods:", error);
        return null;
    }
};

// 🔹 Get Client Key and Environment from /api/config
export const getClientConfig = async () => {
    try {
        const response = await fetch("/api/config");
        if (!response.ok) {
            throw new Error(`Failed to fetch config: ${response.statusText}`);
        }

        const config = await response.json();
        console.log("Client configuration received:", config);
        return config;

    } catch (error) {
        console.error("Error fetching client config:", error);
        return null;
    }
};

// 🔹 Process payment (this will be implemented later)
export const makePayment = async (paymentData) => {
    console.log("Processing payment:", paymentData);
    // TODO: Implement API call to /api/payments
    return { resultCode: "Authorised", action: null };
};

// 🔹 Handle additional payment details (3DS, etc.)
export const handleAdditionalDetails = async (details) => {
    console.log("Handling additional details:", details);
    // TODO: Implement API call to /api/paymentDetails
    return { resultCode: "Authorised" };
};

// 🔹 Update UI state container (for debugging/demo purposes)
export const updateStateContainer = (state) => {
    console.log("Updating state container:", state);
};

