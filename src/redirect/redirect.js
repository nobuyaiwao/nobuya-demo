function getQueryParams() {
    const params = new URLSearchParams(window.location.search);

    return {
        merchantAccount: params.get("merchantAccount") || "",
        env: params.get("env") || "",
        redirectResult: params.get("redirectResult") || "",
        payload: params.get("payload") || ""
    };
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (!element) {
        return;
    }

    if (!value) {
        element.textContent = "(empty)";
        return;
    }

    if (value.length > 120) {
        element.textContent = `${value.slice(0, 120)}...`;
        return;
    }

    element.textContent = value;
}

function setStatus(message, isError = false) {
    const statusElement = document.getElementById("status");
    if (!statusElement) {
        return;
    }

    statusElement.textContent = message;
    statusElement.className = isError ? "error" : "success";
}

function setResponse(data) {
    const responseArea = document.getElementById("responseArea");
    if (!responseArea) {
        return;
    }

    responseArea.textContent = JSON.stringify(data, null, 2);
}

async function submitDetails() {
    const button = document.getElementById("submit-details");
    const query = getQueryParams();

    if (!query.merchantAccount) {
        setStatus("merchantAccount is missing.", true);
        return;
    }

    if (!query.env) {
        setStatus("env is missing.", true);
        return;
    }

    if (!query.redirectResult && !query.payload) {
        setStatus("redirectResult or payload is required.", true);
        return;
    }

    try {
        button.disabled = true;
        setStatus("Submitting /payments/details ...");
        setResponse({ message: "Loading..." });

        const response = await fetch("/api/payments/details", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                details : {
                    redirectResult: query.redirectResult
                }
            })
        });

        const result = await response.json();

        if (!response.ok) {
            setStatus("Request failed.", true);
            setResponse(result);
            return;
        }

        setStatus("Request completed successfully.");
        setResponse(result);
    } catch (error) {
        setStatus("Unexpected error occurred.", true);
        setResponse({
            error: error.message
        });
    } finally {
        button.disabled = false;
    }
}

function init() {
    const query = getQueryParams();

    setText("merchantAccount", query.merchantAccount);
    setText("env", query.env);
    setText("redirectResult", query.redirectResult);
    setText("payload", query.payload);

    const button = document.getElementById("submit-details");
    if (button) {
        button.addEventListener("click", submitDetails);
    }
}

document.addEventListener("DOMContentLoaded", init);
