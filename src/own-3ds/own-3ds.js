import {
    getClientConfig,
    fetchPaymentMethods,
    makePayment,
    makeDetails,
    updateStateContainer,
    updatePaymentsLog,
    generateReference,
    generateReturnUrl,
    handleTestCardCopying,
    overrideConsoleLog,
    setupGlobalErrorHandler
} from "../util.js";

// Coonsole override
document.addEventListener("DOMContentLoaded", () => {
    overrideConsoleLog();
    setupGlobalErrorHandler();
});

handleTestCardCopying();

// Load shared test-cards.js
const script = document.createElement("script");
script.src = "/test-cards.js";
document.body.appendChild(script);

document.addEventListener("DOMContentLoaded", async () => {
    console.log("3DS2 Custom Flow Initialized");

    const referenceField = document.getElementById("reference");
    const returnUrlField = document.getElementById("returnUrl");

    if (referenceField && returnUrlField) {
        const reference = generateReference();
        referenceField.value = reference;
        returnUrlField.placeholder = generateReturnUrl(reference);
    }

    handleTestCardCopying();

    const startPaymentButton = document.getElementById("start-payment");
    startPaymentButton.addEventListener("click", async () => {
        console.log("Starting 3DS2 Payment Flow");

        document.querySelector(".input-container").style.display = "none";
        startPaymentButton.style.display = "none";

        const countryCode = document.getElementById("countryCode").value || "JP";
        const currency = document.getElementById("currency").value || "JPY";
        const value = parseInt(document.getElementById("amount").value || "5000", 10);
        const reference = document.getElementById("reference").value;
        const returnUrl = document.getElementById("returnUrl").value || generateReturnUrl(reference);
        const nativeThreeDS = document.getElementById("nativeThreeDS").checked ? "preferred" : undefined;
        const threeDSRequestorChallengeInd = document.getElementById("threeDSRequestorChallengeInd").value;
        const shopperReference = document.getElementById("shopperReference").value;
        const recurringProcessingModel = document.getElementById("recurringProcessingModel").value;
        const notificationURL = window.location.origin + "/own-3ds/notification";
        
        if (isNaN(value) || value <= 0) {
            console.error("Invalid amount value");
            return;
        }

        try {
            const config = await getClientConfig();
            const paymentMethodsResponse = await fetchPaymentMethods({ countryCode, amount: { currency, value } });
            
            const { AdyenCheckout, Card } = window.AdyenWeb;
            const checkout = await AdyenCheckout({
                paymentMethodsResponse,
                clientKey: config.clientKey,
                locale: "ja-JP",
                environment: config.environment,
                countryCode,
                onChange: updateStateContainer,
                onSubmit: async (state, component) => {
                    const paymentData = {
                        ...state.data,
                        reference,
                        amount: { currency, value },
                        returnUrl,
                        channel: "Web",
                        shopperReference,
                        recurringProcessingModel,
                        threeDS2RequestData: { 
                            notificationURL,
                            threeDSRequestorChallengeInd
                        },
                        authenticationData: nativeThreeDS ? { threeDSRequestData: { nativeThreeDS } } : undefined
                    };
                    updatePaymentsLog("Payment Request", paymentData);
                    const result = await makePayment(paymentData);
                    updatePaymentsLog("Payment Response", result);
                    handle3DSFlow(result, component);
                },
                onAdditionalDetails: async (state, component) => {
                    updatePaymentsLog("Details Request", state.data);
                    const result = await makeDetails(state.data);
                    updatePaymentsLog("Details Response", result);
                    handle3DSFlow(result, component);
                }
            });
            
            const cardConfiguration = {
                hasHolderName: false,
                enableStoreDetails: true
            };
            
            const card = new Card(checkout, cardConfiguration).mount("#card-container");
        } catch (error) {
            console.error("Error initializing 3DS2 flow", error);
        }
    });
});


// Handle 3DS manually
async function handle3DSFlow(result, component) {
    if (!result.resultCode) {
        console.error("No resultCode in response");
        return;
    }

    switch (result.resultCode) {
        case "IdentifyShopper":
            console.log("Processing IdentifyShopper");
            await initiate3DSFingerprinting(result.action);
            break;
        case "ChallengeShopper":
            console.log("Processing ChallengeShopper");
            await initiate3DSChallenge(result.action);
            break;
        case "Authorised":
            document.getElementById("card-container").innerHTML = "<h2>Payment Successful</h2>";
            break;
        default:
            console.warn("Unhandled resultCode:", result.resultCode);
    }
}

// Initiate 3DS Fingerprinting
async function initiate3DSFingerprinting(action) {
    if (!action || !action.token) {
        console.error("Invalid action token", action);
        return;
    }

    const decodedData = JSON.parse(atob(action.token));
    const threeDSServerTransID = decodedData.threeDSServerTransID;
    const notificationURL = window.location.origin + "/own-3ds/notification";

    const dataObj = {
        threeDSServerTransID: threeDSServerTransID,
        threeDSMethodNotificationURL: notificationURL
    };
    const stringifiedDataObject = JSON.stringify(dataObj);
    const encodedJSON = btoa(stringifiedDataObject)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, ""); 

    const form = document.createElement("form");
    form.method = "POST";
    form.action = decodedData.threeDSMethodUrl;
    form.id = "3dform";
    form.target = "threeDSIframe";

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "threeDSMethodData";
    input.value = encodedJSON;
    form.appendChild(input);

    const iframe = document.createElement("iframe");
    iframe.name = "threeDSIframe";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);
    document.body.appendChild(form);

    form.submit();
    console.log("3DS Fingerprinting Initiated");

    listenFor3DSNotification(threeDSServerTransID, action);
}

// Listen to 3DS notifications
let notificationReceived = false;

async function listenFor3DSNotification(threeDSServerTransID, action) {
    let attempts = 0;
    const maxAttempts = 10; 

    while (attempts < maxAttempts) {
        try {
            const response = await fetch("/own-3ds/notification-check");
            const data = await response.json();

            if (data.threeDSMethodData) {
                const receivedThreeDSServerTransID = JSON.parse(atob(data.threeDSMethodData)).threeDSServerTransID;

                if (receivedThreeDSServerTransID === threeDSServerTransID) {
                    notificationReceived = true;
                    console.log("3DS Notification received, proceeding to /details");
                    break;
                }
            }
        } catch (error) {
            console.error("Error checking 3DS notification", error);
        }

        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 1000)); 
    }

    // call details
    sendDetailsRequest(action);
}

async function sendDetailsRequest(action) {
    const threeDSCompInd = notificationReceived ? "Y" : "N";
    const fingerprintData = JSON.stringify({ threeDSCompInd });
    const fingerprintEncoded = btoa(fingerprintData)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, ""); // Base64URL encoding

    const detailsRequest = {
        details: {
            "threeds2.fingerprint": fingerprintEncoded
        },
        paymentData: action.paymentData
    };

    const result = await makeDetails(detailsRequest);
    updatePaymentsLog("Details Response", result);
    handle3DSFlow(result);
}

async function initiate3DSChallenge(action) {
    if (!action || !action.token ) {
        console.error("Invalid ChallengeShopper action", action);
        return;
    }

    const decodedToken = JSON.parse(atob(action.token));
    
    const cReqData = {
        threeDSServerTransID: decodedToken['threeDSServerTransID'],
        acsTransID: decodedToken['acsTransID'],
        messageVersion: decodedToken['messageVersion'],
        challengeWindowSize: '05',
        messageType: 'CReq'
    };
    
    const stringifiedDataObject = JSON.stringify(cReqData);
    const encodedcReq = btoa(stringifiedDataObject)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

    const form = document.createElement("form");
    form.method = "POST";
    form.action = decodedToken.acsURL;
    form.id = "3dschallenge";
    form.target = "threeDSChallengeIframe";
    
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "creq";
    input.value = encodedcReq;
    form.appendChild(input);
    
    const iframe = document.createElement("iframe");
    iframe.name = "threeDSChallengeIframe";
    iframe.style.width = "100%";
    iframe.style.height = "400px";
    iframe.style.border = "none";
    
    const challengeContainer = document.getElementById("card-container");
    challengeContainer.innerHTML = "";
    challengeContainer.appendChild(iframe);
    challengeContainer.appendChild(form);
    
    form.submit();
    console.log("3DS Challenge Initiated");

    listenFor3DSChallengeNotification(action);
}

// Listen for 3DS Challenge notification (CRes)
async function listenFor3DSChallengeNotification(action) {
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
        try {
            const response = await fetch("/own-3ds/notification-check");
            const data = await response.json();

            if (data.cres) {
                console.log("3DS Challenge notification received, proceeding to /details");
                sendChallengeDetailsRequest(action, data.cres);
                return;
            }
        } catch (error) {
            console.error("Error checking 3DS Challenge notification", error);
        }

        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    console.error("3DS Challenge result not received in time");
}

// Send /details request for ChallengeShopper
async function sendChallengeDetailsRequest(action, cres) {
    const detailsRequest = {
        details: {
            "threeds2.challengeResult": cres
        },
        paymentData: action.paymentData
    };

    const result = await makeDetails(detailsRequest);
    updatePaymentsLog("Details Response", result);
    handle3DSFlow(result);
}

