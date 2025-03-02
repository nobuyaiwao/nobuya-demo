document.addEventListener("DOMContentLoaded", () => {
    const testCardsHTML = `
        <h3>Test Cards</h3>
        <div class="test-card" data-card="4111111111111111">3DS Not Enrolled: <span class="copyable">4111 1111 1111 1111</span></div>
        <div class="test-card" data-card="4917610000000000">3DS Standard: <span class="copyable">4917 6100 0000 0000</span></div>
        <div class="test-card" data-card="4212345678910006">3DS Challenge: <span class="copyable">4212 3456 7891 0006</span></div>
        <div class="test-card" data-card="5201281505129736">3DS Frictionless: <span class="copyable">5201 2815 0512 9736</span></div>
    `;

    const container = document.getElementById("test-cards-container");
    if (container) {
        container.innerHTML = testCardsHTML;

        // クリックでカード番号をコピーするイベントを追加
        container.querySelectorAll(".copyable").forEach(element => {
            element.addEventListener("click", () => {
                const cardNumber = element.innerText.replace(/\s/g, ""); // 空白を除去
                navigator.clipboard.writeText(cardNumber).then(() => {
                    element.classList.add("copied");
                    setTimeout(() => element.classList.remove("copied"), 1000);
                    console.log(`Copied: ${cardNumber}`);
                }).catch(err => console.error("Copy failed", err));
            });
        });
    }
});

