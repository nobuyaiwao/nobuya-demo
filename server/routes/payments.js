const express = require("express");
const axios = require("axios");
require("dotenv").config();

const router = express.Router();

// Get API version from environment variables (default to v71)
const API_VERSION = process.env.API_VERSION || "v71";

// Determine the Adyen API endpoint based on environment
let ADYEN_API_URL;

if (process.env.ADYEN_ENVIRONMENT === "test") {
    // Test environment uses a fixed URL structure
    ADYEN_API_URL = `https://checkout-test.adyen.com/${API_VERSION}`;
} else {
    // Live environment constructs the URL using the prefix
    const prefix = process.env.ENDPOINT_PREFIX;
    if (!prefix) {
        throw new Error("ENDPOINT_PREFIX is required in live mode.");
    }
    ADYEN_API_URL = `https://${prefix}-checkout-live.adyenpayments.com/checkout/${API_VERSION}`;
}

console.log(`Using Adyen API URL: ${ADYEN_API_URL}`);

// 🔹 Fetch available payment methods from Adyen
router.post("/paymentMethods", async (req, res) => {
    try {
        // Extend the request body with merchantAccount
        const requestData = {
            ...req.body,
            merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT
        };

        const response = await axios.post(`${ADYEN_API_URL}/paymentMethods`, requestData, {
            headers: {
                "X-API-Key": process.env.ADYEN_API_KEY,
                "Content-Type": "application/json"
            }
        });

        console.log("Successfully fetched payment methods.");
        res.json(response.data);
    } catch (error) {
        console.error("Error fetching payment methods:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch payment methods" });
    }
});

// 🔹 Process payments via Adyen
router.post("/payments", async (req, res) => {
    try {
        console.log("Received /payments request:", JSON.stringify(req.body, null, 2));

        // Build the payment request
        const paymentRequest = {
            ...req.body,
            merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT
        };

        // Send the request to Adyen
        const response = await axios.post(`${ADYEN_API_URL}/payments`, paymentRequest, {
            headers: {
                "X-API-Key": process.env.ADYEN_API_KEY,
                "Content-Type": "application/json"
            }
        });

        console.log("Adyen /payments response:", JSON.stringify(response.data, null, 2));
        res.json(response.data);

    } catch (error) {
        console.error("Error processing payment:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ error: "Failed to process payment" });
    }
});

// 🔹 Handle /payments/details for additional authentication (3DS, etc.)
router.post("/payments/details", async (req, res) => {
    try {
        console.log("Received /payments/details request:", JSON.stringify(req.body, null, 2));

        // Send the request to Adyen
        const response = await axios.post(`${ADYEN_API_URL}/payments/details`, req.body, {
            headers: {
                "X-API-Key": process.env.ADYEN_API_KEY,
                "Content-Type": "application/json"
            }
        });

        console.log("Adyen /payments/details response:", JSON.stringify(response.data, null, 2));
        res.json(response.data);

    } catch (error) {
        console.error("Error processing /payments/details:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ error: "Failed to process additional details" });
    }
});

module.exports = router;

