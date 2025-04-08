const express = require("express");
const axios = require("axios");
require("dotenv").config();

const router = express.Router();

// APIバージョンの設定
const API_VERSION = process.env.API_VERSION || "v71";

// Adyen APIのURL設定
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

console.log(`Using Adyen API URL for Giftcard: ${ADYEN_API_URL}`);

// Balance check
router.post("/balance", async (req, res) => {
    try {
        console.log("Received /balance request:", JSON.stringify(req.body, null, 2));

        const balanceRequest = {
            ...req.body,
            amount: req.body.amount || { currency: "USD", value: 2000 }, 
            merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT
        };

        const response = await axios.post(`${ADYEN_API_URL}/paymentMethods/balance`, balanceRequest, {
            headers: {
                "X-API-Key": process.env.ADYEN_API_KEY,
                "Content-Type": "application/json"
            }
        });

        console.log("Adyen /balance response:", JSON.stringify(response.data, null, 2));
        res.json(response.data);
    } catch (error) {
        console.error("Error checking balance:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ error: "Failed to check balance" });
    }
});

// Order request
router.post("/orders", async (req, res) => {
    try {
        console.log("Received /orders request:", JSON.stringify(req.body, null, 2));

        const { amount } = req.body;
        const reference = `order-${new Date().toISOString()}`; 

        const orderRequest = {
            amount,
            reference,
            merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT
        };

        const response = await axios.post(`${ADYEN_API_URL}/orders`, orderRequest, {
            headers: {
                "X-API-Key": process.env.ADYEN_API_KEY,
                "Content-Type": "application/json"
            }
        });

        console.log("Adyen /orders response:", JSON.stringify(response.data, null, 2));
        res.json(response.data);
    } catch (error) {
        console.error("Error creating order:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ error: "Failed to create order" });
    }
});


// Cancel Order
router.post("/orders/cancel", async (req, res) => {
    try {
        console.log("Received /orders/cancel request:", JSON.stringify(req.body, null, 2));

        const cancelRequest = {
            ...req.body,
            merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT
        };

        const response = await axios.post(`${ADYEN_API_URL}/orders/cancel`, cancelRequest, {
            headers: {
                "X-API-Key": process.env.ADYEN_API_KEY,
                "Content-Type": "application/json"
            }
        });

        console.log("Adyen /orders/cancel response:", JSON.stringify(response.data, null, 2));
        res.json(response.data);
    } catch (error) {
        console.error("Error cancelling order:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ error: "Failed to cancel order" });
    }
});

module.exports = router;

