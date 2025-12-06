print("🚀 Rozpoczynam poszukiwanie autora z siecią powiązań 2. stopnia...");

// 1. Pobieramy tylko tych, którzy mają wpisanych znajomych (szkoda czasu na pustych)
// Używamy batchSize, żeby nie ciągnąć wszystkiego naraz
var cursor = db.authors_authenticated.find({ 
    "known_co_authors.0": { $exists: true } 
}).batchSize(100);

while (cursor.hasNext()) {
    var author = cursor.next();

    // 2. Uruchamiamy agregację dla tego jednego autora
    var result = db.authors_authenticated.aggregate([
        { $match: { _id: author._id } },
        {
            $graphLookup: {
                from: "authors_authenticated",
                startWith: "$known_co_authors",
                connectFromField: "known_co_authors",
                connectToField: "_id",
                as: "investigation_network",
                maxDepth: 2,
                depthField: "degrees_of_separation"
            }
        },
        // KROK NAPRAWCZY: Usuwamy autora głównego z wyników sieci
        {
            $addFields: {
                investigation_network: {
                    $filter: {
                        input: "$investigation_network",
                        as: "person",
                        cond: { $ne: ["$$person._id", "$_id"] } // Warunek: ID inne niż moje
                    }
                }
            }
        },
        // Formatowanie
        {
            $project: {
                _id: 1,
                given: 1,
                family: 1,
                // Sprawdzamy czy mamy kogoś na poziomie >= 1 (znajomy znajomego)
                has_extended_network: {
                    $gt: [
                        { 
                            $size: { 
                                $filter: { 
                                    input: "$investigation_network", 
                                    as: "p", 
                                    cond: { $gte: ["$$p.degrees_of_separation", 1] } 
                                } 
                            } 
                        }, 
                        0 
                    ]
                },
                connections: {
                    $map: {
                        input: "$investigation_network",
                        as: "person",
                        in: {
                            name: { $concat: ["$$person.given", " ", "$$person.family"] },
                            level: "$$person.degrees_of_separation",
                            id: "$$person._id"
                        }
                    }
                }
            }
        }
    ]).toArray()[0]; // Pobieramy pierwszy (i jedyny) wynik agregacji

    // 3. Sprawdzamy warunek stopu
    if (result && result.has_extended_network) {
        print("\n✅ ZNALEZIONO! Przykładowa sieć powiązań:");
        print("------------------------------------------------");
        print(`PACJENT ZERO: ${result.given} ${result.family}`);
        print(`ID: ${result._id}`);
        print("------------------------------------------------");
        
        // Sortujemy wyniki, żeby najpierw byli bezpośredni znajomi (Level 0)
        result.connections.sort((a, b) => a.level - b.level);

        result.connections.forEach(c => {
            var prefix = c.level === 0 ? "  ├── (Znajomy)          " : "  └── (Znajomy znajomego)";
            print(`${prefix} [Lvl ${c.level}]: ${c.name}`);
        });

        print("\n⏹️ Zatrzymano skrypt, ponieważ znaleziono powiązanie 2. stopnia.");
        break; // <--- PRZERYWAMY PĘTLĘ
    }
    
    // Opcjonalnie: kropka co 100 sprawdzonych, żebyś widział, że działa
    // if (Math.random() > 0.99) print("."); 
}

if (!cursor.hasNext()) {
    print("Przeszukano wszystkich autorów i nie znaleziono głębokich powiązań.");
}