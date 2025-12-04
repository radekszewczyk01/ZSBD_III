// 1. Znajdź wszystkie unikalne nazwy instytucji używając agregacji
var uniqueInstitutions = db.articles.aggregate([
  { 
    $match: { "Institution": { $exists: true, $type: "string" } } 
  },
  {
    // Rozbij string "Inst A; Inst B" na tablicę
    $project: {
      parts: { $split: ["$Institution", ";"] }
    }
  },
  { $unwind: "$parts" }, // Rozwiń tablicę
  {
    // Usuń spacje z początku/końca
    $project: {
      clean_name: { $trim: { input: "$parts" } }
    }
  },
  { 
    $match: { "clean_name": { $ne: "" } } // Pomiń puste
  },
  {
    $group: { _id: "$clean_name" } // Zgrupuj, żeby mieć unikalne
  }
]).toArray();

// 2. Stwórz mapę (słownik) w pamięci: "Nazwa Instytucji" -> ObjectId
var institutionMap = {};

print("Znaleziono " + uniqueInstitutions.length + " unikalnych instytucji. Tworzenie kolekcji...");

uniqueInstitutions.forEach(function(doc) {
  // Wstaw do nowej kolekcji
  var result = db.institutions.insertOne({ name: doc._id });
  // Zapisz ID w mapie, żeby użyć go w kroku 2
  institutionMap[doc._id] = result.insertedId;
});

print("Kolekcja 'institutions' gotowa. Mapa zbudowana.");

print("Rozpoczynam aktualizację artykułów... To może chwilę potrwać.");

var counter = 0;

db.articles.find({ "Institution": { $type: "string" } }).forEach(function(articleDoc) {
  // 1. Pobierz tekst i potnij go na kawałki
  var rawNames = articleDoc.Institution.split(';');
  var idsArray = [];

  // 2. Dla każdej nazwy znajdź jej ID w naszej mapie
  rawNames.forEach(function(rawName) {
    var cleanName = rawName.trim();
    if (cleanName.length > 0 && institutionMap[cleanName]) {
      idsArray.push(institutionMap[cleanName]);
    }
  });

  // 3. Zaktualizuj artykuł tylko jeśli znaleźliśmy jakieś instytucje
  if (idsArray.length > 0) {
    db.articles.updateOne(
      { _id: articleDoc._id },
      { 
        $set: { "institution_ids": idsArray }, // Nowe pole z tablicą ID
        $unset: { "Institution": "" }          // Usuwamy stare pole tekstowe
      }
    );
  }
  
  counter++;
  if (counter % 1000 === 0) print("Przetworzono " + counter + " artykułów...");
});

print("Zakończono! Twoje dane są teraz zrelacjonowane.");