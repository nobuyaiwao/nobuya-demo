// 🔹 Handle test card copying
export const handleTestCardCopying = () => {
    document.addEventListener("DOMContentLoaded", () => {
        document.querySelectorAll(".copy-btn").forEach(button => {
            button.addEventListener("click", (event) => {
                event.stopPropagation();
                const cardNumber = button.parentElement.dataset.card;
                navigator.clipboard.writeText(cardNumber).then(() => {
                    console.log(`Copied card number: ${cardNumber}`);
                    button.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    setTimeout(() => button.innerHTML = '<i class="fas fa-copy"></i> Copy', 1500);
                }).catch(err => console.error("Failed to copy card number:", err));
            });
        });
    });
};

// 🔹 Generate a merchant reference
export const generateReference = () => {
    const now = new Date();
    return `nobuya-demo-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-` +
           `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
};

//// 🔹 Generate return URL (redirects back to index.html)
//export const generateReturnUrl = () => {
//    const host = window.location.origin;
//    return `${host}/index.html`;
//};

// 🔹 Generate return URL dynamically based on the current path
export const generateReturnUrl = () => {
    const host = window.location.origin;
    const path = window.location.pathname.split("/").slice(0, -1).join("/"); // Get the current directory
    return `${host}${path}/index.html`;
};


// 🔹 Fetch payment methods from the backend
export const fetchPaymentMethods = async (options) => {
    try {
        const response = await fetch("/api/paymentMethods", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(options)  // ✅ Directly use options
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

// 🔹 Process the payment request and log API calls
export const makePayment = async (paymentData) => {
    console.log("Processing payment:", paymentData);

    try {
        // 🔹 Log the request before sending
        updatePaymentsLog("[/payments] Request", paymentData);

        const response = await fetch("/api/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(paymentData),
        });

        const responseData = await response.json();
        console.log("Payment response:", responseData);

        // 🔹 Log the response after receiving
        updatePaymentsLog("[/payments] Response", responseData);

        return responseData;

    } catch (error) {
        console.error("Error processing payment:", error);

        // 🔹 Log the error
        updatePaymentsLog("[/payments] Error", { error: error.message });

        return { error: "Payment failed" };
    }
};

// 🔹 Process additional payment details (3DS, etc.) and log API calls
export const makeDetails = async (detailsData) => {
    console.log("Processing additional details:", detailsData);

    try {
        // 🔹 Log the request before sending
        updatePaymentsLog("[/payments/details] Request", detailsData);

        const response = await fetch("/api/payments/details", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(detailsData),
        });

        const responseData = await response.json();
        console.log("Details response:", responseData);

        // 🔹 Log the response after receiving
        updatePaymentsLog("[/payments/details] Response", responseData);
        return responseData;
    } catch (error) {
        console.error("Error processing additional details:", error);
        updatePaymentsLog("[/payments/details] Error", { error: error.message });
        return { error: "Details processing failed" };
    }
};

// 🔹 Update the state container (debug console)
export const updateStateContainer = (state) => {
    const stateContainer = document.getElementById("state-container");
    if (stateContainer) {
        stateContainer.textContent = JSON.stringify(state, null, 2);
    }
};

// 🔹 Update the payments log in the debug console
export const updatePaymentsLog = (type, data) => {
    const paymentsContainer = document.getElementById("payments-container");
    if (!paymentsContainer) return;

    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${type}:\n${JSON.stringify(data, null, 2)}\n\n`;

    paymentsContainer.textContent = logEntry + paymentsContainer.textContent;
};



//// 🔹 Process the payment request
//export const makePayment = async (paymentData) => {
//    console.log("Processing payment:", paymentData);
//
//    try {
//        // 🔹 Log the request before sending
//        updatePaymentsLog("Payment Request", paymentData);
//
//        const response = await fetch("/api/payments", {
//            method: "POST",
//            headers: { "Content-Type": "application/json" },
//            body: JSON.stringify(paymentData),
//        });
//
//        const responseData = await response.json();
//        console.log("Payment response:", responseData);
//
//        // 🔹 Log the response after receiving
//        updatePaymentsLog("Payment Response", responseData);
//
//        return responseData;
//
//    } catch (error) {
//        console.error("Error processing payment:", error);
//
//        // 🔹 Log the error
//        updatePaymentsLog("Payment Error", { error: error.message });
//
//        return { error: "Payment failed" };
//    }
//};
//
////// 🔹 Handle additional payment details (3DS, etc.)
////export const handleAdditionalDetails = async (details) => {
////    console.log("Handling additional details:", details);
////    // TODO: Implement API call to /api/paymentDetails
////    return { resultCode: "Authorised" };
////};
//
//// 
//export const makeDetails = async (detailsData) => {
//    console.log("Processing additional details:", detailsData);
//
//    try {
//        updatePaymentsLog("Details Request", detailsData);
//
//        const response = await fetch("/api/payments/details", {
//            method: "POST",
//            headers: { "Content-Type": "application/json" },
//            body: JSON.stringify(detailsData),
//        });
//
//        const responseData = await response.json();
//        console.log("Details response:", responseData);
//
//        updatePaymentsLog("Details Response", responseData);
//        return responseData;
//    } catch (error) {
//        console.error("Error processing additional details:", error);
//        updatePaymentsLog("Details Error", { error: error.message });
//        return { error: "Details processing failed" };
//    }
//};
//
//
//// 🔹 Update the state container (debug console)
//export const updateStateContainer = (state) => {
//    const stateContainer = document.getElementById("state-container");
//    if (stateContainer) {
//        stateContainer.textContent = JSON.stringify(state, null, 2);
//    }
//};
//
//// 🔹 Update the payments log in the debug console
//export const updatePaymentsLog = (type, data) => {
//    const paymentsContainer = document.getElementById("payments-container");
//    if (!paymentsContainer) return;
//
//    const timestamp = new Date().toLocaleTimeString();
//    const logEntry = `[${timestamp}] ${type}:\n${JSON.stringify(data, null, 2)}\n\n`;
//
//    paymentsContainer.textContent = logEntry + paymentsContainer.textContent;
//};
//
