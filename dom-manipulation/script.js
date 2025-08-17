// Our quote notebook - will be loaded from localStorage if available
let quotes = [];
let filteredQuotes = [];

// Our quote notebook
const defaultQuotes = [
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
const exportButton = document.getElementById("exportButton");
const importFile = document.getElementById("importFile");
const importButton = document.getElementById("importButton");
const categoryFilter = document.getElementById("categoryFilter");

// Local Storage Functions
function saveQuotes() {
  localStorage.setItem('quotes', JSON.stringify(quotes));
}

function loadQuotes() {
    const savedQuotes = localStorage.getItem('quotes');
    if (savedQuotes) {
        quotes = JSON.parse(savedQuotes);
    } else {
        quotes = [...defaultQuotes];
        saveQuotes();
    }
}

// Session Storage Functions (for last viewed quote)
function saveLastQuote(quote) {
    sessionStorage.setItem('lastQuote', JSON.stringify(quote));
}

function getLastQuote() {
    const lastQuote = sessionStorage.getItem('lastQuote');
    return lastQuote ? JSON.parse(lastQuote) : null;
}

// Filter Storage Functions (for last selected filter)
function saveLastFilter(category) {
    localStorage.setItem('lastFilter', category);
}

function getLastFilter() {
    return localStorage.getItem('lastFilter') || 'all';
}

// NEW: Populate Categories Dynamically
function populateCategories() {
    // Get unique categories from quotes
    const categories = [...new Set(quotes.map(quote => quote.category))];
    
    // Clear existing options (except "All Categories")
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    
    // Add category options
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
    
    // Restore last selected filter
    const lastFilter = getLastFilter();
    categoryFilter.value = lastFilter;
}

// NEW: Filter Quotes Based on Selected Category
function filterQuotes() {
    const selectedCategory = categoryFilter.value;
    
    // Save the selected filter
    saveLastFilter(selectedCategory);
    
    if (selectedCategory === 'all') {
        filteredQuotes = [...quotes];
    } else {
        filteredQuotes = quotes.filter(quote => quote.category === selectedCategory);
    }
    
    // If no quotes match the filter, show a message
    if (filteredQuotes.length === 0) {
        quoteDisplay.innerHTML = `
            <p id="quoteText">No quotes found for category "${selectedCategory}"</p>
            <p id="quoteAuthor">Try selecting a different category or add some quotes!</p>
        `;
        return;
    }
    
    // Show a random quote from filtered quotes
    showRandomQuoteFromFiltered();
}

function showRandomQuote() {
    // If no filter is applied, use all quotes
    if (filteredQuotes.length === 0) {
        filteredQuotes = [...quotes];
    }
    
    showRandomQuoteFromFiltered();
}

// Show a Random Quote
function showRandomQuoteFromFiltered() {
  if (filteredQuotes.length === 0) {
        quoteDisplay.innerHTML = `
            <p id="quoteText">No quotes available!</p>
            <p id="quoteAuthor">Please add some quotes first.</p>
        `;
        return;
    }

  const randomIndex = Math.floor(Math.random() * quotes.length);
  const randomQuote = quotes[randomIndex];

  // write the quote on our HTML page.
  quoteDisplay.innerHTML = `
    <p id="quoteText">"${randomQuote.text}"</p>
    <p id="quoteAuthor">— ${randomQuote.category}</p>
  `;
}

// TAdd a New Quote
function createAddQuoteForm() {
  const quote = newQuoteText.value.trim();
  const category = newQuoteCategory.value.trim();

  // Check that box is not empty
  if (quote !== "" && category !== "") {
    // New card for new quote.
    const newQuote = { text: quote, category: category };
    quotes.push(newQuote);

    //Save to local storage
    saveQuotes();

    // Update categories dropdown if new category was added
    populateCategories();

    // Update filtered quotes if current filter matches new quote's category
    const currentFilter = categoryFilter.value;
    if (currentFilter === 'all' || currentFilter === category) {
        filteredQuotes.push(newQuote);
    }

     // Use createElement and appendChild to update the DOM
    const quoteTextElement = document.createElement("p");
    quoteTextElement.id = "quoteText";
    quoteTextElement.textContent = `"${newQuote.text}"`;
    
    const quoteCategoryElement = document.createElement("p");
    quoteCategoryElement.id = "quoteAuthor";
    quoteCategoryElement.textContent = `— ${newQuote.category}`;
    
    // Clear the display and add the new elements
    quoteDisplay.innerHTML = "";
    quoteDisplay.appendChild(quoteTextElement);
    quoteDisplay.appendChild(quoteCategoryElement);

    // Save the newly displayed quote to session storage
    saveLastQuote(newQuote);

    newQuoteText.value = "";
    newQuoteCategory.value = "";
  } else {
        alert("Please enter both quote text and category!");
    }
}

// Export quotes to JSON
function exportQuotes() {
            const dataStr = JSON.stringify(quotes, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const url = URL.createObjectURL(dataBlob);
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = 'quotes.json';
            downloadLink.click();
            
            // Clean up the URL object
            URL.revokeObjectURL(url);
}

// Import quotes from JSON file
function importFromJsonFile() {
  const file = importFile.files[0];
  if (!file) {
      alert('Please select a JSON file to import!');
      return;
  }

  const fileReader = new FileReader();
  fileReader.onload = function(event) {
      try {
          const importedQuotes = JSON.parse(event.target.result);
                    
          // Validate the imported data
          if (!Array.isArray(importedQuotes)) {
              throw new Error('Invalid JSON format: Expected an array of quotes');
          }

          // Validate each quote object
          for (const quote of importedQuotes) {
              if (!quote.text || !quote.category) {
                  throw new Error('Invalid quote format: Each quote must have "text" and "category" properties');
              }
          }

          // Add imported quotes to existing quotes
          quotes.push(...importedQuotes);
          saveQuotes();
          // Update categories dropdown with new categories
          populateCategories();
          // Update filtered quotes based on current filter
          filterQuotes();
          alert(`Successfully imported ${importedQuotes.length} quotes!`);
                    
          // Clear the file input
          importFile.value = '';
          
      } catch (error) {
          alert('Error importing quotes: ' + error.message);
      }
  };
  fileReader.readAsText(file);
}

// Initialize the application
function initializeApp() {
  // Load quotes from localStorage
  loadQuotes();

  // Populate categories dropdown
  populateCategories();
  
  // Apply the last selected filter
  filterQuotes();
            
  // Show last viewed quote from session storage, or random quote
  const lastQuote = getLastQuote();
  if (lastQuote && quotes.some(q => q.text === lastQuote.text && q.category === lastQuote.category)) {
      quoteDisplay.innerHTML = `
          <p id="quoteText">"${lastQuote.text}"</p>
          <p id="quoteAuthor">— ${lastQuote.category}</p>
      `;
  } else {
      showRandomQuoteFromFiltered();
  }
}

// buttons instructions
newQuoteButton.addEventListener("click", showRandomQuote);
addQuoteButton.addEventListener("click", createAddQuoteForm);
exportButton.addEventListener("click", exportQuotes);
importButton.addEventListener("click", importFromJsonFile);
window.onload = initializeApp;
