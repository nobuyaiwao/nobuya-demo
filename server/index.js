require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const https = require("https");

const paymentRoutes = require("./routes/payments");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (CSS, JS, and HTML)
app.use(express.static(path.join(__dirname, "../src"), { extensions: ["html", "js", "css"] }));

// API routes
app.use("/api", paymentRoutes);

// Root route - Serve the main index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../src/index.html"));
});

// Determine the environment and start the appropriate server
if (process.env.ON_HEROKU === "true") {
    // 🔹 Running on Heroku (Heroku automatically handles HTTPS, so we use HTTP)
    app.listen(PORT, () => {
        console.log(`Running on Heroku → Server is running on http://localhost:${PORT}`);
    });
}

