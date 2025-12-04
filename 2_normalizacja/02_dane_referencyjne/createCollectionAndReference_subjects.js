// 1. Pobierz wszystkie unikalne tematy
print("⏳ Pobieranie unikalnych tematów...");
const uniqueSubjects = db.articles.distinct("Subject");

// 2. Wstaw tematy do nowej kolekcji 'subjects' i zbuduj mapę mapującą nazwę na ID
print("⏳ Tworzenie kolekcji 'subjects'...");
const subjectMap = {}; // Słownik: "Nazwa Tematu" => ObjectId

// Czyścimy kolekcję subjects jeśli istnieje (opcjonalnie, dla bezpieczeństwa testów)
// db.subjects.drop(); 

uniqueSubjects.forEach(subjectName => {
    if (subjectName) { // Ignorujemy puste stringi
        const result = db.subjects.insertOne({ name: subjectName });
        subjectMap[subjectName] = result.insertedId;
    }
});

print(`✅ Utworzono ${Object.keys(subjectMap).length} tematów w nowej kolekcji.`);

// 3. Aktualizacja artykułów (używamy BulkWrite dla wydajności)
print("⏳ Rozpoczynam aktualizację artykułów (to może chwilę potrwać)...");

let bulk = db.articles.initializeUnorderedBulkOp();
let counter = 0;

// Iterujemy tylko po artykułach, które mają pole Subject
db.articles.find({ Subject: { $exists: true, $not: { $size: 0 } } }).forEach(doc => {
    
    // Zamieniamy tablicę stringów na tablicę ObjectId używając naszej mapy
    const newSubjectIds = doc.Subject.map(name => subjectMap[name]).filter(id => id !== undefined);

    // Dodajemy operację do kolejki
    bulk.find({ _id: doc._id }).updateOne({
        $set: { subject_ids: newSubjectIds }, // Nowe pole z referencjami
        $unset: { Subject: "" }              // Usuwamy stare pole
    });

    counter++;
    
    // Wykonujemy zapis co 1000 dokumentów, żeby nie zapchać pamięci
    if (counter % 1000 === 0) {
        bulk.execute();
        bulk = db.articles.initializeUnorderedBulkOp();
        print(`   Przetworzono ${counter} artykułów...`);
    }
});

// Wykonaj pozostałe operacje
if (counter % 1000 !== 0) {
    bulk.execute();
}

print("✅ Zakończono! Pole 'Subject' zostało zamienione na 'subject_ids'.");