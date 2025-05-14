// Secured Fields event handlers

export function onConfigSuccess(pCallbackObj) {
    document.querySelector("#card-container").style.display = "block";
    document.querySelector(".card-input__spinner__holder").style.display = "none";


    setTimeout(() => {
        if (window.securedFields) {
            window.securedFields.setFocusOn("encryptedCardNumber");
        }
    }, 100);
}

export function onBrand(pCallbackObj) {
    const cvcField = document.querySelector(".pm-form-label--cvc");

    if (pCallbackObj.cvcPolicy === "hidden") {
        cvcField && (cvcField.style.display = "none");
    } else {
        cvcField && (cvcField.style.display = "block");
    }

    if (pCallbackObj.cvcPolicy === "optional") {
        const label = cvcField?.querySelector(".pm-form-label__text");
        if (label) label.innerText = "CVV/CVC (optional):";
    } else {
        const label = cvcField?.querySelector(".pm-form-label__text");
        if (label) label.innerText = "CVV/CVC:";
    }

    const brandLogo = document.querySelector(".pm-image-1");
    if (brandLogo && pCallbackObj.brandImageUrl) {
        brandLogo.setAttribute("src", pCallbackObj.brandImageUrl);
        brandLogo.setAttribute("alt", pCallbackObj.brand);
    }
}

export function onFocus(pCallbackObj) {
    //const field = document.querySelector(`[data-cse="${pCallbackObj.fieldType}"]`);
    const field = pCallbackObj.rootNode?.querySelector(`[data-cse="${pCallbackObj.fieldType}"]`);

    if (!field) return;

    if (pCallbackObj.focus) {
        field.classList.add("pm-input-field--focus");
    } else {
        field.classList.remove("pm-input-field--focus");
    }
}

export function setCCErrors(pCallbackObj) {
    //const field = document.querySelector(`[data-cse="${pCallbackObj.fieldType}"]`);
    const field = pCallbackObj.rootNode?.querySelector(`[data-cse="${pCallbackObj.fieldType}"]`);

    const errorText = field?.parentElement?.querySelector(".pm-form-label__error-text");
    if (!field || !errorText) return;

    if (pCallbackObj.error) {
        field.classList.add("pm-input-field--error");
        errorText.innerText = pCallbackObj.errorI18n || "Invalid input.";
        errorText.style.display = "block";
    } else {
        field.classList.remove("pm-input-field--error");
        errorText.innerText = "";
        errorText.style.display = "none";
    }
}

export function onBinLookup(pCallbackObj) {
    // 今回は dual branding を扱わない想定で空実装
}

export function onChangeV5(state, component) {
    if (Object.keys(state.errors).length > 0) {
        const errors = Object.entries(state.errors).map(([fieldType, error]) => {
            return {
                fieldType,
                ...(error || { error: "", rootNode: component._node })
            };
        });
        errors.forEach(setCCErrors);
    }

    // 必要に応じて状態表示など反映
    const container = document.getElementById("state-container");
    if (container) {
        container.innerText = JSON.stringify(state, null, 2);
    }
} 

