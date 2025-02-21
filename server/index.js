require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

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
app.use("/api", paymentRoutes); // All payment-related endpoints start with "/api"

// Root route - Serve the main index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../src/index.html"));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

