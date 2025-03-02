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

// 3DS notification endpoint
let latestThreeDSMethodData = null;

app.post("/own-3ds/notification", (req, res) => {
    console.log("Raw 3DS notification body:", req.body); 

    const threeDSMethodData = req.body.threeDSMethodData || (req.body && Object.keys(req.body)[0]);

    if (!threeDSMethodData) {
        console.error("Invalid 3DS notification received:", req.body);
        return res.status(400).send("Invalid request");
    }

    console.log("Processed 3DS notification:", threeDSMethodData);
    latestThreeDSMethodData = threeDSMethodData;
    res.sendStatus(200);
});

// Notification check route
app.get("/own-3ds/notification-check", (req, res) => {
    res.json({ threeDSMethodData: latestThreeDSMethodData });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

