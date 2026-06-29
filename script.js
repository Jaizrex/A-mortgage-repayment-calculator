// ── Calculation state ─────────────────────────────────────────────────────────
let calcState = null;

// ── Form submit ───────────────────────────────────────────────────────────────
const mortgageform = document.getElementById('mortgage-form');
mortgageform.addEventListener('submit', (e) => {
    e.preventDefault();
    let isValid = true;

    ['amount', 'years', 'rate'].forEach((id) => {
        const input = document.getElementById(id);
        const container = input.closest('.input-container');
        if (input.value.trim() === '') {
            container.classList.add('error');
            isValid = false;
        } else {
            container.classList.remove('error');
        }
    });

    const radioGroup = document.querySelector('.radio-group');
    const selectedRadio = document.querySelector('input[name="mortgage-type"]:checked');
    if (!selectedRadio) {
        radioGroup.classList.add('error');
        isValid = false;
    } else {
        radioGroup.classList.remove('error');
    }

    if (!isValid) return;

    const principal    = parseFloat(document.getElementById('amount').value);
    const annualRate   = parseFloat(document.getElementById('rate').value);
    const years        = parseFloat(document.getElementById('years').value);
    const mortgageType = selectedRadio.value;
    const monthlyRate  = (annualRate / 100) / 12;
    const totalPayments = years * 12;

    let monthlyRepayment = 0;
    let totalRepay = 0;

    if (mortgageType === 'repayment') {
        if (monthlyRate === 0) {
            monthlyRepayment = principal / totalPayments;
        } else {
            const cf = Math.pow(1 + monthlyRate, totalPayments);
            monthlyRepayment = principal * (monthlyRate * cf) / (cf - 1);
        }
        totalRepay = monthlyRepayment * totalPayments;
    } else {
        monthlyRepayment = principal * monthlyRate;
        totalRepay = (monthlyRepayment * totalPayments) + principal;
    }

    // Save state for export
    calcState = { principal, annualRate, years, mortgageType, monthlyRepayment, totalRepay };

    const fmt = (v) => '£' + v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    document.getElementById('monthly-result').innerText = fmt(monthlyRepayment);
    document.getElementById('total-result').innerText   = fmt(totalRepay);
    document.getElementById('contents').classList.add('hidden');
    document.getElementById('active-state').classList.remove('hidden');
});

// ── Form reset ────────────────────────────────────────────────────────────────
mortgageform.addEventListener('reset', () => {
    document.querySelectorAll('.input-container, .radio-group').forEach(c => c.classList.remove('error'));
    document.getElementById('active-state').classList.add('hidden');
    document.getElementById('contents').classList.remove('hidden');
    calcState = null;
});

// ── Excel export ──────────────────────────────────────────────────────────────
document.getElementById('export-excel-btn').addEventListener('click', () => {
    if (!calcState) return;

    const { principal, annualRate, years, mortgageType, monthlyRepayment, totalRepay } = calcState;
    const monthlyRate   = (annualRate / 100) / 12;
    const totalPayments = years * 12;

    // ── Build workbook with SheetJS (xlsx) ────────────────────────────────────
    const XLSX = window.XLSX;

    const wb = XLSX.utils.book_new();

    // ── Summary sheet ─────────────────────────────────────────────────────────
    const summaryData = [
        ["Mortgage Repayment Summary"],
        [],
        ["INPUTS"],
        ["Mortgage Amount",   principal,        ""],
        ["Mortgage Term",     `${years} years`,  ""],
        ["Annual Rate",       annualRate / 100,  ""],
        ["Mortgage Type",     mortgageType.replace("-", " ").replace(/\b\w/g, c => c.toUpperCase()), ""],
        [],
        ["RESULTS"],
        ["Monthly Repayment", monthlyRepayment, ""],
        ["Total Repayment",   totalRepay,        ""],
    ];
    if (mortgageType === 'repayment') {
        summaryData.push(["Total Interest Paid", totalRepay - principal, ""]);
    }

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

    // Format currency cells
    const currencyCells = ['B4', 'B10', 'B11', 'B12'];
    currencyCells.forEach(addr => {
        if (wsSummary[addr]) wsSummary[addr].z = '£#,##0.00';
    });
    if (wsSummary['B6']) wsSummary['B6'].z = '0.00%';

    wsSummary['!cols'] = [{ wch: 26 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // ── Amortisation sheet ────────────────────────────────────────────────────
    if (mortgageType === 'repayment') {
        const schedHeaders = ["Month", "Opening Balance (£)", "Monthly Payment (£)", "Interest (£)", "Principal (£)", "Closing Balance (£)"];
        const schedRows = [schedHeaders];
        let balance = principal;

        for (let m = 1; m <= totalPayments; m++) {
            const interestPmt   = balance * monthlyRate;
            const principalPmt  = monthlyRepayment - interestPmt;
            const closing       = Math.max(balance - principalPmt, 0);
            schedRows.push([m, +balance.toFixed(2), +monthlyRepayment.toFixed(2), +interestPmt.toFixed(2), +principalPmt.toFixed(2), +closing.toFixed(2)]);
            balance = closing;
        }

        // Totals row
        schedRows.push([
            "TOTAL", "",
            schedRows.slice(1).reduce((s, r) => s + r[2], 0),
            schedRows.slice(1).reduce((s, r) => s + r[3], 0),
            schedRows.slice(1).reduce((s, r) => s + r[4], 0),
            ""
        ]);

        const wsSchedule = XLSX.utils.aoa_to_sheet(schedRows);
        wsSchedule['!cols'] = [{ wch: 8 }, { wch: 22 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 22 }];
        XLSX.utils.book_append_sheet(wb, wsSchedule, "Amortisation Schedule");
    }

    // ── Download ──────────────────────────────────────────────────────────────
    XLSX.writeFile(wb, "mortgage_report.xlsx");
});
