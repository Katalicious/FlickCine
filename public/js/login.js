document.addEventListener('DOMContentLoaded', function() {

    const emailInput = document.getElementById('email');
    const msgEmail = document.getElementById('BlurEmail');

    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            const valor = this.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (valor === '') {
                msgEmail.innerHTML = "O campo de email não pode estar vazio.";
                msgEmail.style.color = 'red';
            } else if (!emailRegex.test(valor)) {
                msgEmail.innerHTML = "Por favor, insere um email válido.";
                msgEmail.style.color = 'red';
            } else {
                msgEmail.innerHTML = '';
            }
        });

        emailInput.addEventListener('input', function() {
            msgEmail.innerHTML = '';
        });
    }

    const passwordInput = document.getElementById('password');
    const msgPw = document.getElementById('BlurPassword');

    if (passwordInput) {
        passwordInput.addEventListener('blur', function() {
            const valor = this.value.trim();
            if (valor === '') {
                msgPw.innerHTML = "A palavra-passe é obrigatória.";
                msgPw.style.color = 'red';
            } else {
                msgPw.innerHTML = '';
            }
        });

        passwordInput.addEventListener('input', function() {
            msgPw.innerHTML = '';
        });
    }
});