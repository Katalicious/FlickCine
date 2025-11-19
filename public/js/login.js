document.addEventListener('DOMContentLoaded', function() {
    
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const form = document.querySelector('form');

    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            const value = this.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (value !== '' && !emailRegex.test(value)) {
                this.setCustomValidity("Por favor, insere um email válido (ex: nome@exemplo.com).");
                this.reportValidity();
            } else {
                this.setCustomValidity(""); 
            }
        });

        emailInput.addEventListener('input', function() {
            this.setCustomValidity("");
        });
    }
    if (form) {
        form.addEventListener('submit', function(event) {
            let isValid = true;
            if (!passwordInput.value.trim()) {
                isValid = false;
                passwordInput.setCustomValidity("A palavra-passe é obrigatória.");
                passwordInput.reportValidity();
            }
            if (!isValid) {
                event.preventDefault();
            }
        });
    }
});