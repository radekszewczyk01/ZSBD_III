// --- KROK 1: Ekstrakcja unikalnych powodów do nowej kolekcji ---
print("⏳ KROK 1: Znajdowanie unikalnych powodów...");

// Używamy agregacji, żeby wyciągnąć wszystkie warianty, niezależnie czy są tablicą czy tekstem
var uniqueReasons = db.articles.aggregate([
    {
        $project: {
            reasons_array: {
                $cond: { 
                    if: { $isArray: "$Reason" }, 
                    then: "$Reason", 
                    else: { $split: ["$Reason", ";"] } 
                }
            }
        }
    },
    { $unwind: "$reasons_array" },
    { 
        $project: { 
            clean_name: { $trim: { input: "$reasons_array" } } 
        } 
    },
    { $match: { clean_name: { $ne: "" } } },
    { $group: { _id: "$clean_name" } } // Deduplikacja
]).toArray();

print("Znaleziono " + uniqueReasons.length + " unikalnych powodów.");

// Tworzymy nową kolekcję i mapę w pamięci
db.reasons.drop(); // Usuwamy starą, jeśli istniała (dla bezpieczeństwa testów)
db.createCollection("reasons");

var reasonMap = {}; // Słownik: "Nazwa Powodu" -> ObjectId

uniqueReasons.forEach(function(doc) {
    var res = db.reasons.insertOne({ name: doc._id });
    reasonMap[doc._id] = res.insertedId;
});

print("✅ Kolekcja 'reasons' utworzona.");


// --- KROK 2: Aktualizacja Artykułów (Podmiana na ID) ---
print("⏳ KROK 2: Aktualizacja artykułów (to może chwilę potrwać)...");

var bulkOps = [];
var counter = 0;

db.articles.find({ "Reason": { $exists: true } }).forEach(function(doc) {
    var myReasons = [];
    var rawReasons = [];

    // Normalizacja: sprawdzamy czy to tablica czy string
    if (Array.isArray(doc.Reason)) {
        rawReasons = doc.Reason;
    } else if (typeof doc.Reason === 'string') {
        rawReasons = doc.Reason.split(';');
    }

    // Mapowanie nazw na ID
    rawReasons.forEach(function(rString) {
        var clean = rString.trim();
        if (clean.length > 0 && reasonMap[clean]) {
            myReasons.push(reasonMap[clean]);
        }
    });

    // Dodajemy operację aktualizacji do kolejki
    if (myReasons.length > 0) {
        bulkOps.push({
            updateOne: {
                filter: { _id: doc._id },
                update: { 
                    $set: { "reason_ids": myReasons }, // Nowe pole z ID
                    $unset: { "Reason": "" }           // Usuwamy stare pole tekstowe
                }
            }
        });
    }

    // Wykonaj zapis co 1000 dokumentów (optymalizacja)
    if (bulkOps.length >= 1000) {
        db.articles.bulkWrite(bulkOps);
        bulkOps = [];
        counter += 1000;
        print("Przetworzono: " + counter);
    }
});

// Zapisz końcówkę
if (bulkOps.length > 0) {
    db.articles.bulkWrite(bulkOps);
}

print("🎉 ZAKOŃCZONO! Twoja baza jest teraz znormalizowana.");