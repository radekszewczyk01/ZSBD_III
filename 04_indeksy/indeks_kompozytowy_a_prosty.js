// indeksy proste
db.articles.createIndex({ Country: 1 });
db.articles.createIndex({ ArticleType: 1 });
//indeksy kompozytowe
db.articles.find({
    Country: "China", 
    ArticleType: "Journal Article"
}).explain("executionStats")
//zapytanie
db.articles.find({
    Country: "China", 
    ArticleType: "Journal Article"
}).explain("executionStats")