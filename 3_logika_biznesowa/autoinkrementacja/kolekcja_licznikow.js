// Kolekcja przechowująca aktualny stan liczników dla różnych encji
db.createCollection("counters");

// Funkcja atomowo zwiększająca licznik (gwarancja unikalności)
function getNextSequence(sequenceName) {
   var sequenceDocument = db.counters.findOneAndUpdate(
      { _id: sequenceName },      // Szukamy licznika o danej nazwie
      { $inc: { sequence_value: 1 } }, // Zwiększamy o 1
      { returnNewDocument: true, upsert: true } // Zwracamy nową wartość, tworzymy jeśli nie istnieje
   );
   return sequenceDocument.sequence_value;
}

const COLLECTION_CONFIG = {
    "articles": {
        requiredFields: ["Title", "publisher_id"], // Pola obowiązkowe
        autoIncrementField: "Record ID",           // Czytelen ID biznesowe
        sequenceName: "article_id_seq"             // Nazwa licznika
    },
    "authors_authenticated": {
        requiredFields: ["given", "family"],
        autoIncrementField: null, // Tutaj używamy np. ORCID jako _id, więc brak autoinkrementacji
        sequenceName: null
    },
    "publishers": {
        requiredFields: ["name"],
        autoIncrementField: "publisher_id_num",
        sequenceName: "publisher_id_seq"
    }
};