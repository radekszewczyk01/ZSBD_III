db.articles.aggregate([
  // Krok 1: Wybierz tylko artykuły, które mają pole authors_extended z jakimiś danymi
  {
    $match: { "authors_extended": { $exists: true, $ne: [] } }
  },

  // Krok 2: Rozbij tablicę (Unwind).
  // Jeśli artykuł ma 10 autorów, powstanie 10 tymczasowych dokumentów.
  {
    $unwind: "$authors_extended"
  },

  // Krok 3: Filtrowanie - zostawiamy TYLKO tych autorów, którzy mają ORCID.
  // Możesz tu dodać warunek 'authenticated-orcid': true, ale samo posiadanie ORCID zwykle wystarcza.
  {
    $match: { 
      "authors_extended.ORCID": { $exists: true } 
    }
  },

  // Krok 4: Grupowanie (Deduplikacja).
  // Używamy ORCID jako unikalnego klucza (_id).
  {
    $group: {
      _id: "$authors_extended.ORCID", // To będzie ID dokumentu w nowej kolekcji
      
      given: { $first: "$authors_extended.given" },   // Weź imię z pierwszego napotkanego
      family: { $first: "$authors_extended.family" }, // Weź nazwisko z pierwszego napotkanego
      
      // Opcjonalnie: zbierz wszystkie warianty afiliacji jakie ten autor miał
      affiliations: { $addToSet: "$authors_extended.affiliation" },
      
      // Opcjonalnie: policz w ilu artykułach wystąpił
      article_count: { $sum: 1 }
    }
  },

  // Krok 5: Zapisz wynik do NOWEJ kolekcji
  {
    $out: "authors_authenticated"
  }
])