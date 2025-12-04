db.authors_authenticated.aggregate([
  // 1. Rozwijamy tablicę - każdy element tablicy staje się osobnym dokumentem do policzenia
  { 
    $unwind: "$institution_ids" 
  },

  // 2. Grupujemy po ID instytucji i liczymy wystąpienia
  { 
    $group: { 
      _id: "$institution_ids", 
      total_authors: { $sum: 1 } 
    } 
  },

  // 3. Sortujemy malejąco (najwięcej autorów na górze)
  { 
    $sort: { total_authors: -1 } 
  },

  // 4. Bierzemy tylko TOP 20 wyników (optymalizacja)
  { 
    $limit: 20 
  },

  // 5. Pobieramy nazwę instytucji z kolekcji 'institutions'
  {
    $lookup: {
      from: "institutions",
      localField: "_id",
      foreignField: "_id",
      as: "institution_info"
    }
  },

  // 6. Formatujemy wynik, żeby był czytelny
  {
    $project: {
      _id: 0,
      institution_name: { $arrayElemAt: ["$institution_info.name", 0] }, // Wyciągamy nazwę z tablicy
      total_authors: 1
    }
  }
])