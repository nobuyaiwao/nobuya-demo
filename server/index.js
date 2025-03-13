const express = require("express");
const cors = require("cors");
const path = require("path");

const paymentRoutes = require("./routes/payments");
const configRoutes = require("./routes/config");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

// Serve static files
app.use(express.static(path.join(__dirname, "../src"), { extensions: ["html", "js", "css"] }));

// API routes
app.use("/api", paymentRoutes);
app.use("/api/config", configRoutes);

// Root route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../src/index.html"));
});

// 3DS notification handler
let latest3DSNotification = null;

app.post("/own-3ds/notification", (req, res) => {
    const requestData = req.body || {};
    const threeDSMethodData = requestData.threeDSMethodData || null;
    const cres = requestData.cres || null;

    if (!threeDSMethodData && !cres) {
        console.error("Invalid 3DS notification received:", req.body);
        return res.status(400).send("Invalid request");
    }

    latest3DSNotification = { threeDSMethodData, cres };
    console.log("Processed 3DS notification:", latest3DSNotification);
    res.sendStatus(200);
});

// Notification check route
app.get("/own-3ds/notification-check", (req, res) => {
    res.json(latest3DSNotification || {});
});


// Giftcard
const giftcardRoutes = require("./routes/giftcard");
app.use("/api", giftcardRoutes);


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

