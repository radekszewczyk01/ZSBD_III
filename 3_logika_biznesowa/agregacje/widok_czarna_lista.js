db.createView(
  "view_verified_risk_report",  // Nazwa widoku
  "authors_authenticated",      // Źródło (Autorzy z ORCID)
  [
    // 1. SZYBKI LOOKUP (JOIN po ID)
    {
      $lookup: {
        from: "articles",
        localField: "_id",                   // ORCID autora (np. "0000-...")
        foreignField: "authenticated_author_ids", // Tablica ID w artykule (z indeksem!)
        as: "linked_articles"
      }
    },

    // 2. Filtr: Pokaż tylko tych, którzy mają jakieś powiązane artykuły
    { $match: { "linked_articles.0": { $exists: true } } },

    // 3. Formatowanie i Wewnętrzne Sortowanie Tablicy
    {
      $project: {
        _id: 0,
        "Author Name": { $concat: ["$given", " ", "$family"] },
        "ORCID": "$_id",
        
        // MAGIA: Sortujemy tablicę artykułów wewnątrz dokumentu autora
        // (Najcięższe przewinienia na początku tablicy)
        "Sorted_Articles": {
          $sortArray: {
            input: "$linked_articles",
            sortBy: { calculated_severity: -1 }
          }
        }
      }
    },

    // 4. Wyciągnięcie metryk do głównego sortowania
    {
      $project: {
        "Author Name": 1,
        "ORCID": 1,
        
        // Najwyższy wynik to teraz po prostu pierwszy element posortowanej tablicy
        "Max Severity": { $ifNull: [ { $arrayElemAt: ["$Sorted_Articles.calculated_severity", 0] }, 0 ] },
        
        "Total Retractions": { $size: "$Sorted_Articles" },

        // To o co prosiłeś: Czysta tablica punktów [85, 10, 5...]
        "Scores Array": "$Sorted_Articles.calculated_severity",

        // Opcjonalnie: Pełna lista z tytułami (dla czytelności)
        "Details": {
          $map: {
            input: "$Sorted_Articles",
            as: "art",
            in: {
              Score: { $ifNull: ["$$art.calculated_severity", 1] },
              Title: "$$art.Title"
            }
          }
        }
      }
    },

    // 5. GLOBALNE SORTOWANIE: Najgroźniejsi autorzy na samą górę
    { $sort: { "Max Severity": -1, "Total Retractions": -1 } }
  ]
)

print("✅ Utworzono widok 'view_verified_risk_report'.");