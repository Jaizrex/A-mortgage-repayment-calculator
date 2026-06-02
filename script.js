const mortgageform = document.getElementById('mortgage-form');

mortgageform.addEventListener('submit', (e) => {
    e.preventDefault();

    let isValid = true;

    const textFields = ['amount', 'years', 'rate'];
    textFields.forEach((id) => {
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

    if (isValid) {
        const principal = parseFloat(document.getElementById('amount').value);
        const annualRate = parseFloat(document.getElementById('rate').value);
        const years = parseFloat(document.getElementById('years').value);
        const mortgageType = selectedRadio.value;

        const monthlyRate = (annualRate / 100) / 12;
        const totalPayments = years * 12;

        let monthlyRepayment = 0;
        let totalRepay = 0;

        if (mortgageType === 'repayment') {
            if (monthlyRate === 0) { 
                monthlyRepayment = principal / totalPayments;
            } else {
                const compoundingFactor = Math.pow(1 + monthlyRate, totalPayments);
                monthlyRepayment = principal * (monthlyRate * compoundingFactor) / (compoundingFactor - 1);
            }
            totalRepay = monthlyRepayment * totalPayments;
        } else if (mortgageType === 'interest-only') {
            monthlyRepayment = principal * monthlyRate;
            totalRepay = (monthlyRepayment * totalPayments) + principal;
        }

        const formatCurrency = (value) => {
            return '£' + value.toLocaleString('en-GB', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        };

        document.getElementById('monthly-result').innerText = formatCurrency(monthlyRepayment);
        document.getElementById('total-result').innerText = formatCurrency(totalRepay);

        document.getElementById('contents').classList.add('hidden');
        document.getElementById('active-state').classList.remove('hidden');
    }
});

mortgageform.addEventListener('reset', function() {
    document.querySelectorAll('.input-container, .radio-group').forEach(container => {
        container.classList.remove('error');
    });

    document.getElementById('active-state').classList.add('hidden');
    document.getElementById('contents').classList.remove('hidden');
});