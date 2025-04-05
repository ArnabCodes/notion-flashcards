// Sample flashcard data - you can replace this with your own data
const flashcardData = [
    { question: "What is the capital of France?", answer: "Paris" },
    { question: "What is 2 + 2?", answer: "4" },
    { question: "What is the largest planet in our solar system?", answer: "Jupiter" }
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

function flipCard(card) {
    card.classList.toggle('flipped');
}

function updateCardDisplay() {
    const questionText = document.getElementById('question-text');
    const answerText = document.getElementById('answer-text');
    const remainingCount = document.getElementById('remaining-count');

    if (cards.length > 0) {
        questionText.textContent = cards[currentCardIndex].question;
        answerText.textContent = cards[currentCardIndex].answer;
        remainingCount.textContent = cards.length;
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
    
    if (feedback === 'correct') {
        // Move card to review queue with next interval
        const nextReviewTime = Date.now() + intervals[0];
        reviewQueue.push({
            ...currentCard,
            nextReview: nextReviewTime,
            intervalIndex: 0
        });
        masteredCards.push(currentCard);
    } else {
        // Keep card in current deck for immediate review
        reviewQueue.unshift(currentCard);
    }

    // Remove current card from deck
    cards.splice(currentCardIndex, 1);

    // Reset card to front side
    card.classList.remove('flipped');

    // Update display
    if (cards.length > 0) {
        currentCardIndex = Math.min(currentCardIndex, cards.length - 1);
    } else {
        currentCardIndex = 0;
    }

    updateCardDisplay();
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
updateCardDisplay();

// Check review queue every minute
setInterval(checkReviewQueue, 60 * 1000); 