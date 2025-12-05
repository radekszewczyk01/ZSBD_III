// Upewnij się, że jesteś w Replica Set (rs0)
db.demo_locks.drop() // Czyścimy starocie
db.demo_locks.insertOne({ _id: 1, account: "Konto Główne", balance: 1000 })

// tranzakcaj 1
// 1. Rozpocznij sesję
var session1 = db.getMongo().startSession();
session1.startTransaction();

// 2. Pobierz kolekcję powiązaną z tą sesją
var coll1 = session1.getDatabase("retractionWatchDB").getCollection("demo_locks");

// 3. Wykonaj zmianę (Zabieramy 100 zł)
coll1.updateOne({ _id: 1 }, { $inc: { balance: -100 } });

// 🛑 STOP! NIE ROBIMY JESZCZE COMMIT!
// W tym momencie dokument _id: 1 jest ZABLOKOWANY (Write Lock).
print("Transakcja 1 rozpoczęta. Zasób zablokowany...");


// tranzakcja 2
// 1. Rozpocznij sesję
var session2 = db.getMongo().startSession();
session2.startTransaction();

// 2. Pobierz kolekcję
var coll2 = session2.getDatabase("retractionWatchDB").getCollection("demo_locks");

print("Transakcja 2 próbuje dokonać zapisu...");

// 3. Próba zmiany (Dodajemy 500 zł)
// UWAGA: Po wciśnięciu Enter, terminal ZAWISNIE! Kursor będzie mrugał, nic się nie stanie.
coll2.updateOne({ _id: 1 }, { $inc: { balance: 500 } });


// commit 1
session1.commitTransaction();

