// sposób 1 z wykozrystaniem kosztownego $lookup
db.articles.aggregate([
  {
    // Krok 1: Dołącz dane z kolekcji 'publishers'
    $lookup: {
      from: "publishers",
      localField: "publisher_id",
      foreignField: "_id",
      as: "publisher_details"
    }
  },
  {
    // Krok 2: Spłaszcz tablicę (lookup zawsze zwraca tablicę)
    $unwind: "$publisher_details"
  },
  {
    // Krok 3: Filtruj po nazwie dołączonego wydawcy
    $match: {
      "publisher_details.name": "Elsevier"
    }
  },
  {
    // Krok 4: Policz wyniki
    $count: "total_retractions_by_elsevier"
  }
]).explain("executionStats")
// działa w 10998 ms

/// lepsze podejście - wykorzystujące dostępne funkcje na kolekcji

// Krok 1: Znajdź ID wydawcy (trwa 1ms)
var elsevier = db.publishers.findOne({ name: "Elsevier" });

// Krok 2: Policz artykuły z tym ID (błyskawiczne z indeksem)
if (elsevier) {
    db.articles.explain("executionStats").count({ publisher_id: elsevier._id });
} else {
    print("Nie znaleziono takiego wydawcy.");
} // działa w czasie 132 ms