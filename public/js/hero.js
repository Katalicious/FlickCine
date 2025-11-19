let currentSlideIndex = 0;
const AUTOPLAY_INTERVAL = 5000; 

let SLIDES; 
let DOTS_CONTAINER;
let ARROW_LEFT;
let ARROW_RIGHT; 
let autoplayTimer; 

function showSlide(index) {
    if (index >= SLIDES.length) {
        currentSlideIndex = 0;
    } else if (index < 0) {
        currentSlideIndex = SLIDES.length - 1;
    } else {
        currentSlideIndex = index;
    }

    SLIDES.forEach(slide => {
        slide.classList.remove('active-slide');
    });
    
    SLIDES[currentSlideIndex].classList.add('active-slide');
    
    updateDots();

    resetAutoplay(); 
}

function changeSlide(n) {
    showSlide(currentSlideIndex + n);
}

function updateDots() {
    if (!DOTS_CONTAINER) return;

    DOTS_CONTAINER.innerHTML = ''; 

    SLIDES.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.classList.add('dot');
        if (i === currentSlideIndex) {
            dot.classList.add('active');
        }
        
        dot.addEventListener('click', () => {
            showSlide(i);
        });
        DOTS_CONTAINER.appendChild(dot);
    });
}

function startAutoplay() {
    autoplayTimer = setInterval(() => {
        changeSlide(1);
    }, AUTOPLAY_INTERVAL);
}

function resetAutoplay() {
    clearInterval(autoplayTimer);
    startAutoplay();
}


function initHeroCarousel() {
    SLIDES = document.querySelectorAll('.hero-slides-container .slide');
    DOTS_CONTAINER = document.querySelector('.hero-dots');
    ARROW_LEFT = document.querySelector('.arrow-left');
    ARROW_RIGHT = document.querySelector('.arrow-right');

    if (SLIDES.length > 0 && DOTS_CONTAINER && ARROW_LEFT && ARROW_RIGHT) {
        if (SLIDES.length > 1) {
            updateDots();
            showSlide(currentSlideIndex);

            ARROW_LEFT.addEventListener('click', () => changeSlide(-1));
            ARROW_RIGHT.addEventListener('click', () => changeSlide(1));

            startAutoplay();
        } else {
            DOTS_CONTAINER.style.display = 'none';
            ARROW_LEFT.style.display = 'none';
            ARROW_RIGHT.style.display = 'none';
        }
    }
}

document.addEventListener('DOMContentLoaded', initHeroCarousel);