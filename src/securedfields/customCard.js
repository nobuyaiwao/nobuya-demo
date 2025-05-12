import {setFocus, onBrand, onConfigSuccess, onBinLookup, setCCErrors, onChange, onChangeV5} from './customCards.config.js';

/**
 * IMPORTANT - Set a boolean indicating whether index.html is loading a version of adyen.js (& adyen.css) >= 5.0.0
 */
const IS_VERSION_5 = true;

// 0. Get clientKey
getClientKey().then(async clientKey => {

    const configObj = {
        clientKey   : clientKey,
        environment : 'test',
        locale      : 'en-GB',
//        paymentMethodsResponse: mockPaymentMethodsResponse
    }

    // 1. Create an instance of AdyenCheckout
    window.checkout = await AdyenCheckout(configObj);

    window.securedFields = checkout
        .create('securedfields', {
            type: 'card',
            brands  : ['mc', 'visa', 'amex', 'bcmc', 'maestro', 'cartebancaire'],
            onConfigSuccess,
            onBrand,
            onFocus : setFocus,
            onBinLookup,
            onChange : (state, component) => {
                console.log("onChange called.");
                console.log(state);
                console.log(component);

                onChangeV5(state, component);
                // In v5, we enhance the securedFields state.errors object with a rootNode prop
                // but calling updateStateContainer with the ref to this rootNode element will cause a "Converting circular structure to JSON" error
                // so replace any rootNode values in the objects in state.errors with an empty string
                if (!!Object.keys(state.errors).length) {
                    const nuErrors = Object.entries(state.errors).reduce((acc, [fieldType, error]) => {
                        acc[fieldType] = error ? {...error, rootNode : ''} : error;
                        return acc;
                    }, {});
                    state.errors = nuErrors;
                }

                updateStateContainer(state);// Demo purposes only
            }
        })
        .mount('#card-container');

    createPayButton('#card-container', window.securedFields, 'securedfields');

    function createPayButton(parent, component, attribute) {
        const payBtn = document.createElement('button');

        payBtn.textContent = 'Pay';
        payBtn.name = 'pay';
        payBtn.classList.add('adyen-checkout__button', 'js-components-button--one-click', `js-${attribute}`);

        payBtn.addEventListener('click', e => {
            e.preventDefault();

            if (!component.isValid) {
                return component.showValidation();
            }

            // Device Fingerprint
            let dfvalue = document.getElementById("dfvalue").value ;
            console.log("Device Fingerprint : " + dfvalue);
            console.log(component);
            //let clientData = component.state.data.riskData.clientData ;
            //console.log("Client Data : " + clientData);

            // formatData
            const paymentMethod = {
                type : 'scheme',
                ...component.state.data
            };
            component.state.data = {paymentMethod};

            makePayment(component.state.data);

            payBtn.style.opacity = '0.5';
        });

        document.querySelector(parent).appendChild(payBtn);

        return payBtn;
    }
});

