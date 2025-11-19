const { Direction, Stack } = require("swing");

const stack = Stack(config);

const cartoes = [].slice.call(document.querySelectorAll('ul li'));

cartoes.forEach((targetElement) => {
    stack.createCard(targetElement);
});

stack.on('throwout', (e) => {
    console.log('Carta retirada da pilha.');
    console.log('Saiu para:' + (e.throwDirection == Direction.LEFT ? 'left' : 'right'));
});

stack.on('throwin', (e) => {
    console.log('Carta retornou à pilha.');
});

const config = {
    allowedDirections: [Direction.LEFT, Direction.RIGHT],
    throwOutDistance: () => 400,
    throwOutConfidence: (xoffset, yoffset, element) => {
        const xConfidence = Math.min(Math.abs(xoffset) / element.offsetWidth / 1);
        const yConfidence = Math.min(Math.abs(yoffset) / element.offsetHeight / 1);
        return Math.max(xConfidence, yConfidence);
    }
};

const cartao = stack.createCard(document.querySelector('ul li'));
