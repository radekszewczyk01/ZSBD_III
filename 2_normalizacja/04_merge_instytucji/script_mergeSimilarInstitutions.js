// =============================================================
// KONFIGURACJA I FUNKCJE POMOCNICZE
// =============================================================

// Zbiór ID instytucji, które już usunęliśmy w trakcie działania skryptu
// (żeby nie próbować scalać czegoś, co już nie istnieje)
var deletedInstitutionIds = new Set();

/**
 * Funkcja sprawdzająca, czy shortStr jest "zawarty" w longStr
 * (ignoruje kolejność słów, interpunkcję i wielkość liter)
 */
function isSubsetMatch(shortStr, longStr) {
    if (!shortStr || !longStr) return false;

    // Rozbijamy na tokeny (słowa > 1 znak)
    const tokensShort = shortStr.toLowerCase().split(/[\W_]+/).filter(w => w.length > 1);
    const tokensLong = longStr.toLowerCase().split(/[\W_]+/).filter(w => w.length > 1);

    if (tokensShort.length === 0) return false;

    // Tworzymy zbiór słów z długiej nazwy dla szybkiego szukania
    const setLong = new Set(tokensLong);

    let matchCount = 0;
    for (let token of tokensShort) {
        if (setLong.has(token)) {
            matchCount++;
        }
    }

    // Obliczamy pokrycie
    const coverage = matchCount / tokensShort.length;

    // PRÓG: Jeśli 85% słów z krótszej nazwy znajduje się w dłuższej -> to duplikat
    // Pozwala to na drobne różnice (np. brak "The" lub literówkę w jednym słowie)
    return coverage >= 0.85;
}

/**
 * Główna funkcja scalająca dwie instytucje w CAŁEJ BAZIE
 * @param {ObjectId} badId - ID instytucji do usunięcia (krótsza/mniej dokładna)
 * @param {ObjectId} goodId - ID instytucji do zachowania (dłuższa/dokładna)
 * @param {String} badName - Nazwa dla logów
 * @param {String} goodName - Nazwa dla logów
 */
function mergeInstitutionsGlobal(badId, goodId, badName, goodName) {
    if (badId.toString() === goodId.toString()) return;

    print(`🛠 SCALANIE:\n   KEEP: ${goodName}\n   DEL : ${badName}`);

    // 1. Zaktualizuj WSZYSTKICH autorów (nie tylko obecnego), którzy mają 'badId'
    // Krok A: Dodaj 'goodId' tam, gdzie go nie ma (używając $addToSet unikamy duplikatów)
    db.authors_authenticated.updateMany(
        { institution_ids: badId },
        { $addToSet: { institution_ids: goodId } }
    );

    // Krok B: Usuń 'badId'
    db.authors_authenticated.updateMany(
        { institution_ids: badId },
        { $pull: { institution_ids: badId } }
    );

    // 2. Usuń starą instytucję z kolekcji institutions
    db.institutions.deleteOne({ _id: badId });

    // 3. Zapamiętaj, że usunięto
    deletedInstitutionIds.add(badId.toString());
}

// =============================================================
// GŁÓWNA PĘTLA PROGRAMU
// =============================================================

print("🚀 Rozpoczynam inteligentne scalanie instytucji...");
print("To może potrwać chwilę. Proszę czekać...");

let processedAuthors = 0;
let mergesCount = 0;

// Pobieramy autorów, którzy mają więcej niż 1 instytucję (potencjalne duplikaty)
// Używamy batchSize, żeby nie zapchać pamięci przy dużej bazie
var cursor = db.authors_authenticated.find({ "institution_ids.1": { $exists: true } }).noCursorTimeout();

while (cursor.hasNext()) {
    var author = cursor.next();
    processedAuthors++;

    if (processedAuthors % 100 === 0) {
        print(`⏳ Przeanalizowano autorów: ${processedAuthors} | Wykonano scaleń: ${mergesCount}`);
    }

    // Filtrujemy ID-ki, które mogły zostać usunięte w poprzednich krokach pętli
    let currentIds = author.institution_ids.filter(id => !deletedInstitutionIds.has(id.toString()));

    // Jeśli po filtracji zostało mniej niż 2, nie ma co porównywać
    if (currentIds.length < 2) continue;

    // Pobieramy pełne obiekty instytucji
    let institutions = db.institutions.find({ _id: { $in: currentIds } }).toArray();

    // Sortujemy malejąco po długości nazwy
    // (Zakładamy, że dłuższa nazwa = więcej szczegółów = ta, którą chcemy zachować)
    institutions.sort((a, b) => b.name.length - a.name.length);

    // Lista instytucji, które zostawiamy w tym obiegu (żeby nie porównywać usuniętych)
    let keptInThisAuthor = [];

    // Algorytm: Bierzemy najdłuższą i sprawdzamy, czy pozostałe krótsze są jej podzbiorem
    for (let i = 0; i < institutions.length; i++) {
        let master = institutions[i];

        // Sprawdź czy master nie został już usunięty globalnie w międzyczasie
        if (deletedInstitutionIds.has(master._id.toString())) continue;

        let isMasterRedundant = false;

        // Sprawdź czy ten "master" nie jest podzbiorem jakiegoś wcześniejszego (jeszcze dłuższego) mastera z tej samej listy
        // (Rzadki przypadek, ale możliwy)
        for (let kept of keptInThisAuthor) {
            if (isSubsetMatch(master.name, kept.name)) {
                mergeInstitutionsGlobal(master._id, kept._id, master.name, kept.name);
                mergesCount++;
                isMasterRedundant = true;
                break;
            }
        }

        if (isMasterRedundant) continue;

        // Jeśli master jest unikalny (na razie), porównaj go z resztą listy w dół
        for (let j = i + 1; j < institutions.length; j++) {
            let candidate = institutions[j];

            // Jeśli już usunięty, pomiń
            if (deletedInstitutionIds.has(candidate._id.toString())) continue;

            // SPRAWDZENIE: Czy kandydat (krótszy) zawiera się w masterze (dłuższym)?
            if (isSubsetMatch(candidate.name, master.name)) {
                // TAK -> Scalamy kandydata do mastera
                mergeInstitutionsGlobal(candidate._id, master._id, candidate.name, master.name);
                mergesCount++;
            }
        }

        // Dodajemy mastera do listy zachowanych, żeby kolejne iteracje mogły się do niego odnosić
        keptInThisAuthor.push(master);
    }
}

print("===========================================");
print("✅ ZAKOŃCZONO!");
print(`Przeanalizowano autorów: ${processedAuthors}`);
print(`Łącznie scalono (usunięto duplikatów): ${mergesCount}`);
print("===========================================");