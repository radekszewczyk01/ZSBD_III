db.view_verified_risk_report.find(
    // WARUNEK: Więcej niż 1 artykuł
    { "Total Retractions": { $gt: 1 } }
)
.sort({ "Total Retractions": -1 }) // Sortuj od tych co mają najwięcej wycofań
.limit(1)

// policz
db.view_verified_risk_report.countDocuments({ 
    "Total Retractions": { $gt: 1 } 
})