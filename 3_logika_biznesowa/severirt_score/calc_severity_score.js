print("⏳ Obliczanie Risk Score dla wszystkich artykułów...");

var bulkOps = [];
var counter = 0;

// Pobieramy artykuły, które mają powody
db.articles.find({ reason_ids: { $exists: true, $ne: [] } }).forEach(doc => {
    
    // Pobieramy wagi z kolekcji reasons dla tego artykułu
    // (To jest operacja, której chcemy uniknąć w przyszłości robiąc to teraz raz)
    var reasons = db.reasons.find(
        { _id: { $in: doc.reason_ids } }, 
        { severity: 1 } 
    ).toArray();

    // Sumujemy punkty
    var totalScore = reasons.reduce((sum, r) => sum + (r.severity || 1), 0);

    // Dodajemy do kolejki aktualizacji
    bulkOps.push({
        updateOne: {
            filter: { _id: doc._id },
            update: { $set: { calculated_severity: totalScore } }
        }
    });

    counter++;
    if (bulkOps.length >= 1000) {
        db.articles.bulkWrite(bulkOps);
        bulkOps = [];
        print("Przeliczono: " + counter);
    }
});

if (bulkOps.length > 0) db.articles.bulkWrite(bulkOps);
print("✅ Zakończono! Artykuły mają teraz pole 'calculated_severity'.");