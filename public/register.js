document.addEventListener('DOMContentLoaded', function() {

const nome = document.getElementById('name');
const mensagemerronome = document.getElementById('BlurName');

nome.addEventListener('blur', function() {
    const trim = this.value.trim();
    if(trim.length < 3 || trim.length > 20 || !/^[a-zA-Z0-9]+$/.test(trim)) {
        mensagemerronome.innerHTML = "Este campo deve conter entre 3 a 20 caracteres alfanuméricos.";
        mensagemerronome.style.color = 'red';
    } else if(trim === '' || trim == null) {
        mensagemerronome.innerHTML = "Este campo não pode estar vazio.";
        mensagemerronome.style.color = 'red';
    } else {
        mensagemerronome.innerHTML = '';
    }
});

let password = document.getElementById('password')
let confirm_password = document.getElementById('confirm-password');
let mensagemerropassword = document.getElementById('mensagem-de-erro-palavra-passe');


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

};

});

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