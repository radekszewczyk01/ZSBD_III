print("⏳ Rozpoczynam linkowanie artykułów z autorami...");

var bulkOps = [];
var processedCount = 0;
var matchCount = 0;

// 1. Pobieramy tylko artykuły, które mają potencjał do połączenia (mają ORCID)
var cursor = db.articles.find({ "authors_extended.ORCID": { $exists: true } });

cursor.forEach(function(article) {
    // 2. Wyciągnij ORCIDy z tego artykułu do tablicy prostych stringów
    var orcidsInArticle = [];
    
    if (article.authors_extended && Array.isArray(article.authors_extended)) {
        article.authors_extended.forEach(a => {
            if (a.ORCID) {
                orcidsInArticle.push(a.ORCID);
            }
        });
    }

    if (orcidsInArticle.length > 0) {
        // 3. Znajdź autorów w 'authors_authenticated', którzy mają te ORCIDy
        // (Zakładamy, że w authors_authenticated polem _id jest właśnie ORCID)
        var foundAuthors = db.authors_authenticated.find(
            { _id: { $in: orcidsInArticle } }, 
            { _id: 1 } // Pobieramy tylko ID
        ).toArray();

        // Wyciągnij same ID z wyników
        var foundIds = foundAuthors.map(a => a._id);

        // 4. Jeśli znaleźliśmy pasujących autorów -> Aktualizujemy artykuł
        if (foundIds.length > 0) {
            bulkOps.push({
                updateOne: {
                    filter: { _id: article._id },
                    update: { 
                        $set: { 
                            // Dodajemy nowe pole z tablicą ID-ków
                            authenticated_author_ids: foundIds 
                        } 
                    }
                }
            });
            matchCount++;
        }
    }

    processedCount++;
    if (processedCount % 1000 === 0) print("Przetworzono: " + processedCount + " artykułów...");

    // 5. Zapisuj paczkami po 1000 (dla wydajności)
    if (bulkOps.length >= 1000) {
        db.articles.bulkWrite(bulkOps);
        bulkOps = [];
        print("💾 Zapisano paczkę zmian...");
    }
});

// Zapisz końcówkę
if (bulkOps.length > 0) {
    db.articles.bulkWrite(bulkOps);
}

print("✅ ZAKOŃCZONO!");
print("Przeanalizowano artykułów: " + processedCount);
print("Zaktualizowano (dodano linki): " + matchCount);