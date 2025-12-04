function smartUpdate(collectionName, query, updateData) {
    // Zawsze aktualizujemy czas ostatniej zmiany
    updateData.updated_at = new Date();

    try {
        // Używamy $set, żeby nie nadpisać całego dokumentu, tylko wybrane pola
        const result = db.getCollection(collectionName).updateOne(
            query, 
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
             print(`⚠️ Nie znaleziono dokumentu do aktualizacji.`);
        } else {
             print(`✅ Zaktualizowano dokument.`);
        }
        return result;
    } catch (e) {
        print(`❌ Błąd aktualizacji: ${e.message}`);
    }
}