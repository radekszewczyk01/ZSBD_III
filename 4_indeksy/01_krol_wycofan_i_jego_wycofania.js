db.articles.aggregate([
  // Krok 1: Przygotuj dane (Rozbij autorów i powody)
  {
    $project: {
      // Rozbijamy string autorów na tablicę (usuwając spacje)
      authors_list: { 
        $map: {
          input: { $split: ["$Author", ";"] },
          as: "a",
          in: { $trim: { input: "$$a" } }
        }
      },
      // Zabezpieczenie: Traktujemy powód jako tablicę (nawet jak jest stringiem)
      reasons_list: {
        $cond: {
          if: { $isArray: "$Reason" },
          then: "$Reason",
          else: { $split: ["$Reason", ";"] } 
        }
      }
    }
  },

  // Krok 2: "Rozpakuj" autorów (jeden dokument = jeden autor)
  { $unwind: "$authors_list" },

  // Krok 3: Odrzuć pustych autorów (np. po ostatnim średniku)
  { $match: { authors_list: { $ne: "" } } },

  // Krok 4: Zgrupuj po Autorze i zbierz wszystkie jego powody do jednego wielkiego worka
  {
    $group: {
      _id: "$authors_list",
      total_retractions: { $sum: 1 },
      all_reasons_collected: { $push: "$reasons_list" }
    }
  },

  // Krok 5: Posortuj malejąco i weź TYLKO JEDNEGO najlepszego
  { $sort: { total_retractions: -1 } },
  { $limit: 1 },

  // --- W tym momencie mamy 1 dokument z nazwiskiem rekrodzisty ---
  // Teraz analizujemy jego powody.
  
  // Krok 6: Rozbij tablicę tablic powodów (Flatten)
  { $unwind: "$all_reasons_collected" }, // Rozbija listę artykułów
  { $unwind: "$all_reasons_collected" }, // Rozbija listę powodów wewnątrz artykułu

  // Krok 7: Policz konkretne powody dla tego autora
  {
    $group: {
      _id: { 
        author: "$_id", 
        reason: "$all_reasons_collected" 
      },
      count: { $sum: 1 },
      total_retractions_ref: { $first: "$total_retractions" } // Zachowaj info o sumie
    }
  },

  // Krok 8: Posortuj powody od najczęstszego
  { $sort: { count: -1 } },

  // Krok 9: Ładne sformatowanie wyniku końcowego
  {
    $group: {
      _id: "$_id.author", // Imię autora
      total_articles_retracted: { $first: "$total_retractions_ref" },
      breakdown: {
        $push: {
          reason: "$_id.reason",
          count: "$count"
        }
      }
    }
  }
])