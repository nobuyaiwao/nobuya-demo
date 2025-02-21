require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const https = require("https");

// Import API routes
const paymentRoutes = require("./routes/payments");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON requests

// Serve static files (CSS, JS, and HTML)
app.use(express.static(path.join(__dirname, "../src"), { extensions: ["html", "js", "css"] }));

// API routes
app.use("/api", paymentRoutes);

// Root route - Serve the main index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../src/index.html"));
});

// Use HTTPS locally if NODE_ENV is "test"
if (process.env.NODE_ENV === "test") {
    try {
        const options = {
            key: fs.readFileSync("server.key"),
            cert: fs.readFileSync("server.crt"),
        };
        https.createServer(options, app).listen(PORT, () => {
            console.log(`HTTPS Server is running on https://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start HTTPS server:", error);
    }
} else {
    // Run normal HTTP server (for Heroku)
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

