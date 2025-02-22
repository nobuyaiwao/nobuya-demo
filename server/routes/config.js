const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.json({
        clientKey: process.env.ADYEN_CLIENT_KEY || "test_xxxxxxxxxxxxx",
        environment: process.env.ADYEN_ENVIRONMENT || "test"
    });
});

module.exports = router;

