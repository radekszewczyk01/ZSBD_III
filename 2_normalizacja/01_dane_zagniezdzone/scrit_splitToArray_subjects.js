db.articles.find({ "Subject": { $type: "string" } }).forEach(function(doc) {
  let subjectsArray = doc.Subject.split(';').filter(s => s.length > 0);
  db.articles.updateOne(
    { _id: doc._id },
    { $set: { "Subject": subjectsArray } }
  );
});