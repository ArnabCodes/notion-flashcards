// Sample flashcard data with physics formulas
const flashcardData = [
    { 
        question: "What is the formula for Newton's Second Law of Motion?", 
        answer: "\\[F = ma\\] where F is force, m is mass, and a is acceleration" 
    },
    { 
        question: "What is the formula for kinetic energy?", 
        answer: "\\[K = \\frac{1}{2}mv^2\\] where K is kinetic energy, m is mass, and v is velocity" 
    },
    { 
        question: "What is the formula for gravitational potential energy near Earth's surface?", 
        answer: "\\[U = mgh\\] where U is potential energy, m is mass, g is gravitational acceleration, and h is height" 
    },
    { 
        question: "What is the formula for the period of a simple pendulum?", 
        answer: "\\[T = 2\\pi\\sqrt{\\frac{L}{g}}\\] where T is period, L is length of the pendulum, and g is gravitational acceleration" 
    },
    { 
        question: "What is the formula for the force of gravity between two masses?", 
        answer: "\\[F = G\\frac{m_1m_2}{r^2}\\] where F is force, G is gravitational constant, m₁ and m₂ are masses, and r is distance between them" 
    }
];

// Spaced repetition intervals (in milliseconds)
const intervals = [
    5 * 60 * 1000,    // 5 minutes
    30 * 60 * 1000,   // 30 minutes
    2 * 60 * 60 * 1000, // 2 hours
    24 * 60 * 60 * 1000, // 1 day
    4 * 24 * 60 * 60 * 1000, // 4 days
    7 * 24 * 60 * 60 * 1000  // 1 week
];

let currentCardIndex = 0;
let cards = [...flashcardData];
let reviewQueue = [];
let masteredCards = [];
let isFirstHover = true;
let hoverTimeout = null;
let isHovering = false;
let currentRotation = 0;
const MAX_ROTATION = 15;
const ROTATION_STEP = 0.5;
let animationFrame = null;
let startTime = null;
const ANIMATION_DURATION = 300; // ms
let lastEvent = null;
let isFlipping = false;


function flipCard(card, event) {
    if (isFlipping) return;
    
    isFlipping = true;
    const isFlipped = card.classList.contains('flipped');
    const targetRotation = isFlipped ? 0 : 180;
    startTime = performance.now();
    
    function animateFlip() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
        
        // Simple linear interpolation
        const currentRotation = isFlipped ? 180 * (1 - progress) : 180 * progress;
        
        const transform = `perspective(1500px) rotateY(${currentRotation}deg)`;
        card.querySelector('.flashcard-inner').style.transform = transform;
        card.querySelector('.flashcard-inner').style.webkitTransform = transform;
        
        if (progress < 1) {
            animationFrame = requestAnimationFrame(animateFlip);
        } else {
            isFlipping = false;
            card.classList.toggle('flipped');
            // Remove the transform reset to maintain the correct state
        }
    }
    
    animateFlip();
}

function isInBoundingBox(card, event) {
    const rect = card.getBoundingClientRect();
    const padding = 5;
    
    return (
        event.clientX >= rect.left - padding &&
        event.clientX <= rect.right + padding &&
        event.clientY >= rect.top - padding &&
        event.clientY <= rect.bottom + padding
    );
}

function handleCardHover(card, event) {
    if (isFlipping) return;
    
    const rect = card.getBoundingClientRect();
    const isFlipped = card.classList.contains('flipped');
    
    // Calculate relative position within the extended bounding box
    const relativeX = event.clientX - rect.left;
    const relativeY = event.clientY - rect.top;
    
    // Calculate tilt based on position relative to center
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate tilt angles (reduced for subtler effect)
    const tiltX = ((relativeY - centerY) / centerY) * 5; // Reduced from 10 to 5
    const tiltY = ((relativeX - centerX) / centerX) * -5; // Reduced from -10 to -5
    
    // Apply rotation based on flip state
    const baseRotation = isFlipped ? 180 : 0;
    const transform = `perspective(1500px) rotateX(${tiltX}deg) rotateY(${tiltY + baseRotation}deg)`;
    
    card.querySelector('.flashcard-inner').style.transform = transform;
    card.querySelector('.flashcard-inner').style.webkitTransform = transform;
}

function handleCardLeave(card) {
    if (isFlipping) return; // Don't allow leave animation during flip
    
    isHovering = false;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    
    if (lastEvent) {
        startTime = performance.now();
        animateHover(card, lastEvent, true);
    } else {
        const transform = 'perspective(1500px) rotate3d(0, 0, 0, 0deg)';
        card.querySelector('.flashcard-inner').style.transform = transform;
        card.querySelector('.flashcard-inner').style.webkitTransform = transform;
    }
}

function navigateCard(direction) {
    const card = document.querySelector('.flashcard');
    const isFlipped = card.classList.contains('flipped');
    
    if (isFlipped) {
        card.classList.remove('flipped');
    }
    
    // Add slide animation class
    card.classList.add(direction === 'next' ? 'slide-left' : 'slide-right');
    
    setTimeout(() => {
        if (direction === 'next') {
            currentCardIndex = (currentCardIndex + 1) % cards.length;
        } else {
            currentCardIndex = (currentCardIndex - 1 + cards.length) % cards.length;
        }
        updateCardDisplay();
        
        // Remove slide animation class after animation completes
        setTimeout(() => {
            card.classList.remove('slide-left', 'slide-right');
        }, 300);
    }, 300);
}

function updateCardDisplay() {
    const questionText = document.getElementById('question-text');
    const answerText = document.getElementById('answer-text');
    const remainingCount = document.getElementById('remaining-count');

    if (cards.length > 0) {
        questionText.textContent = cards[currentCardIndex].question;
        answerText.innerHTML = cards[currentCardIndex].answer;
        remainingCount.textContent = cards.length;
        
        // Wait for the content to be updated before rendering math
        setTimeout(() => {
            if (typeof MathJax !== 'undefined') {
                MathJax.typesetPromise();
            }
        }, 0);
    } else {
        questionText.textContent = "No more cards to review!";
        answerText.textContent = "You've completed all cards!";
        remainingCount.textContent = "0";
    }
}

function handleFeedback(feedback, event) {
    event.stopPropagation(); // Prevent card flip when clicking buttons
    
    const currentCard = cards[currentCardIndex];
    const card = document.querySelector('.flashcard');
    
    // Add event listener for transition end
    const handleTransitionEnd = () => {
        // Remove the event listener after it's used
        card.removeEventListener('transitionend', handleTransitionEnd);
        
        if (feedback === 'correct') {
            // Move to next card
            cards.splice(currentCardIndex, 1);
            if (cards.length > 0) {
                currentCardIndex = Math.min(currentCardIndex, cards.length - 1);
            } else {
                currentCardIndex = 0;
            }
            updateCardDisplay();
        }
    };

    // Add the event listener
    card.addEventListener('transitionend', handleTransitionEnd);
    
    // Start the flip animation
    card.classList.add('flipped');
}

function checkReviewQueue() {
    const now = Date.now();
    const dueCards = reviewQueue.filter(card => card.nextReview <= now);
    
    if (dueCards.length > 0) {
        // Add due cards back to the deck
        cards = [...dueCards, ...cards];
        // Remove due cards from review queue
        reviewQueue = reviewQueue.filter(card => card.nextReview > now);
        updateCardDisplay();
    }
}

// Initialize the flashcard system
document.addEventListener('DOMContentLoaded', () => {
    const card = document.querySelector('.flashcard');
    const container = document.querySelector('.container');
    
    // Add event listeners to the container for a larger hit area
    container.addEventListener('mousemove', (e) => {
        if (isInBoundingBox(card, e)) {
            handleCardHover(card, e);
        } else if (isHovering) {
            handleCardLeave(card);
        }
    });
    
    container.addEventListener('mouseleave', () => {
        if (isHovering) {
            handleCardLeave(card);
        }
    });
    
    card.addEventListener('click', (e) => flipCard(card, e));
    
    updateCardDisplay();
});

// Check review queue every minute
setInterval(checkReviewQueue, 60 * 1000); 