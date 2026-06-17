// ================================
// ALL PRODUCTS JS
// ================================

document.addEventListener('DOMContentLoaded', () => {

    const dataProvider = document.getElementById('db-data-provider');
    let dbDefinitions = [];

    if (dataProvider) {
        try {
            dbDefinitions = JSON.parse(dataProvider.getAttribute('data-definitions') || "[]");
        } catch (e) {
            console.error("Data error:", e);
        }
    }

    const brandFilter   = document.getElementById('brandFilter');
    const itemFilter    = document.getElementById('itemNameFilter');
    const colourFilter  = document.getElementById('colourNameFilter');
    const unitFilter    = document.getElementById('unitFilter');
    const filterSelect  = document.getElementById('filter');
    const filterForm    = document.getElementById('filterForm');
    const fromInput     = document.getElementById('from');
    const toInput       = document.getElementById('to');
    const applyBtn      = document.getElementById('apply');
    const selectAll     = document.getElementById('selectAll');
    const archiveBtn    = document.getElementById('archiveBtn');
    const pdfBtn        = document.getElementById('generatePDF');
    const wordBtn       = document.getElementById('generateWord');
    const prevBtn       = document.getElementById('prevPage');
    const nextBtn       = document.getElementById('nextPage');
    const limitSelect   = document.getElementById('limitSelect');

    let currentPage  = window.currentPage  || 1;
    let currentLimit = window.currentLimit || 25;


    // =========================================
    // CUSTOM DATE TOGGLE
    // =========================================

    function toggleCustomDates() {
        if (filterSelect.value === 'custom') {
            fromInput.style.display = 'inline-block';
            toInput.style.display   = 'inline-block';
            applyBtn.style.display  = 'inline-block';
        } else {
            fromInput.style.display = 'none';
            toInput.style.display   = 'none';
            applyBtn.style.display  = 'none';
        }
    }


    // =========================================
    // POPULATE ITEM FILTER
    // =========================================

    function populateItemFilter(brandName) {
        itemFilter.innerHTML = '<option value="all">All Items</option>';
        if (brandName === 'all') { itemFilter.disabled = true; return; }
        const brandData = dbDefinitions.find(d => d.brandName === brandName);
        if (brandData && brandData.products) {
            brandData.products.forEach(p => {
                const o = document.createElement('option');
                o.value = p.itemName;
                o.textContent = p.itemName;
                if (window.selectedItem === p.itemName) o.selected = true;
                itemFilter.appendChild(o);
            });
            itemFilter.disabled = false;
        }
    }


    // =========================================
    // POPULATE UNIT FILTER
    // =========================================

    function populateUnitFilter(brandName) {
        unitFilter.innerHTML = '<option value="all">All Units</option>';
        if (brandName === 'all') { unitFilter.disabled = true; return; }
        const brandData = dbDefinitions.find(d => d.brandName === brandName);
        if (brandData && brandData.units) {
            brandData.units.forEach(u => {
                const unitValue = typeof u === 'object' ? u.unitname : u;
                if (unitValue) {
                    const o = document.createElement('option');
                    o.value = unitValue;
                    o.textContent = unitValue;
                    if (window.selectedUnit === unitValue) o.selected = true;
                    unitFilter.appendChild(o);
                }
            });
            unitFilter.disabled = false;
        }
    }


    // =========================================
    // POPULATE COLOUR FILTER
    // =========================================

    function populateColourFilter(brandName, itemName) {
        colourFilter.innerHTML = '<option value="all">All Colours</option>';
        if (brandName === 'all' || itemName === 'all') { colourFilter.disabled = true; return; }
        const brandData = dbDefinitions.find(d => d.brandName === brandName);
        const product = brandData?.products.find(p => p.itemName === itemName);
        if (product && product.colors) {
            product.colors.forEach(c => {
                const val = c.code ? `${c.colour} (Code: ${c.code})` : c.colour;
                const o = document.createElement('option');
                o.value = val;
                o.textContent = val;
                if (window.selectedColour === val) o.selected = true;
                colourFilter.appendChild(o);
            });
            colourFilter.disabled = false;
        }
    }


    // =========================================
    // PAGINATION UI UPDATE
    // =========================================

    function updatePaginationUI(pagination) {
        const from = pagination.totalCount === 0 ? 0 : ((pagination.page - 1) * pagination.limit) + 1;
        const to   = Math.min(pagination.page * pagination.limit, pagination.totalCount);

        const showingFrom  = document.getElementById('showingFrom');
        const showingTo    = document.getElementById('showingTo');
        const totalCountEl = document.getElementById('totalCount');
        const pageInfo     = document.getElementById('pageInfo');

        if (showingFrom)  showingFrom.textContent  = from;
        if (showingTo)    showingTo.textContent     = to;
        if (totalCountEl) totalCountEl.textContent  = pagination.totalCount;
        if (pageInfo)     pageInfo.textContent      = `Page ${pagination.page} of ${pagination.totalPages}`;
        if (prevBtn)      prevBtn.disabled          = !pagination.hasPrev;
        if (nextBtn)      nextBtn.disabled          = !pagination.hasNext;

        currentPage  = pagination.page;
        currentLimit = pagination.limit;
    }


    // =========================================
    // AJAX TABLE UPDATE
    // =========================================

    async function updateTable() {
        const formData = new URLSearchParams(new FormData(filterForm)).toString();
        const url = `/products/all?${formData}&page=${currentPage}&limit=${currentLimit}`;

        const tbody = document.getElementById('productTableBody');
        const loader = document.getElementById('table-loader');

        if (loader) loader.style.display = 'flex';
        tbody.style.opacity = '0.3';

        try {
            const res  = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
            const data = await res.json();

            if (data.success) {

                // UPDATE STATS
                const statsPs = document.querySelectorAll('.stat-box p');
                if (statsPs.length >= 5) {
                    statsPs[0].innerText = data.stats.totalStock     || 0;
                    statsPs[1].innerText = `Rs ${Number(data.stats.totalValue         || 0).toLocaleString()}`;
                    statsPs[2].innerText = data.stats.totalRemaining || 0;
                    statsPs[3].innerText = `Rs ${Number(data.stats.remaining          || 0).toLocaleString()}`;
                    statsPs[4].innerText = `Rs ${Number(data.stats.totalRefundedValue || 0).toLocaleString()}`;
                }

                // UPDATE PAGINATION
                if (data.pagination) updatePaginationUI(data.pagination);

                // BUILD TABLE
                let html = '';

                if (data.products.length === 0) {
                    html = `<tr><td colspan="14" class="no-data">No products found.</td></tr>`;
                } else {
                    data.products.forEach(p => {
                        const dateObj = new Date(p.createdAt);
                        const fDate   = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                        const fTime   = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
                        const qrSrc   = p.qrCode || '';

                        // Company / Cash column
                        let companyHtml = '';
                        if (p.companyId) {
                            companyHtml = `
                                <div style="font-size:12px; line-height:1.4;">
                                 ${/* 
<strong>${p.companyName || ''}</strong><br>
<span style="color:#555;">${p.companyPhone || ''}</span><br>
*/ ''}
                                   <a href="/company/view/${p.companyId}"
   style="color:#2196F3; font-weight:bold; text-decoration:none; font-size:11px;">
   📄 View
</a>
                                </div>`;
                        } else {
                            companyHtml = `<span style="color:#999; font-weight:bold;">💵 Cash</span>`;
                        }

                        html += `
                        <tr data-id="${p._id}"
                            data-brand="${p.brandName}"
                            data-item="${p.itemName}"
                            data-colour="${p.colourName}"
                            data-unit="${p.qty}"
                            data-totalproduct="${p.totalProduct}"
                            data-remaining="${p.remaining}"
                            data-rate="${p.rate}"
                        >
                            <td><input type="checkbox" class="row-checkbox" value="${p._id}"></td>
                            <td><strong>${p.stockID}</strong></td>
                            <td>
                                <div class="qr-wrapper">
                                    <img src="${qrSrc}" alt="QR Code" class="qr-image">
                                   <button type="button" class="print-btn" 
    data-qr="${qrSrc}"
    data-brand="${p.brandName}"
    data-item="${p.itemName}"
    data-colour="${p.colourName}"
    data-unit="${p.qty}">Print</button>
                            </td>
                            <td>${p.brandName}</td>
                            <td>${p.itemName}</td>
                            <td>${p.colourName}</td>
                            <td>${p.qty}</td>
                            <td class="view-mode" data-field="totalProduct">${p.totalProduct}</td>
                            <td class="view-mode ${Number(p.remaining) <= 0 ? 'stock-out' : 'stock-in'}" data-field="remaining">${p.remaining}</td>
                            <td class="view-mode" data-field="rate">Rs ${p.rate}</td>
                            <td class="view-mode" data-field="saleRate">Rs ${p.saleRate}</td>
                            <td>
                                ${fDate}<br>
                                <small style="color:#007bff; font-weight:bold;">${fTime}</small>
                            </td>
                            <td>${companyHtml}</td>
                            ${window.role === "admin" ? `
    <td class="action-cell">
        <button id="edit" type="button" class="edit-icon-btn"
            data-id="${p._id}"
            data-totalproduct="${p.totalProduct}"
            data-remaining="${p.remaining}"
            data-rate="${p.rate}"
            data-salerate="${p.saleRate}"
            title="Edit"
        >✏️</button>
        <button class="delete-btn" data-id="${p._id}">🗑️</button>
    </td>` : ''}
                        </tr>`;
                    });
                }

                tbody.innerHTML = html;
                attachDeleteEvents();
                attachPrintEvents();
                attachEditEvents();
                if (selectAll) selectAll.checked = false;
            }

        } catch (err) {
            console.error(err);
        } finally {
            if (loader) loader.style.display = 'none';
            tbody.style.opacity = '1';
        }
    }


    // =========================================
    // INLINE EDIT
    // =========================================

    function attachEditEvents() {
        document.querySelectorAll('.edit-icon-btn').forEach(btn => {
            btn.onclick = function () {
                const row = this.closest('tr');
                const id  = this.dataset.id;

                if (row.classList.contains('edit-mode')) {
                    cancelEdit(row, this);
                    return;
                }

                const origTotalProduct = this.dataset.totalproduct;
                const origRemaining    = this.dataset.remaining;
                const origRate         = this.dataset.rate;
                const origSaleRate     = this.dataset.salerate;

                row.querySelectorAll('.view-mode').forEach(cell => {
                    const field = cell.dataset.field;
                    let val;
                    if      (field === 'totalProduct') val = origTotalProduct;
                    else if (field === 'remaining')    val = origRemaining;
                    else if (field === 'rate')         val = origRate;
                    else if (field === 'saleRate')     val = origSaleRate;

                    cell.innerHTML = `<input
                        type="number"
                        class="edit-input"
                        data-field="${field}"
                        value="${val}"
                        style="width:70px; padding:3px; border:1px solid #2196F3; border-radius:4px;"
                        min="0"
                    >`;
                });

                row.classList.add('edit-mode');
                this.title     = 'Cancel';
                this.innerText = '❌';

                const actionCell = row.querySelector('.action-cell');
                const saveBtn    = document.createElement('button');
                saveBtn.type      = 'button';
                saveBtn.className = 'save-edit-btn';
                saveBtn.innerText = '✅ Save';
                saveBtn.style.cssText = 'margin-top:4px; background:#06a56c; color:white; border:none; padding:3px 8px; border-radius:4px; cursor:pointer;';
                saveBtn.dataset.id = id;
                actionCell.appendChild(saveBtn);

                saveBtn.onclick = async () => {
                    const inputs  = row.querySelectorAll('.edit-input');
                    const payload = {};
                    inputs.forEach(inp => { payload[inp.dataset.field] = inp.value; });

                    saveBtn.disabled  = true;
                    saveBtn.innerText = '...';

                    try {
                        const res    = await fetch(`/products/edit/${id}`, {
                            method:  'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body:    JSON.stringify(payload)
                        });
                        const result = await res.json();

                        if (result.success) {
                            alert('✅ Product updated!');
                            updateTable();
                        } else {
                            alert('❌ ' + result.message);
                            saveBtn.disabled  = false;
                            saveBtn.innerText = '✅ Save';
                        }
                    } catch (e) {
                        alert('❌ Network error');
                        saveBtn.disabled  = false;
                        saveBtn.innerText = '✅ Save';
                    }
                };
            };
        });
    }

    function cancelEdit(row, btn) {
        updateTable();
    }


    // =========================================
    // HELPER: GET ROWS DATA FOR PDF/WORD
    // data-* attributes se data leta hai
    // cells se nahi — isliye sirf current page
    // ki rows aati hain, zyada nahi
    // =========================================

    function getSelectedRowsData() {
        const selectedBoxes = document.querySelectorAll('.row-checkbox:checked');

        const targetRows = selectedBoxes.length > 0
            ? Array.from(selectedBoxes).map(cb => cb.closest('tr'))
            : Array.from(document.querySelectorAll('#productTableBody tr[data-id]'));

        const rows = [];
        targetRows.forEach(tr => {
            const brand    = tr.dataset.brand         || '';
            const item     = tr.dataset.item          || '';
            const colour   = tr.dataset.colour        || '';
            const unit     = tr.dataset.unit          || '';
            const totalQty = tr.dataset.totalproduct  || '';
            const remQty   = tr.dataset.remaining     || '';
            const rate     = tr.dataset.rate          || '';

            if (brand || item) {
                rows.push({ brand, item, colour, unit, totalQty, remQty, rate });
            }
        });

        return rows;
    }


    // =========================================
    // PDF
    // =========================================

    if (pdfBtn) {
        pdfBtn.onclick = () => {
            const rows = getSelectedRowsData();
            if (rows.length === 0) return alert("Koi data nahi mila.");

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'mm', 'a4');
            doc.setFontSize(18);
            doc.setTextColor(6, 165, 108);
            doc.text("HAMZA PAINTS - STOCK ORDER LIST", 14, 15);
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generated on: ${moment().format('DD-MMM-YYYY hh:mm A')}`, 14, 22);

            const pdfRows = rows.map(r => [
                r.brand, r.item, r.colour, r.unit, r.rate, r.totalQty, r.remQty
            ]);

            doc.autoTable({
                startY: 28,
                head: [['Brand', 'Item Name', 'Color/Code', 'Unit', 'Rate', 'Total Qty', 'Stock Left']],
                body: pdfRows,
                headStyles:         { fillColor: [6, 165, 108], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [240, 240, 240] },
                margin: { left: 14, right: 14 },
                theme: 'grid'
            });

            doc.save(`Stock_Order_${moment().format('DD_MM_YY')}.pdf`);
        };
    }


    // =========================================
    // WORD
    // =========================================

    if (wordBtn) {
        wordBtn.onclick = async () => {
            const rows = getSelectedRowsData();
            if (rows.length === 0) return alert("Koi data nahi mila.");

            try {
                const { Document, Packer, Paragraph, Table, TableRow, TableCell,
                        TextRun, WidthType, AlignmentType } = docx;

                const headerCells = ['Brand', 'Item Name', 'Color/Code', 'Unit', 'Rate', 'Total Qty', 'Stock Left'].map(h =>
                    new TableCell({
                        children: [new Paragraph({
                            children:  [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 20 })],
                            alignment: AlignmentType.CENTER
                        })],
                        shading: { fill: '06A56C' }
                    })
                );

                const dataRows = rows.map((r, idx) =>
                    new TableRow({
                        children: [r.brand, r.item, r.colour, r.unit, r.rate, r.totalQty, r.remQty].map(val =>
                            new TableCell({
                                children: [new Paragraph({
                                    children:  [new TextRun({ text: String(val), size: 18 })],
                                    alignment: AlignmentType.CENTER
                                })],
                                shading: { fill: idx % 2 === 0 ? 'FFFFFF' : 'F0F0F0' }
                            })
                        )
                    })
                );

                const wordDoc = new Document({
                    sections: [{
                        children: [
                            new Paragraph({
                                children:  [new TextRun({ text: 'HAMZA PAINTS - STOCK ORDER LIST', bold: true, size: 32, color: '06A56C' })],
                                alignment: AlignmentType.CENTER,
                                spacing:   { after: 200 }
                            }),
                            new Paragraph({
                                children:  [new TextRun({ text: `Generated on: ${moment().format('DD-MMM-YYYY hh:mm A')}`, size: 18, color: '666666' })],
                                alignment: AlignmentType.CENTER,
                                spacing:   { after: 400 }
                            }),
                            new Table({
                                width: { size: 100, type: WidthType.PERCENTAGE },
                                rows:  [new TableRow({ children: headerCells }), ...dataRows]
                            })
                        ]
                    }]
                });

                const blob = await Packer.toBlob(wordDoc);
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement('a');
                a.href     = url;
                a.download = `Stock_Order_${moment().format('DD_MM_YY')}.docx`;
                a.click();
                URL.revokeObjectURL(url);

            } catch (e) {
                console.error("Word Error:", e);
                alert("❌ Word file generate nahi ho saki. Console check karein.");
            }
        };
    }


    // =========================================
    // PAGINATION EVENTS
    // =========================================

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) { currentPage--; updateTable(); }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => { currentPage++; updateTable(); });
    }

    if (limitSelect) {
        limitSelect.addEventListener('change', () => {
            currentLimit = parseInt(limitSelect.value);
            currentPage  = 1;
            updateTable();
        });
    }


    // =========================================
    // SELECT ALL
    // =========================================

    if (selectAll) {
        selectAll.addEventListener('change', (e) => {
            document.querySelectorAll('.row-checkbox').forEach(cb => {
                cb.checked = e.target.checked;
            });
        });
    }


    // =========================================
    // ARCHIVE
    // =========================================

    if (archiveBtn) {
        archiveBtn.onclick = async () => {
            const selected = Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.value);
            if (selected.length === 0) return alert("Pehle products select karein!");
            if (confirm(`Kya aap in ${selected.length} items ko hide karna chahte hain?`)) {
                const res  = await fetch('/products/archive-bulk', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ ids: selected })
                });
                const data = await res.json();
                if (data.success) {
                    alert("✅ Archived successfully!");
                    updateTable();
                } else {
                    alert("❌ " + data.message);
                }
            }
        };
    }


    // =========================================
    // BULK DELETE
    // =========================================

    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

    if (bulkDeleteBtn) {
        bulkDeleteBtn.onclick = async () => {
            const selected = Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.value);
            if (selected.length === 0) return alert("Pehle products select karein!");
            if (!confirm(`⚠️ Kya aap in ${selected.length} products ko delete karna chahte hain? Yeh wapas nahi aayenge!`)) return;

            try {
                const res  = await fetch('/products/delete-bulk', {
                    method:  'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ ids: selected })
                });
                const data = await res.json();
                if (data.success) {
                    alert("✅ " + data.message);
                    currentPage = 1;
                    updateTable();
                } else {
                    alert("❌ " + data.message);
                }
            } catch (err) {
                alert("❌ Error deleting products.");
            }
        };
    }


    // =========================================
    // FILTER EVENTS
    // =========================================

    brandFilter.addEventListener('change', () => {
        currentPage = 1;
        populateItemFilter(brandFilter.value);
        populateUnitFilter(brandFilter.value);
        itemFilter.value       = 'all';
        colourFilter.innerHTML = '<option value="all">All Colours</option>';
        colourFilter.disabled  = true;
        updateTable();
    });

    itemFilter.addEventListener('change', () => {
        currentPage = 1;
        populateColourFilter(brandFilter.value, itemFilter.value);
        updateTable();
    });

    [unitFilter, colourFilter,
     document.getElementById('stockStatusFilter'),
     document.getElementById('refundFilter')
    ].forEach(f => {
        if (f) f.addEventListener('change', () => { currentPage = 1; updateTable(); });
    });

    filterSelect.addEventListener('change', () => {
        currentPage = 1;
        toggleCustomDates();
        if (filterSelect.value !== 'custom') updateTable();
    });

    applyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentPage = 1;
        updateTable();
    });


    // =========================================
    // DELETE EVENTS
    // =========================================

    function attachDeleteEvents() {
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = async function () {
                if (!confirm("⚠️ Delete this product?")) return;
                try {
                    const res  = await fetch(`/products/delete-product/${this.dataset.id}`, { method: "DELETE" });
                    const data = await res.json();
                    if (data.success) {
                        alert("✅ " + data.message);
                        updateTable();
                    } else {
                        alert("❌ " + data.message);
                    }
                } catch (err) {
                    alert("❌ Error deleting.");
                }
            };
        });
    }


    // =========================================
    // PRINT EVENTS
    // =========================================

  function attachPrintEvents() {
    document.querySelectorAll(".print-btn").forEach(btn => {
        btn.onclick = function () {
            const qrPath = this.dataset.qr;
            const brand  = this.dataset.brand  || '';
            const item   = this.dataset.item   || '';
            const colour = this.dataset.colour || '';
            const unit   = this.dataset.unit   || '';  // ✅ ye add karo

            const printContainer = document.getElementById("print-image");
            printContainer.src = qrPath;
            printContainer.onload = function () {
                const labelDiv = document.getElementById("print-label");
                if (labelDiv) {
                    labelDiv.innerHTML = `
                        <div style="font-size:14px; font-weight:bold;">${brand}</div>
                        <div style="font-size:12px; color:#444;">${item}</div>
                        <div style="font-size:11px; color:#666;">${colour || 'N/A'}</div>
                        <div style="font-size:13px; font-weight:bold; color:#666; margin-top:2px;">${unit || 'N/A'}</div>  <!-- ✅ ye add karo -->
                    `;
                }
                window.print();
            };
        };
    });
}


    // =========================================
    // INITIAL LOAD
    // =========================================

    toggleCustomDates();
    populateItemFilter(window.selectedBrand);
    populateUnitFilter(window.selectedBrand);
    populateColourFilter(window.selectedBrand, window.selectedItem);
    attachDeleteEvents();
    attachPrintEvents();
    attachEditEvents();

    if (limitSelect) limitSelect.value = window.currentLimit || 25;

    updatePaginationUI({
        page:       window.currentPage,
        limit:      window.currentLimit,
        totalCount: window.totalCount,
        totalPages: window.totalPages,
        hasPrev:    window.currentPage > 1,
        hasNext:    window.currentPage < window.totalPages
    });

});