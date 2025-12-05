// Opcjonalnie: usuń stary widok, jeśli chcesz zwolnić nazwę
// db.view_blacklisted_authors.drop()

db.createView(
  "view_author_severity_report",  // Nowa nazwa widoku
  "authors_authenticated",        // Kolekcja źródłowa (Autorzy z ORCID)
  [
    // 1. Przygotuj imię i nazwisko do wyszukiwania
    { $addFields: {
        full_name_regex: { $concat: ["$given", " ", "$family"] }
    }},

    // 2. Połącz z artykułami (To jest ten "miękki JOIN")
    { $lookup: {
        from: "articles",
        let: { author_name: "$full_name_regex" },
        pipeline: [
            // Szukamy artykułów, gdzie w polu Author występuje nasze nazwisko
            { $match: {
                $expr: {
                    $regexMatch: { input: "$Author", regex: "$$author_name" }
                }
            }},
            // WAŻNE: Wyciągamy tylko to co potrzebne i SORTUJEMY WYNIKI W ŚRODKU
            { $project: { Title: 1, calculated_severity: 1 } },
            { $sort: { calculated_severity: -1 } } // Najcięższe na górze listy
        ],
        as: "found_articles"
    }},

    // 3. Filtr: Pokaż tylko autorów, którzy faktycznie mają jakieś wycofane artykuły
    { $match: { "found_articles.0": { $exists: true } } },

    // 4. Formatowanie wyniku (To o co prosiłeś - "sensownie pokazane")
    { $project: {
        _id: 0,
        "Author Name": "$full_name_regex",
        "ORCID": "$_id",
        
        // Statystyki
        "Highest Severity": { $max: "$found_articles.calculated_severity" },
        "Total Retractions": { $size: "$found_articles" },

        // TABLICA 1: Tylko lista punktów (np. [10, 10, 5, 1])
        "Scores History": "$found_articles.calculated_severity",

        // TABLICA 2 (Opcjonalnie): Pełna lista z tytułami, posortowana
        "Detailed Report": {
            $map: {
                input: "$found_articles",
                as: "art",
                in: {
                    Score: { $ifNull: ["$$art.calculated_severity", 1] }, // Zabezpieczenie na null
                    Title: "$$art.Title"
                }
            }
        }
    }},

    // 5. Sortowanie głównego widoku: Najgorsi autorzy na górze
    { $sort: { "Highest Severity": -1, "Total Retractions": -1 } }
  ]
)

print("✅ Utworzono widok 'view_author_severity_report'.");