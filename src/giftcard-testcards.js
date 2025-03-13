document.addEventListener("DOMContentLoaded", () => {
    const giftcardTestCardsHTML = `
        <h3>Gift Card Test Numbers</h3>
        <div class="test-card" data-card="6036280000000000000">SVS: <span class="copyable">6036 2800 0000 0000 000</span></div>
        <div class="test-card" data-card="7401234567890123">Givex: <span class="copyable">7401 2345 6789 0123</span></div>
        <div class="test-card" data-card="676781100000000000">Valuelink: <span class="copyable">6767 8110 0000 0000 00</span></div>
        <div class="test-card" data-card="7777182700000000000">Epay: <span class="copyable">7777 1827 0000 0000 000</span></div>
    `;

    const container = document.getElementById("test-cards-container");
    if (container) {
        container.innerHTML += giftcardTestCardsHTML;

        container.querySelectorAll(".copyable").forEach(element => {
            element.addEventListener("click", () => {
                const cardNumber = element.innerText.replace(/\s/g, ""); 
                navigator.clipboard.writeText(cardNumber).then(() => {
                    element.classList.add("copied");
                    setTimeout(() => element.classList.remove("copied"), 1000);
                    console.log(`Copied: ${cardNumber}`);
                }).catch(err => console.error("Copy failed", err));
            });
        });
    }
});

