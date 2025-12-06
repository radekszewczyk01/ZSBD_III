// Zmień ID na takie, które ma powiązania w Twojej bazie (np. z poprzedniego skryptu)
var suspectId = "https://orcid.org/0000-0002-8574-1945"; 

db.authors_authenticated.aggregate([
   // 1. Wybieramy "Pacjenta Zero"
   { $match: { _id: suspectId } },

   // 2. REKURENCJA GRAFOWA
   {
      $graphLookup: {
         from: "authors_authenticated",     // Szukamy w tej samej kolekcji
         startWith: "$known_co_authors",    // Zaczynamy od jego bezpośrednich znajomych
         connectFromField: "known_co_authors", // Jak iść dalej? Przez znajomych kolejnej osoby
         connectToField: "_id",             // Szukamy pasującego ID autora
         as: "investigation_network",       // Gdzie zapisać wynik
         maxDepth: 2,                       // Poziom 0 (oni), 1 (znajomi), 2 (znajomi znajomych)
         depthField: "degrees_of_separation" // Dodaj pole, jak daleko ta osoba jest
      }
   },

   // 3. (Opcjonalnie) Formatowanie wyniku
   {
      $project: {
         _id: 1,
         given: 1,
         family: 1,
         network_size: { $size: "$investigation_network" }, // Ilu ludzi znalazło?
         connections: {
            $map: {
               input: "$investigation_network",
               as: "person",
               in: {
                  name: { $concat: ["$$person.given", " ", "$$person.family"] },
                  level: "$$person.degrees_of_separation"
               }
            }
         }
      }
   }
]).pretty()