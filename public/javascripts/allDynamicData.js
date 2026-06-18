// 1. FILTER LOGIC
function applyFilter() {
    const brandFilter = document.getElementById("brandFilter");
    const tableRows = document.querySelectorAll("#itemsTable tbody tr:not(.no-data-row)");
    if (!brandFilter) return;
    
    const selectedValue = brandFilter.value.trim();

    tableRows.forEach(row => {
        const rowBrand = row.getAttribute("data-brand");
        if (selectedValue === "all" || rowBrand === selectedValue) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}

// 2. FORCE SELECTION (Weldon Paint)
function forceWeldonSelection() {
    const brandFilter = document.getElementById("brandFilter");
    if (brandFilter) {
        for (let i = 0; i < brandFilter.options.length; i++) {
            if (brandFilter.options[i].text.trim() === "Weldon Paint") {
                brandFilter.selectedIndex = i;
                break;
            }
        }
        applyFilter();
    }
}

// 3. EVENT DELEGATION
document.addEventListener('click', async function(e) {
    const target = e.target.closest('button, b'); 
    if (!target) return;

    // A. Delete Brand
    if (target.classList.contains('del-brand')) {
        const brandId = target.getAttribute('data-brand-id');
        const brandName = target.closest('tr').getAttribute('data-brand');
        
        if (!confirm(`⚠️ Kya aap "${brandName}" ko delete karna chahte hain?`)) return;
        
        try {
            const res = await fetch('/dynamic/delete-brand', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brandId })
            });
            const data = await res.json();
            
            if (data.success) {
                // UI Clean up
                const rowsToRemove = document.querySelectorAll(`tr[data-brand="${brandName}"]`);
                rowsToRemove.forEach(row => row.remove());
                const option = document.querySelector(`#brandFilter option[value="${brandName}"]`);
                if(option) option.remove();
                
                // Backend Message
                alert("✅ Success: " + data.message); 
            } else {
                alert("❌ Failed: " + data.message);
            }
        } catch (err) { alert("Error deleting brand"); }
    }

    // B. Delete Product
    if (target.classList.contains('del-prod')) {
        const brandId = target.getAttribute('data-brand-id');
        const productId = target.getAttribute('data-prod-id');
        if (!confirm("⚠️ Kya aap is Item ko nikalna chahte hain?")) return;
        
        try {
            const res = await fetch('/dynamic/delete-product', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brandId, productId })
            });
            const data = await res.json();
            
            if (data.success) {
                target.closest('tr').remove();
                alert("✅ " + data.message); // Backend se success message
            } else {
                alert("❌ " + data.message); // Backend se error message
            }
        } catch (err) { alert("Error deleting product"); }
    }

    // C. Delete Color
    if (target.classList.contains('del-color')) {
        const brandId = target.getAttribute('data-brand-id');
        const productId = target.getAttribute('data-prod-id');
        const colorId = target.getAttribute('data-color-id');
        
        if (!confirm("⚠️ Kya aap is Color ko delete karna chahte hain?")) return;
        
        try {
            const res = await fetch('/dynamic/delete-color', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brandId, productId, colorId })
            });
            const data = await res.json();
            
            if (data.success) {
                target.closest('.tag').remove();
                alert("✅ " + data.message);
            } else {
                alert("❌ " + data.message);
            }
        } catch (err) { alert("Error deleting color"); }
    }


   // D. Delete Unit
if (target.classList.contains('del-unit')) {
    const brandId = target.getAttribute('data-brand-id');
    const unitId = target.getAttribute('data-unit-id');
    const unitName = target.parentElement.textContent.replace('×', '').trim();
    
    if (!confirm(`⚠️ Kya aap Unit "${unitName}" ko delete karna chahte hain?`)) return;
    
    try {
        const res = await fetch('/dynamic/delete-unit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brandId, unitId })
        });
        const data = await res.json();
        
        if (data.success) {
            target.closest('.unit-tag').remove();
            alert("✅ " + data.message);
        } else {
            alert("❌ " + data.message);
        }
    } catch (err) { 
        alert("Error deleting unit"); 
    }
}


});

// INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
    forceWeldonSelection();
    const brandFilter = document.getElementById("brandFilter");
    if(brandFilter) {
        brandFilter.addEventListener("change", applyFilter);
    }
});