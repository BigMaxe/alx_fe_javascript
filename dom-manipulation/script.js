// Our quote notebook - will be loaded from localStorage if available
let quotes = [];
let filteredQuotes = [];
let serverQuotes = [];
let isOnline = true;
let syncInterval = null;
let pendingConflicts = [];

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
const syncStatus = document.getElementById("syncStatus");
const syncButton = document.getElementById("syncButton");
const conflictResolveButton = document.getElementById("conflictResolveButton");
const notificationArea = document.getElementById("notificationArea");
const notificationContent = document.getElementById("notificationContent");
const closeNotification = document.getElementById("closeNotification");

const SERVER_API_URL = 'https://jsonplaceholder.typicode.com/posts';

// Local Storage Functions
function saveQuotes() {
  localStorage.setItem('quotes', JSON.stringify(quotes));
  localStorage.setItem('lastSyncTimestamp', Date.now().toString());
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

function saveServerQuotes() {
    localStorage.setItem('serverQuotes', JSON.stringify(serverQuotes));
}

function loadServerQuotes() {
    const saved = localStorage.getItem('serverQuotes');
    if (saved) {
        serverQuotes = JSON.parse(saved);
    }
}

function getLastSyncTimestamp() {
    const timestamp = localStorage.getItem('lastSyncTimestamp');
    return timestamp ? parseInt(timestamp) : 0;
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

function showNotification(message, type = 'info') {
    notificationContent.innerHTML = `
        <div class="notification ${type}">
            <strong>${type.toUpperCase()}:</strong> ${message}
        </div>
    `;
    notificationArea.style.display = 'block';
    
    // Auto-hide after 5 seconds for non-conflict notifications
    if (type !== 'conflict') {
        setTimeout(() => {
            hideNotification();
        }, 5000);
    }
}

function hideNotification() {
    notificationArea.style.display = 'none';
}

//  Update Sync Status Display
function updateSyncStatus(status, isError = false) {
    syncStatus.textContent = status;
    syncStatus.className = isError ? 'sync-error' : 'sync-ok';
}

// Simulate Server Data Fetch
async function fetchQuotesFromServer() {
    try {
        updateSyncStatus('Syncing with server...');
        
        // Simulate server fetch using JSONPlaceholder
        const response = await fetch(`${SERVER_API_URL}?_limit=10`);
        if (!response.ok) {
            throw new Error('Server communication failed');
        }
        
        const posts = await response.json();
        
        // Transform JSONPlaceholder posts to quote format
        const transformedQuotes = posts.map(post => ({
            id: post.id,
            text: post.title.charAt(0).toUpperCase() + post.title.slice(1) + '.',
            category: post.id % 2 === 0 ? 'Wisdom' : 'Philosophy',
            serverTimestamp: Date.now()
        }));
        
        serverQuotes = transformedQuotes;
        saveServerQuotes();
        isOnline = true;
        updateSyncStatus(`Last sync: ${new Date().toLocaleTimeString()}`);
        
        return serverQuotes;
        
    } catch (error) {
        console.error('Sync failed:', error);
        isOnline = false;
        updateSyncStatus('Sync failed - Working offline', true);
        showNotification('Failed to sync with server. Working in offline mode.', 'error');
        return null;
    }
}

// Post quote data to server using mock API
async function postQuoteToServer(quoteData) {
    try {
        const response = await fetch(SERVER_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: quoteData.text,
                body: `Category: ${quoteData.category}`,
                userId: 1
            })
        });

        if (!response.ok) {
            throw new Error('Failed to post quote to server');
        }

        const result = await response.json();
        showNotification(`Quote successfully posted to server (ID: ${result.id})`, 'success');
        return result;
        
    } catch (error) {
        console.error('Post to server failed:', error);
        showNotification('Failed to post quote to server. Saved locally.', 'error');
        return null;
    }
}

// MODIFIED: Sync quotes function (now includes posting)
async function syncQuotes() {
    // Fetch quotes from server
    const serverData = await fetchQuotesFromServer();
    
    if (!serverData) {
        return; // Sync failed
    }
    
    // Post any new local quotes to server
    const lastSync = getLastSyncTimestamp();
    const newLocalQuotes = quotes.filter(quote => 
        !quote.id && quote.timestamp && quote.timestamp > lastSync
    );
    
    // Post new local quotes to server
    for (const localQuote of newLocalQuotes) {
        await postQuoteToServer(localQuote);
    }
    
    // Detect conflicts
    const conflicts = detectConflicts(quotes, serverData);
    
    if (conflicts.length > 0) {
        pendingConflicts = conflicts;
        conflictResolveButton.style.display = 'inline-block';
        
        const conflictMessages = conflicts.map(c => c.message).join('\n');
        showNotification(`Conflicts detected!\n${conflictMessages}\nClick "Resolve Conflicts" to merge changes.`, 'conflict');
    } else {
        showNotification('Data is in sync with server.', 'success');
    }
}

//  Detect Conflicts Between Local and Server Data
function detectConflicts(localQuotes, serverQuotes) {
    const conflicts = [];
    
    // Simple conflict detection: check if server has quotes not in local
    serverQuotes.forEach(serverQuote => {
        const existsLocally = localQuotes.some(localQuote => 
            localQuote.text === serverQuote.text || 
            (localQuote.id && localQuote.id === serverQuote.id)
        );
        
        if (!existsLocally) {
            conflicts.push({
                type: 'server_new',
                serverQuote: serverQuote,
                message: `New quote from server: "${serverQuote.text}"`
            });
        }
    });
    
    // Check for local quotes that might conflict with server logic
    const lastSync = getLastSyncTimestamp();
    const recentLocalQuotes = localQuotes.filter(quote => 
        !quote.id && (!quote.timestamp || quote.timestamp > lastSync)
    );
    
    if (recentLocalQuotes.length > 0 && serverQuotes.length > 0) {
        recentLocalQuotes.forEach(localQuote => {
            conflicts.push({
                type: 'local_new',
                localQuote: localQuote,
                message: `Local quote may need server sync: "${localQuote.text}"`
            });
        });
    }
    
    return conflicts;
}

// Resolve Conflicts (Server takes precedence)
function resolveConflicts(conflicts) {
    let addedCount = 0;
    
    conflicts.forEach(conflict => {
        if (conflict.type === 'server_new') {
            // Add server quotes to local (server takes precedence)
            const existsLocally = quotes.some(quote => 
                quote.text === conflict.serverQuote.text ||
                (quote.id && quote.id === conflict.serverQuote.id)
            );
            
            if (!existsLocally) {
                quotes.push({
                    ...conflict.serverQuote,
                    timestamp: Date.now()
                });
                addedCount++;
            }
        }
    });
    
    if (addedCount > 0) {
        saveQuotes();
        populateCategories();
        filterQuotes();
        showNotification(`Resolved conflicts: Added ${addedCount} quotes from server.`, 'success');
    } else {
        showNotification('No conflicts to resolve.', 'info');
    }
    
    pendingConflicts = [];
    conflictResolveButton.style.display = 'none';
}

//  Sync with Server
async function syncWithServer() {
  await syncQuotes();
}

// Start Periodic Sync (every 30 seconds)
function startPeriodicSync() {
    // Clear existing interval
    if (syncInterval) {
        clearInterval(syncInterval);
    }
    
    // Initial sync
    syncWithServer();
    
    // Set up periodic sync every 30 seconds
    syncInterval = setInterval(() => {
        syncWithServer();
    }, 30000);
}

// Stop Periodic Sync
function stopPeriodicSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
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
  const randomQuote = filteredQuotes[randomIndex];

  // write the quote on our HTML page.
  quoteDisplay.innerHTML = `
    <p id="quoteText">"${randomQuote.text}"</p>
    <p id="quoteAuthor">— ${randomQuote.category}</p>
  `;
}

// TAdd a New Quote
async function createAddQuoteForm() {
  const quote = newQuoteText.value.trim();
  const category = newQuoteCategory.value.trim();

  // Check that box is not empty
  if (quote !== "" && category !== "") {
    // New card for new quote.
    const newQuote = { text: quote, category: category, timestamp: Date.now() };
    quotes.push(newQuote);

    //Save to local storage
    saveQuotes();

    // Post quote to server
    await postQuoteToServer(newQuote);

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

    showNotification('Quote added successfully!', 'success');
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
async function importFromJsonFile() {
    const file = importFile.files[0];
    if (!file) {
        alert('Please select a JSON file to import!');
        return;
    }

    const fileReader = new FileReader();
    fileReader.onload = async function(event) {
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

            const timestampedQuotes = importedQuotes.map(quote => ({
                ...quote,
                timestamp: quote.timestamp || Date.now()
            }));

            // Add imported quotes to existing quotes
            quotes.push(...timestampedQuotes);
            saveQuotes();
            
            // 🟢 NEW: Post imported quotes to server
            for (const quote of timestampedQuotes) {
                await postQuoteToServer(quote);
            }
            
            // Update categories dropdown with new categories
            populateCategories();
            // Update filtered quotes based on current filter
            filterQuotes();
            showNotification(`Successfully imported ${importedQuotes.length} quotes!`, 'success');
            alert(`Successfully imported ${importedQuotes.length} quotes!`);
                        
            // Clear the file input
            importFile.value = '';
            
        } catch (error) {
            showNotification('Error importing quotes: ' + error.message, 'error');
            alert('Error importing quotes: ' + error.message);
        }
    };
    fileReader.readAsText(file);
}

// Initialize the application
function initializeApp() {
    // Load quotes from localStorage
    loadQuotes();
    loadServerQuotes(); // 🟢 NEW: Load server quotes

    // Populate categories dropdown
    populateCategories();
    
    // Apply the last selected filter
    filterQuotes();
                
    // Show last viewed quote from session storage, or random quote
    const lastQuote = getLastQuote();
    if (lastQuote && filteredQuotes.some(q => q.text === lastQuote.text && q.category === lastQuote.category)) {
        quoteDisplay.innerHTML = `
            <p id="quoteText">"${lastQuote.text}"</p>
            <p id="quoteAuthor">— ${lastQuote.category}</p>
        `;
    } else {
        showRandomQuoteFromFiltered();
    }

    startPeriodicSync();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopPeriodicSync();
});

// buttons instructions
newQuoteButton.addEventListener("click", showRandomQuote);
addQuoteButton.addEventListener("click", createAddQuoteForm);
exportButton.addEventListener("click", exportQuotes);
importButton.addEventListener("click", importFromJsonFile);
syncButton.addEventListener("click", syncWithServer);
conflictResolveButton.addEventListener("click", () => resolveConflicts(pendingConflicts));
closeNotification.addEventListener("click", hideNotification);
window.onload = initializeApp;
