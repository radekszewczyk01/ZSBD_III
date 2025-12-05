db.createView(
   "view_top_publishers",  // 1. Nazwa Twojego nowego widoku
   "articles",             // 2. Kolekcja źródłowa
   [
     // Krok A: Grupujemy artykuły po ID wydawcy i liczymy je
     { 
       $group: { 
         _id: "$publisher_id", 
         article_count: { $sum: 1 } 
       } 
     },

     // Krok B: Sortujemy OD RAZU (optymalizacja), żeby mieć największych na górze
     { 
       $sort: { article_count: -1 } 
     },

     // Krok C: Dołączamy nazwę wydawcy (JOIN)
     {
       $lookup: {
         from: "publishers",
         localField: "_id",
         foreignField: "_id",
         as: "publisher_info"
       }
     },

     // Krok D: Wyciągamy obiekt z tablicy (bo lookup zwraca tablicę)
     { 
       $unwind: "$publisher_info" 
     },

     // Krok E: Ładne formatowanie wyniku (ukrywamy ID, zostawiamy nazwę i liczbę)
     {
       $project: {
         _id: 0,
         publisher_name: "$publisher_info.name",
         total_retractions: "$article_count"
       }
     }
   ]
)