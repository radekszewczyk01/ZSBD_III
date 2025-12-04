import requests
import pymongo
import time
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

# --- KONFIGURACJA ---
MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "retractionWatchDB"
COL_NAME = "articles"

# 10 wątków to bezpieczny kompromis (szybko, ale bez bana)
NUM_WORKERS = 10 

MY_EMAIL = "student@uczelnia.pl"  
HEADERS = {
    "User-Agent": f"RetractionWatchAnalysis/1.0 (mailto:{MY_EMAIL})"
}

def process_single_doi(doc_data):
    """
    Ta funkcja obsługuje jeden artykuł.
    Zwraca: (status, doi)
    """
    _id = doc_data['_id']
    raw_doi = doc_data.get('OriginalPaperDOI', '')
    
    # Proste czyszczenie DOI przed wysłaniem
    doi = raw_doi.strip().replace("https://doi.org/", "").replace("http://dx.doi.org/", "")
    # Naprawa podwójnych slashy (widocznych w logach)
    doi = doi.replace("//", "/")
    
    if not doi:
        return "SKIP", doi

    url = f"https://api.crossref.org/works/{doi}"
    
    # Osobne połączenie dla wątku (bezpieczniej)
    client = pymongo.MongoClient(MONGO_URI)
    collection = client[DB_NAME][COL_NAME]
    
    status = "ERROR"
    
    try:
        # Timeout 5s - jak wisi, to porzucamy
        response = requests.get(url, headers=HEADERS, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            authors_list = data.get('message', {}).get('author', [])
            
            update_data = {
                "authors_enriched": True,
                "data_source": "crossref_threaded"
            }
            
            if authors_list:
                update_data["authors_extended"] = authors_list
                
            collection.update_one({"_id": _id}, {"$set": update_data})
            status = "UPDATED" if authors_list else "EMPTY_RESP"
            
        elif response.status_code == 404:
            # Nie ma takiego DOI -> oznaczamy, żeby nie szukać ponownie
            collection.update_one(
                {"_id": _id}, 
                {"$set": {"authors_enriched": True, "crossref_error": "404 Not Found"}}
            )
            status = "404"
        
        else:
            status = f"HTTP_{response.status_code}"

    except Exception as e:
        status = "CONN_ERR"
    finally:
        client.close()
        
    return status, doi

def run_parallel_enrichment():
    # Główne połączenie tylko do pobrania listy
    client = pymongo.MongoClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COL_NAME]

    print("⏳ Pobieranie listy artykułów do przetworzenia...")
    
    # Pobieramy ID i DOI dla artykułów, które NIE mają jeszcze 'authors_enriched'
    cursor = collection.find(
        { 
            "OriginalPaperDOI": { "$exists": True, "$ne": "" },
            "authors_enriched": { "$exists": False }
        },
        { "_id": 1, "OriginalPaperDOI": 1 }
    )
    
    docs_to_process = list(cursor)
    total_docs = len(docs_to_process)
    
    if total_docs == 0:
        print("✅ Wszystkie artykuły są już zaktualizowane!")
        return

    print(f"🚀 Uruchamiam {NUM_WORKERS} wątków dla {total_docs} dokumentów.")
    print("To może potrwać ok. 1-2 godziny. Możesz bezpiecznie przerwać (Ctrl+C) i wznowić później.")
    print("-" * 60)

    counter = 0
    stats = {"UPDATED": 0, "404": 0, "ERROR": 0, "EMPTY_RESP": 0}

    # Uruchomienie puli wątków
    with ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
        # Mapowanie: future -> doc
        future_to_doc = {executor.submit(process_single_doi, doc): doc for doc in docs_to_process}
        
        try:
            for future in as_completed(future_to_doc):
                counter += 1
                status, doi = future.result()
                
                # Aktualizacja statystyk
                if status in stats:
                    stats[status] += 1
                elif status.startswith("HTTP"):
                    stats["ERROR"] += 1
                else:
                    stats["ERROR"] += 1
                
                # Pasek postępu co 50 sztuk
                if counter % 50 == 0 or counter == total_docs:
                    progress = (counter / total_docs) * 100
                    sys.stdout.write(
                        f"\rPostęp: {progress:.1f}% ({counter}/{total_docs}) | "
                        f"Sukces: {stats['UPDATED']} | Nieznalezione: {stats['404']} | Błędy: {stats['ERROR']}"
                    )
                    sys.stdout.flush()
                    
        except KeyboardInterrupt:
            print("\n\n🛑 Przerwano przez użytkownika. Postęp został zapisany.")
            return

    print(f"\n\n✅ ZAKOŃCZONO!")
    print(f"Znaleziono dane (ORCID/Afiliacje): {stats['UPDATED']}")
    print(f"Niepoprawne DOI / Brak w bazie: {stats['404']}")

if __name__ == "__main__":
    run_parallel_enrichment()