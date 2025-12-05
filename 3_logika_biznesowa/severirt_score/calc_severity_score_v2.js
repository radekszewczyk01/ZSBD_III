print("⏳ Przeliczanie ryzyka Metodą Kwadratową (Punishing High Severity)...");

var bulkOps = [];
var counter = 0;

// Pobieramy artykuły, które mają jakieś powody
var cursor = db.articles.find({ reason_ids: { $exists: true, $ne: [] } });

cursor.forEach(doc => {
    // Pobierz wagi powodów
    var reasons = db.reasons.find(
        { _id: { $in: doc.reason_ids } }, 
        { severity: 1 } 
    ).toArray();

    if (reasons.length > 0) {
        // 1. Oblicz sumę kwadratów (Square Sum)
        // Waga 10 -> 100 pkt
        // Waga 5 -> 25 pkt
        // Waga 1 -> 1 pkt
        var quadraticScore = reasons.reduce((sum, r) => {
            var s = r.severity || 1;
            return sum + (s * s);
        }, 0);

        // 2. Znajdź najcięższy pojedynczy zarzut (Max Severity)
        // To się przyda do wyświetlania na dashboardzie (np. "Max: 10")
        var maxSeverity = Math.max(...reasons.map(r => r.severity || 1));

        // Dodaj do kolejki
        bulkOps.push({
            updateOne: {
                filter: { _id: doc._id },
                update: { 
                    $set: { 
                        calculated_severity: quadraticScore, // Nadpisujemy stary wynik nowym, lepszym
                        max_single_severity: maxSeverity     // Nowe pole pomocnicze
                    } 
                }
            }
        });

        counter++;
    }

    if (bulkOps.length >= 1000) {
        db.articles.bulkWrite(bulkOps);
        bulkOps = [];
        print("Przeliczono: " + counter);
    }
});

if (bulkOps.length > 0) db.articles.bulkWrite(bulkOps);
print("✅ Zakończono! Zastosowano logikę kwadratową.");