// 1. Reset: Ustaw wszystkim domyślną wagę 1 (Drobne/Nieokreślone)
db.reasons.updateMany({}, { $set: { severity: 1 } });

// 2. Definicja pełnej listy wag
var scores = {
    // === KATEGORIA 10: OSZUSTWA I PATOLOGIE (CRITICAL) ===
    10: [
        "Falsification/Fabrication of Data",
        "Falsification/Fabrication of Image",
        "Falsification/Fabrication of Results",
        "Fake Peer Review",
        "Paper Mill",
        "Misconduct - Official Investigation(s) and/or Finding(s)",
        "Misconduct by Author",
        "Misconduct by Third Party",
        "Misconduct by Company/Institution",
        "Sabotage of Materials/Methods",
        "Hoax Paper",
        "Manipulation of Data",
        "Manipulation of Images",
        "Manipulation of Results",
        "False/Forged Authorship",
        "False/Forged Affiliation",
        "Criminal Proceedings",
        "Civil Proceedings",
        "Euphemisms for Misconduct", // Często ukrywa oszustwo
        "Investigation by ORI"       // Office of Research Integrity (poważne sprawy)
    ],

    // === KATEGORIA 5: POWAŻNE NARUSZENIA I PLAGIATY (HIGH) ===
    5: [
        "Plagiarism of Article",
        "Plagiarism of Text",
        "Plagiarism of Data",
        "Plagiarism of Image",
        "Duplication of Article",
        "Duplication of Data",
        "Duplication of Image",
        "Duplication of Text",
        "Duplication of Content through Error by Journal/Publisher",
        "Duplication of/in Image",
        "Duplication of/in Article",
        "Ethical Violations by Author",
        "Ethical Violations by Company/Institution/Third Party",
        "Breach of Policy by Author",
        "Salami Slicing",
        "Rogue Editor",
        "Informed/Patient Consent - None/Withdrawn", // Bardzo poważne etycznie
        "Lack of Approval from Company/Institution",
        "Lack of Approval from Third Party",
        "Publishing Ban",
        "Legal Reasons and/or Threats",
        "Copyright Claims",
        "Taken from Dissertation/Thesis",
        "Taken via Translation",
        "Taken via Peer Review"
    ],

    // === KATEGORIA 3: ŚLEDZTWA I OBIEKCJE (MEDIUM) ===
    // (To są sytuacje "śmierdzące", ale nie zawsze dowiedzione oszustwo)
    3: [
        "Investigation by Journal/Publisher",
        "Investigation by Company/Institution",
        "Investigation by Third Party",
        "Concerns/Issues about Third Party Involvement",
        "Concerns/Issues About Data",
        "Concerns/Issues About Image",
        "Concerns/Issues About Authorship/Affiliation",
        "Concerns/Issues about Results and/or Conclusions",
        "Concerns/Issues about Referencing/Attributions",
        "Concerns/Issues about Article",
        "Concerns/Issues about Human Subject Welfare",
        "Concerns/Issues about Animal Welfare",
        "Concerns/Issues with Peer Review",
        "Objections by Author(s)",
        "Objections by Company/Institution",
        "Objections by Third Party",
        "Complaints about Author",
        "Complaints about Company/Institution",
        "Complaints about Third Party",
        "Results Not Reproducible",
        "Unreliable Data",
        "Unreliable Results and/or Conclusions",
        "Original Data and/or Images not Provided and/or not Available"
    ],

    // === KATEGORIA 2: OSTRZEGAWCZE / ADMINISTRACYJNE (LOW) ===
    2: [
        "Lack of Approval from Author",
        "Lack of IRB/IACUC Approval and/or Compliance",
        "Conflict of Interest",
        "Author Unresponsive",
        "Bias Issues or Lack of Balance",
        "Cites Retracted Work",
        "Contamination of Cell Lines/Tissues",
        "Contamination of Materials (General)",
        "Date of Article and/or Notice Unknown",
        "Nonpayment of Fees and/or Refusal to Pay",
        "Not Presented at Conference",
        "Notice - Limited or No Information",
        "Notice - Unable to Access via current resources",
        "Notice - Lack of",
        "Transfer of Copyright and/or Ownership",
        "Withdrawn as Out of Date",
        "Removed" // Często prawne, ale niejasne
    ],

    // === KATEGORIA 0: BŁĘDY I ZDARZENIA POZYTYWNE (NEUTRAL) ===
    0: [
        "Error in Text",
        "Error in Data",
        "Error in Image",
        "Error in Methods",
        "Error in Analyses",
        "Error in Materials",
        "Error in Results and/or Conclusions",
        "Error in Cell Lines/Tissues",
        "Error by Journal/Publisher",
        "Error by Third Party",
        "Miscommunication with/by Journal/Publisher",
        "Miscommunication with/by Author",
        "Miscommunication with/by Company/Institution",
        "Miscommunication with/by Third Party",
        "Doing the Right Thing", // Autor sam zgłosił błąd - postawa godna pochwały!
        "Temporary Removal",
        "Withdrawn to Publish in Different Journal",
        "Update of Prior Notice(s)",
        "Upgrade/Update of Prior Notice(s)",
        "Updated to Retraction",
        "Updated to Correction",
        "Updated to Expression of Concern",
        "EOC Lifted",
        "Retract and Replace",
        "Computer-Aided Content or Computer-Generated Content" // To zależy, ale często techniczne
    ]
};

// 3. Wykonanie aktualizacji
print("⏳ Aktualizowanie wag powodów...");

var totalUpdated = 0;

for (var score in scores) {
    var reasonNames = scores[score];
    var res = db.reasons.updateMany(
        { name: { $in: reasonNames } },
        { $set: { severity: NumberInt(score) } }
    );
    totalUpdated += res.modifiedCount;
}

print("✅ Zaktualizowano " + totalUpdated + " rekordów.");

// 4. RAPORT KONTROLNY: Co zostało z wagą 1?
var leftOnes = db.reasons.find({ severity: 1 }).toArray();
if (leftOnes.length > 0) {
    print("\n⚠️ UWAGA! Następujące powody nie były na liście i mają domyślną wagę 1:");
    leftOnes.forEach(r => print(" - " + r.name));
} else {
    print("\n🎉 Sukces! Wszystkie powody zostały skategoryzowane.");
}