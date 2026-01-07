document.addEventListener("DOMContentLoaded", () => {
    // 1. URL se data nikalne ka tareeka
    const urlParams = new URLSearchParams(window.location.search);
    const dataFromUrl = urlParams.get('data');

    // 2. Agar URL mein data hai, to usay session mein save karo aur link saaf karo
    if (dataFromUrl) {
        sessionStorage.setItem('printData', dataFromUrl);
        // Link ko clean kar ke sirf /products/print kar do
        window.history.replaceState(null, "", "/products/print");
    }

    // 3. Print Button Logic
    let printBtn = document.querySelector("#print-bill");
    if (printBtn) {
        printBtn.addEventListener("click", () => {
            window.print();
        });
    }
});