document.addEventListener("DOMContentLoaded", () => {
    // 1. URL se ganda/lamba data nikalna
    const urlParams = new URLSearchParams(window.location.search);
    const salesData = urlParams.get('data');

    // 2. Agar URL mein data maujood hai
    if (salesData) {
        // Data ko session mein save kar lo taake refresh par kaam chalta rahe
        sessionStorage.setItem('lastSalesPrint', salesData);
        
        // 🟢 URL MASKING: Link ko foran clean kar do
        window.history.replaceState(null, "", "/sales/print");
    }

    // 3. Print Button Logic
    let printBtn = document.querySelector("#print-bill");
    if (printBtn) {
        printBtn.addEventListener("click", () => {
            window.print();
        });
    }
});