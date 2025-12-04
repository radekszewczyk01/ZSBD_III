// 1. Znajdź unikalne nazwy wydawców
let uniquePublishers = db.articles.distinct("Publisher");

// 2. Wstaw każdego (oprócz pustych) do nowej kolekcji
uniquePublishers.forEach(function(publisherName) {
  if (publisherName && publisherName.length > 0) {
    db.publishers.insertOne({ name: publisherName });
  }
});

db.publishers.find().forEach(function(publisherDoc) {
  db.articles.updateMany(
    // Kryterium wyszukiwania: znajdź artykuły z pasującą nazwą
    { "Publisher": publisherDoc.name },
    
    // Akcja zmiany: ustaw nowe pole publisher_id i usuń stare pole Publisher
    [
      { 
        $set: { "publisher_id": publisherDoc._id }
      },
      {
        $unset: "Publisher"
      }
    ]
  );
});