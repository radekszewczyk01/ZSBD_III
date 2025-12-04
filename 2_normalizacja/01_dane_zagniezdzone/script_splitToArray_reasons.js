db.articles.find({ "Reason": { $type: "string" } }).forEach(function(doc) {
  // 1. Rozbij tekst po średniku; filter() usuwa puste elementy
  let reasonsArray = doc.Reason.split(';').filter(r => r.length > 0);

  // 2. Zaktualizuj dokument, zamieniając pole "Reason" na nową tablicę
  db.articles.updateOne(
    { _id: doc._id },
    { $set: { "Reason": reasonsArray } }
  );
});