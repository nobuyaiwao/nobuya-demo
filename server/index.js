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

if (process.env.NODE_ENV === "test") {
    try {
        const certPath = path.join(__dirname, "certs");
        const options = {
            key: fs.readFileSync(path.join(certPath, "server.key")),
            cert: fs.readFileSync(path.join(certPath, "server.crt")),
        };

        https.createServer(options, app).listen(PORT, () => {
            console.log(`HTTPS Server is running on https://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start HTTPS server:", error);
        console.log("Falling back to HTTP mode.");
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    }
} else {
    // Heroku should not use HTTPS manually
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

