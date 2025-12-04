function smartInsert(collectionName, data) {
    const config = COLLECTION_CONFIG[collectionName];

    // 1. Walidacja czy znamy taką kolekcję
    if (!config) {
        print(`❌ Błąd: Nieznana konfiguracja dla kolekcji '${collectionName}'.`);
        return false;
    }

    // 2. Walidacja wymaganych pól
    const missingFields = config.requiredFields.filter(field => !data.hasOwnProperty(field));
    if (missingFields.length > 0) {
        print(`❌ Błąd: Brak wymaganych pól dla ${collectionName}: ${missingFields.join(", ")}`);
        return false;
    }

    // 3. Obsługa Autoinkrementacji (jeśli dotyczy)
    if (config.autoIncrementField) {
        const nextId = getNextSequence(config.sequenceName);
        data[config.autoIncrementField] = nextId;
        print(`ℹ️ Wygenerowano ID: ${nextId} dla pola ${config.autoIncrementField}`);
    }

    // 4. Pola audytowe (kiedy i kto dodał)
    data.created_at = new Date();
    data.updated_at = new Date();
    data.is_active = true; // Soft delete flag (logika biznesowa!)

    // 5. Wstawienie do bazy
    try {
        const result = db.getCollection(collectionName).insertOne(data);
        print(`✅ Sukces! Dodano dokument do '${collectionName}' z _id: ${result.insertedId}`);
        return result;
    } catch (e) {
        print(`❌ Błąd bazy danych: ${e.message}`);
        return false;
    }
}