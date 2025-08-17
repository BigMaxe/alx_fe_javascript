// Our quote notebook
const quotes = [
  {
    text: "The best way to predict the future is to create it.",
    category: "Inspiration",
  },
  {
    text: "Life is what happens when you're busy making other plans.",
    category: "Life",
  },
  {
    text: "The only way to do great work is to love what you do.",
    category: "Work",
  },
  {
    text: "Imagination is more important than knowledge.",
    category: "Creativity",
  },
  { text: "An apple a day keeps the doctor away.", category: "Health" },
];

// A map to the HTML pieces.
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteButton = document.getElementById("newQuoteButton");
const newQuoteText = document.getElementById("newQuoteText");
const newQuoteCategory = document.getElementById("newQuoteCategory");
const addQuoteButton = document.getElementById("addQuoteButton");

// Show a Random Quote
function showRandomQuote() {
  const randomIndex = Math.floor(Math.random() * quotes.length);
  const randomQuote = quotes[randomIndex];

  // write the quote on our HTML page.
  quoteDisplay.innerHTML = `
    <p id="quoteText">"${randomQuote.text}"</p>
    <p id="quoteAuthor">— ${randomQuote.category}</p>
  `;
}

// TAdd a New Quote
function addQuote() {
  const quote = newQuoteText.value.trim();
  const category = newQuoteCategory.value.trim();

  // Check that box is not empty
  if (quote !== "" && category !== "") {
    // New card for new quote.
    const newQuote = { text: quote, category: category };
    quotes.push(newQuote);

    newQuoteText.value = "";
    newQuoteCategory.value = "";
    showRandomQuote();
  }
}

// buttons instructions
newQuoteButton.addEventListener("click", showRandomQuote);
addQuoteButton.addEventListener("click", addQuote);
window.onload = showRandomQuote;
