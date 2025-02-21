const express = require("express");
const axios = require("axios");
require("dotenv").config();

const router = express.Router();

// Get API version from environment variables (default to v71)
const API_VERSION = process.env.API_VERSION || "v71";

// Determine the Adyen API endpoint based on environment
let ADYEN_API_URL;

if (process.env.NODE_ENV === "test") {
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

// Fetch available payment methods from Adyen
router.post("/paymentMethods", async (req, res) => {
    try {
        const response = await axios.post(`${ADYEN_API_URL}/paymentMethods`, {
            merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
            countryCode: req.body.countryCode || "US",
            amount: req.body.amount || { currency: "USD", value: 1000 },
            shopperLocale: "en_US",
            channel: "Web"
        }, {
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

module.exports = router;

