# Itinera - Condivisione di Itinerari di Viaggio

Itinera è un'applicazione web moderna e premium ideata per consentire a chiunque di inserire, tracciare e condividere i propri itinerari di viaggio. Ciascun itinerario comprende il percorso visualizzato su una mappa interattiva, il mezzo di trasporto utilizzato, i costi del viaggio, le foto e un diario dettagliato.

L'applicazione è progettata per essere utilizzata in due modalità: **Locale (Offline/Mock)** e **Cloud (Firebase)**.

---

## 🚀 Come Avviare l'Applicazione

Non è richiesta alcuna installazione, né Node.js né database esterni!
1. Scarica i file del progetto sul tuo computer.
2. Fai **doppio clic sul file `index.html`** per aprirlo direttamente nel tuo browser preferito.
3. Fatto! L'applicazione è già al 100% funzionante.

---

## 🛠️ Come Funziona la Doppia Modalità

### 1. Modalità Locale (Default)
Se lasci il file `config.js` così com'è (vuoto), l'app si avvia in modalità offline.
* **Autenticazione**: Cliccando su "Accedi con Google" si aprirà una schermata simulata con alcuni account Google reali di esempio (oppure puoi digitare un nome ed email a tua scelta).
* **Database**: Tutti gli itinerari inseriti (comprese le foto caricate) vengono salvati sul database **IndexedDB** del tuo browser. Questo significa che i viaggi rimarranno memorizzati sul tuo computer anche se riavvii la pagina o spegni il computer!
* **Mappe**: Utilizza **Leaflet.js** e **OpenStreetMap** per consentirti di tracciare le tappe sulla mappa gratuitamente e senza registrare chiavi di fatturazione esterne.

### 2. Modalità Cloud (Firebase con Gmail Login Reale)
Per connettere l'applicazione ad un server cloud e abilitare il vero accesso con account Google (Gmail):

1. **Crea un progetto Firebase**:
   * Vai su [Firebase Console](https://console.firebase.google.com/) ed esegui l'accesso.
   * Clicca su **Aggiungi progetto** e inserisci un nome (es. "Itinera-App").

2. **Abilita l'autenticazione Google**:
   * Nella barra laterale sinistra di Firebase, clicca su **Build** -> **Authentication**.
   * Clicca su **Inizia** (Get Started).
   * Nella scheda **Sign-in method**, seleziona **Google**, abilitalo, inserisci la tua email di supporto del progetto e clicca su **Salva**.

3. **Crea il Database Firestore**:
   * Clicca su **Build** -> **Firestore Database** nella barra sinistra.
   * Clicca su **Crea database**.
   * Seleziona la località del server e scegli **Inizia in modalità di test** (per consentire letture/scritture immediate durante lo sviluppo), quindi clicca su **Crea**.

4. **Abilita lo Storage per le Foto**:
   * Clicca su **Build** -> **Storage** nella barra sinistra.
   * Clicca su **Inizia** -> seleziona la modalità di test -> clicca su **Avanti** e poi **Fine**.

5. **Ottieni le chiavi di configurazione**:
   * Nella dashboard di Firebase, clicca sull'icona dell'ingranaggio in alto a sinistra (Impostazioni progetto) -> **Impostazioni progetto**.
   * In fondo alla pagina, nella sezione *Le mie app*, clicca sull'icona Web (`</>`).
   * Registra l'applicazione inserendo un nickname (es. "Itinera Web").
   * Copia l'oggetto `firebaseConfig` che ti viene mostrato, che assomiglia a questo:
     ```javascript
     const firebaseConfig = {
       apiKey: "AIzaSy...",
       authDomain: "...",
       projectId: "...",
       storageBucket: "...",
       messagingSenderId: "...",
       appId: "..."
     };
     ```

6. **Incolla le chiavi nel progetto**:
   * Apri il file [config.js](file:///c:/Users/maria/Desktop/APP%20PER%20VIAGGI/config.js) nel tuo editor.
   * Sostituisci i valori vuoti all'interno di `window.firebaseConfig` con quelli copiati dalla console di Firebase.
   * Salva il file e ricarica `index.html` nel browser. L'app rileverà le chiavi e passerà automaticamente alla modalità Cloud con vero login Google!

---

## 🗺️ Utilizzo della Mappa
* Per inserire il tuo percorso, vai sulla scheda **Nuovo Viaggio**.
* Nella sezione destra troverai la mappa. Puoi cercare un indirizzo nella barra di ricerca ("Cerca") o semplicemente **cliccare direttamente sulla mappa** per inserire le tappe del tuo viaggio in ordine cronologico.
* I punti inseriti verranno uniti automaticamente da una linea tratteggiata per visualizzare la rotta del viaggio.
* Puoi rimuovere qualsiasi tappa errata cliccando sull'icona "X" rossa nell'elenco delle tappe sotto la mappa.
