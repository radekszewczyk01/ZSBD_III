db.authors_authenticated.find()
  .sort({ article_count: -1 }) // Sortuj malejąco (najwięcej na górze)
  .limit(1)                    // Pokaż tylko jednego rekordzistę