const express = require("express");
const axios = require("axios");
require("dotenv").config();

const router = express.Router();
const API_VERSION = process.env.API_VERSION || "v71";

let ADYEN_API_URL;
if (process.env.ADYEN_ENVIRONMENT === "test") {
    ADYEN_API_URL = `https://checkout-test.adyen.com/${API_VERSION}`;
} else {
    const prefix = process.env.ENDPOINT_PREFIX;
    if (!prefix) {
        throw new Error("ENDPOINT_PREFIX is required in live mode.");
    }
    ADYEN_API_URL = `https://${prefix}-checkout-live.adyenpayments.com/checkout/${API_VERSION}`;
}

console.log(`Using Adyen API URL for Sessions: ${ADYEN_API_URL}`);

// 🔹 Create a session for Drop-in
router.post("/sessions", async (req, res) => {
    try {
        console.log("Received /sessions request:", JSON.stringify(req.body, null, 2));

        const sessionRequest = {
            ...req.body,
            merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
            returnUrl: req.body.returnUrl || `${req.protocol}://${req.get("host")}/return`,
            channel: "Web",
        };

        const response = await axios.post(`${ADYEN_API_URL}/sessions`, sessionRequest, {
            headers: {
                "X-API-Key": process.env.ADYEN_API_KEY,
                "Content-Type": "application/json"
            }
        });

        console.log("Adyen /sessions response:", JSON.stringify(response.data, null, 2));
        res.json(response.data);
    } catch (error) {
        console.error("Error creating session:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ error: "Failed to create session" });
    }
});

module.exports = router;

