// 1. Budujemy mapę instytucji w pamięci (Słownik: Nazwa -> ID)
print("⏳ Budowanie mapy instytucji...");
var institutionMap = {};
db.institutions.find().forEach(function(inst) {
    if (inst.name) {
        institutionMap[inst.name] = inst._id;
    }
});
print("✅ Mapa gotowa. Liczba znanych instytucji: " + Object.keys(institutionMap).length);

// 2. Przygotowujemy operacje masowe (Bulk Operations)
var bulkOps = [];
var counter = 0;
var matchCount = 0;

print("🚀 Rozpoczynamy dopasowywanie...");

db.authors_authenticated.find().forEach(function(author) {
    var foundInstIds = [];

    // Sprawdzamy czy autor ma afiliacje
    if (author.affiliations && Array.isArray(author.affiliations)) {
        
        // Struktura jest zagnieżdżona: [ [ {name: "..."} ], [ {name: "..."} ] ]
        // Musimy wejść głębiej.
        author.affiliations.forEach(function(subArray) {
            if (Array.isArray(subArray)) {
                subArray.forEach(function(affObj) {
                    // Sprawdzamy czy nazwa istnieje w naszej mapie
                    if (affObj && affObj.name && institutionMap[affObj.name]) {
                        foundInstIds.push(institutionMap[affObj.name]);
                    }
                });
            }
        });
    }

    // Jeśli znaleźliśmy jakieś dopasowania
    if (foundInstIds.length > 0) {
        // Usuwamy duplikaty (jeśli autor ma 2 razy tę samą uczelnię)
        // W starszym JS w Mongo używamy filter/indexOf
        var uniqueIds = foundInstIds.filter(function(item, pos) {
            return foundInstIds.indexOf(item) == pos;
        });

        // Dodajemy operację do kolejki
        bulkOps.push({
            updateOne: {
                filter: { _id: author._id },
                update: { $set: { institution_ids: uniqueIds } }
            }
        });
        matchCount++;
    }

    // Wykonujemy zapis co 1000 dokumentów (żeby nie zapchać pamięci)
    if (bulkOps.length >= 1000) {
        db.authors_authenticated.bulkWrite(bulkOps);
        bulkOps = [];
        counter += 1000;
        print("Przetworzono paczkę... (razem " + counter + ")");
    }
});

// Zapisz pozostałe końcówki
if (bulkOps.length > 0) {
    db.authors_authenticated.bulkWrite(bulkOps);
}

print("🎉 Zakończono!");
print("Liczba autorów, którym przypisano ID instytucji: " + matchCount);