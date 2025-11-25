
document.addEventListener('DOMContentLoaded', function() {

const form = document.getElementById('registo-form');


const nome = document.getElementById('name');
const mensagemerronome = document.getElementById('BlurName');

nome.addEventListener('blur', function() {
    const trim = this.value.trim();
    if(trim === '' || trim == null) {
        mensagemerronome.style.display = 'block';
        mensagemerronome.innerHTML = "Este campo não pode estar vazio.";
        mensagemerronome.style.color = 'red';
    } else if(trim.length < 3 || trim.length > 20) {
        mensagemerronome.style.display = 'block';
        mensagemerronome.innerHTML = "Este campo deve conter entre 3 a 20 caracteres.";
        mensagemerronome.style.color = 'red';
    } else if(!/^[a-zA-Z\s]+$/.test(trim)) {
        mensagemerronome.style.display = 'block';
        mensagemerronome.innerHTML = "Este campo permite apenas letras e espaços.";
        mensagemerronome.style.color = 'red';
    } else {
        mensagemerronome.innerHTML = '';
    }
});

const email = document.getElementById('email');
const mensagemerroemail = document.getElementById('BlurEmail');

email.addEventListener('blur', function() {
    const trim = this.value.trim();
    if(trim === '' || trim == null) {
        mensagemerroemail.style.display = 'block';
        mensagemerroemail.innerHTML = "Este campo não pode estar vazio.";
        mensagemerroemail.style.color = 'red';
    } else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trim)) {
        mensagemerroemail.style.display = 'block';
        mensagemerroemail.innerHTML = "Por favor, insere um email válido.";
        mensagemerroemail.style.color = 'red';
    } else {
        mensagemerroemail.innerHTML = '';
    }
});

/* validação data nascimento */

const inputDataNasc = document.getElementById('idade');
const mensagemerroidade = document.getElementById('BlurDate');


function ComputarIdade() {
    const hoje = new Date();
    const dataNasc = new Date(inputDataNasc.value);
    
    if (!inputDataNasc.value) {
        mensagemerroidade.style.display = 'none';
        return;
    }

    if (dataNasc > hoje) {
        mensagemerroidade.style.display = 'block';
        mensagemerroidade.innerHTML = "A data de nascimento não pode ser no futuro.";
        mensagemerroidade.style.color = 'red';
        return;
    }

    let idade = hoje.getFullYear() - dataNasc.getFullYear();
    const m = hoje.getMonth() - dataNasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < dataNasc.getDate())) {
        idade--;
    }

    if(idade < 18) {
        mensagemerroidade.style.display = 'block';
        mensagemerroidade.innerHTML = "Deve ser maior de 18 anos para se registar.";
        mensagemerroidade.style.color = 'red';
        event.preventDefault(); // Evento a fazer, addeventlistener submit no form
    } else if (idade >= 18) {
        mensagemerroidade.innerHTML = '';
    }
    
    return idade;
}

inputDataNasc.addEventListener('blur', function() {
    ComputarIdade();
  
});





/* */

let password = document.getElementById('password')
let confirm_password = document.getElementById('confirm-password');


function validatePassword(){
    if(password.value != confirm_password.value) {
        confirm_password.setCustomValidity("As palavras-passe não coincidem.");
    } else {
        confirm_password.setCustomValidity('');
    }
}

password.onchange = validatePassword;
confirm_password.onkeyup = validatePassword;

/* Validação da palavra-passe com a mensagem de erro. */

let letra = document.getElementById("letra");
let maiúscula = document.getElementById("maiúscula");
let numero = document.getElementById("numero");
let comprimento = document.getElementById("comprimento");

password.onfocus = function() {
    document.getElementById("mensagem-de-erro-palavra-passe").style.display = "block";
}

password.onblur = function() {
    document.getElementById("mensagem-de-erro-palavra-passe").style.display = "none";
}

password.onkeyup = function() {
    let letrasminusculas = /[a-z]/g;
    if(password.value.match(letrasminusculas)) {
        letra.classList.remove("invalid");
        letra.classList.add("valid");
    } else {
        letra.classList.remove("valid");
        letra.classList.add("invalid");
    }

    let letrasmaiusculas = /[A-Z]/g;
    if(password.value.match(letrasmaiusculas)) {
        maiúscula.classList.remove("invalid");
        maiúscula.classList.add("valid");
    } else {
        maiúscula.classList.remove("valid");
        maiúscula.classList.add("invalid");
    }

    let numeros = /[0-9]/g;
    if(password.value.match(numeros)) {
        numero.classList.remove("invalid");
        numero.classList.add("valid");
    } else {
        numero.classList.remove("valid");
        numero.classList.add("invalid");
    }

    if(password.value.length >= 8) {
        comprimento.classList.remove("invalid");
        comprimento.classList.add("valid");
    } else {
        comprimento.classList.remove("valid");
        comprimento.classList.add("invalid");
    }

    let tudovalido = letra.classList.contains("valid") && maiúscula.classList.contains("valid") && numero.classList.contains("valid") && comprimento.classList.contains("valid");

    if(tudovalido) {
        document.getElementById("mensagem-de-erro-palavra-passe").style.display = "none";
    } else {
        document.getElementById("mensagem-de-erro-palavra-passe").style.display = "block";
    }

};


    function handleRegistrationSuccess() {
    const params = new URLSearchParams(window.location.search);

    if (params.get('registered') === '1') {
        const modal = document.getElementById('registrationModal');
        const modalText = document.getElementById('modalText');
        const modalIcon = document.getElementById('modalIcon');


        modalText.textContent = 'Conta criada. A redirecionar para o login...';


        modal.classList.add('is-visible');

        setTimeout(() => {
            window.location.href = '/login';
        }, 2400);

        history.replaceState(null, '', window.location.pathname);
    }
}

handleRegistrationSuccess();



const toggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
const currentTheme = localStorage.getItem('theme');

if (currentTheme) {
    document.body.classList.add(currentTheme);
    if (currentTheme === 'dark-mode') {
        toggleSwitch.checked = true;
    }
}

function switchTheme(e) {
    if (e.target.checked) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
    }
}

toggleSwitch.addEventListener('change', switchTheme, false);
});