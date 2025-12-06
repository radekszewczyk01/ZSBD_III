print("⏳ Tworzenie sieci współautorstwa (aktualizacja pola 'known_co_authors')...");

// 1. Mapa: Autor -> Zbiór Współautorów
let network = {};

// 2. Przechodzimy przez artykuły i budujemy relacje
db.articles.find({ "authenticated_author_ids.1": { $exists: true } }).forEach(doc => {
    let ids = doc.authenticated_author_ids;
    
    ids.forEach(authorId => {
        if (!network[authorId]) network[authorId] = new Set();
        
        // Dodaj wszystkich INNYCH autorów z tego artykułu jako znajomych
        ids.forEach(friendId => {
            if (authorId !== friendId) {
                network[authorId].add(friendId);
            }
        });
    });
});

// 3. Zapisujemy to w bazie (Bulk Update dla wydajności)
let bulk = db.authors_authenticated.initializeUnorderedBulkOp();
let count = 0;

for (let [authorId, friendsSet] of Object.entries(network)) {
    let friendsArray = Array.from(friendsSet); // Konwersja Set na Array
    
    if (friendsArray.length > 0) {
        bulk.find({ _id: authorId }).updateOne({
            $set: { known_co_authors: friendsArray }
        });
        count++;
    }
}

if (count > 0) {
    bulk.execute();
    print(`✅ Zaktualizowano ${count} autorów. Teraz mają pole 'known_co_authors'.`);
} else {
    print("⚠️ Brak danych do aktualizacji.");
}