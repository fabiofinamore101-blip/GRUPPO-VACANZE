/**
 * ITINERA - LOGICA DATABASE & AUTENTICAZIONE
 * 
 * Gestisce l'interazione con i dati del viaggio.
 * Riconosce automaticamente se usare Firebase (cloud) o IndexedDB (locale).
 */

window.AppDB = (function() {
  let db = null;
  let currentUser = null;
  let authChangeCallbacks = [];

  // Dati di esempio pre-popolati per IndexedDB al primo avvio
  const sampleItineraries = [
    {
      id: "sample-1",
      title: "Road Trip in Costiera Amalfitana",
      description: "Un viaggio indimenticabile lungo le scogliere campane, tra borghi arroccati e profumo di limoni. Abbiamo percorso la strada statale 163 fermandoci per esplorare a piedi le viuzze e gustare dell'ottimo pesce fresco.",
      mezzo: "Auto",
      costo: 350,
      valuta: "EUR",
      durata: 4,
      data: "2026-06-15",
      photo: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80",
      user: {
        uid: "mock-user-1",
        displayName: "Marco Polo",
        email: "marco.polo@gmail.com",
        photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"
      },
      route: [
        { lat: 40.6824, lng: 14.7681, label: "Salerno (Partenza)" },
        { lat: 40.6331, lng: 14.6027, label: "Amalfi" },
        { lat: 40.6281, lng: 14.4850, label: "Positano" },
        { lat: 40.6762, lng: 14.3758, label: "Sorrento" }
      ],
      createdAt: new Date("2026-06-16T10:00:00Z").getTime()
    },
    {
      id: "sample-2",
      title: "Weekend in Bici nei Castelli Romani",
      description: "Due giorni di pedalate intense tra i laghi vulcanici di Castel Gandolfo e Nemi. Salite impegnative ripagate da viste spettacolari e soste culinarie favolose nelle storiche fraschette.",
      mezzo: "Bicicletta",
      costo: 60,
      valuta: "EUR",
      durata: 2,
      data: "2026-07-02",
      photo: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=800&q=80",
      user: {
        uid: "mock-user-2",
        displayName: "Sofia Rossi",
        email: "sofia.rossi@gmail.com",
        photoURL: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80"
      },
      route: [
        { lat: 41.7454, lng: 12.6508, label: "Castel Gandolfo" },
        { lat: 41.7225, lng: 12.7176, label: "Nemi" },
        { lat: 41.8080, lng: 12.6789, label: "Frascati" }
      ],
      createdAt: new Date("2026-07-03T18:30:00Z").getTime()
    }
  ];

  // Inizializza IndexedDB
  function initIndexedDB(callback) {
    const request = indexedDB.open("ItineraDB", 1);

    request.onupgradeneeded = function(e) {
      const dbInstance = e.target.result;
      if (!dbInstance.objectStoreNames.contains("itineraries")) {
        dbInstance.createObjectStore("itineraries", { keyPath: "id" });
      }
    };

    request.onsuccess = function(e) {
      db = e.target.result;
      
      // Controlla se il database è vuoto, in tal caso inserisci i dati di esempio
      const transaction = db.transaction(["itineraries"], "readwrite");
      const store = transaction.objectStore("itineraries");
      const countRequest = store.count();

      countRequest.onsuccess = function() {
        if (countRequest.result === 0) {
          sampleItineraries.forEach(item => store.add(item));
        }
        
        // Carica la sessione utente locale se presente
        const savedUser = localStorage.getItem("itinera_user");
        if (savedUser) {
          currentUser = JSON.parse(savedUser);
        }
        
        callback(null, { mode: "local" });
        triggerAuthChange();
      };
    };

    request.onerror = function(e) {
      callback(e.target.error, null);
    };
  }

  // Notifica tutti i listener del cambio di stato utente
  function onAuthStateChanged(callback) {
    authChangeCallbacks.push(callback);
    // Esegui subito per passare lo stato attuale
    callback(currentUser);
  }

  function triggerAuthChange() {
    authChangeCallbacks.forEach(callback => callback(currentUser));
  }

  return {
    init: function(callback) {
      if (window.isFirebaseConfigured()) {
        try {
          // Inizializzazione Firebase
          firebase.initializeApp(window.firebaseConfig);
          
          // Ascolta lo stato di autenticazione di Firebase
          firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
              currentUser = {
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"
              };
            } else {
              currentUser = null;
            }
            triggerAuthChange();
          });

          callback(null, { mode: "firebase" });
        } catch (error) {
          console.error("Errore inizializzazione Firebase, avvio in locale...", error);
          initIndexedDB(callback);
        }
      } else {
        // Avvia IndexedDB locale
        initIndexedDB(callback);
      }
    },

    onAuthStateChanged: onAuthStateChanged,

    getCurrentUser: function() {
      return currentUser;
    },

    // Login (Google Auth o simulato)
    login: function(mockEmail, mockName, callback) {
      if (window.isFirebaseConfigured()) {
        const provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithPopup(provider)
          .then((result) => {
            if (callback) callback(null, result.user);
          })
          .catch((error) => {
            if (callback) callback(error, null);
          });
      } else {
        // Modalità Mock
        const name = mockName || "Utente Ospite";
        const email = mockEmail || "ospite@gmail.com";
        const firstLetter = name.charAt(0).toUpperCase();
        
        // Genera un avatar colorato basato sull'iniziale
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff&size=150`;

        currentUser = {
          uid: "mock-" + Math.random().toString(36).substr(2, 9),
          displayName: name,
          email: email,
          photoURL: avatarUrl
        };

        localStorage.setItem("itinera_user", JSON.stringify(currentUser));
        triggerAuthChange();
        if (callback) callback(null, currentUser);
      }
    },

    // Logout
    logout: function(callback) {
      if (window.isFirebaseConfigured()) {
        firebase.auth().signOut()
          .then(() => {
            currentUser = null;
            triggerAuthChange();
            if (callback) callback(null);
          })
          .catch((error) => {
            if (callback) callback(error);
          });
      } else {
        currentUser = null;
        localStorage.removeItem("itinera_user");
        triggerAuthChange();
        if (callback) callback(null);
      }
    },

    // Ottieni tutti gli itinerari
    getItineraries: function(callback) {
      if (window.isFirebaseConfigured()) {
        firebase.firestore().collection("itineraries")
          .orderBy("createdAt", "desc")
          .get()
          .then((querySnapshot) => {
            const list = [];
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              data.id = doc.id;
              list.push(data);
            });
            callback(null, list);
          })
          .catch((error) => {
            callback(error, null);
          });
      } else {
        // IndexedDB
        if (!db) {
          callback(new Error("Database non inizializzato"), null);
          return;
        }
        const transaction = db.transaction(["itineraries"], "readonly");
        const store = transaction.objectStore("itineraries");
        const request = store.getAll();

        request.onsuccess = function() {
          // Ordina decrescente per data di creazione
          const list = request.result.sort((a, b) => b.createdAt - a.createdAt);
          callback(null, list);
        };

        request.onerror = function(e) {
          callback(e.target.error, null);
        };
      }
    },

    // Aggiungi un nuovo itinerario
    addItinerary: function(itineraryData, callback) {
      if (!currentUser) {
        callback(new Error("Utente non autenticato"), null);
        return;
      }

      const id = "itinerary-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
      const newItinerary = {
        ...itineraryData,
        id: id,
        user: currentUser,
        createdAt: Date.now()
      };

      if (window.isFirebaseConfigured()) {
        const dbFirestore = firebase.firestore();
        const storageRef = firebase.storage().ref();
        
        // Se c'è una foto in formato Base64/File
        if (itineraryData.photo && itineraryData.photo.startsWith("data:image")) {
          // Carica su Firebase Storage
          const imageRef = storageRef.child(`itineraries/${id}.jpg`);
          // Rimuovi l'intestazione Base64 per ottenere i dati raw
          const base64Data = itineraryData.photo.split(',')[1];
          
          imageRef.putString(base64Data, 'base64', { contentType: 'image/jpeg' })
            .then((snapshot) => snapshot.ref.getDownloadURL())
            .then((downloadURL) => {
              newItinerary.photo = downloadURL;
              return dbFirestore.collection("itineraries").doc(id).set(newItinerary);
            })
            .then(() => {
              callback(null, newItinerary);
            })
            .catch((error) => {
              callback(error, null);
            });
        } else {
          // Nessuna foto da caricare (o è già un URL)
          dbFirestore.collection("itineraries").doc(id).set(newItinerary)
            .then(() => {
              callback(null, newItinerary);
            })
            .catch((error) => {
              callback(error, null);
            });
        }
      } else {
        // IndexedDB
        if (!db) {
          callback(new Error("Database non inizializzato"), null);
          return;
        }

        const transaction = db.transaction(["itineraries"], "readwrite");
        const store = transaction.objectStore("itineraries");
        const request = store.add(newItinerary);

        request.onsuccess = function() {
          callback(null, newItinerary);
        };

        request.onerror = function(e) {
          callback(e.target.error, null);
        };
      }
    },

    // Elimina un itinerario
    deleteItinerary: function(id, callback) {
      if (!currentUser) {
        callback(new Error("Utente non autenticato"));
        return;
      }

      if (window.isFirebaseConfigured()) {
        const docRef = firebase.firestore().collection("itineraries").doc(id);
        
        docRef.get().then((doc) => {
          if (!doc.exists) {
            callback(new Error("Itinerario non trovato"));
            return;
          }
          const data = doc.data();
          if (data.user.uid !== currentUser.uid) {
            callback(new Error("Non hai l'autorizzazione per eliminare questo itinerario"));
            return;
          }
          
          // Elimina l'itinerario
          docRef.delete()
            .then(() => {
              // Prova a eliminare l'immagine da Storage se non era un sample di Unsplash
              if (data.photo && data.photo.includes("firebasestorage.googleapis.com")) {
                const storageRef = firebase.storage().refFromURL(data.photo);
                storageRef.delete().catch(err => console.log("Immagine non trovata nello storage:", err));
              }
              callback(null);
            })
            .catch(error => callback(error));
        }).catch(error => callback(error));
      } else {
        // IndexedDB
        if (!db) {
          callback(new Error("Database non inizializzato"));
          return;
        }

        const transaction = db.transaction(["itineraries"], "readwrite");
        const store = transaction.objectStore("itineraries");
        
        // Recupera prima l'itinerario per controllare l'utente
        const getRequest = store.get(id);
        
        getRequest.onsuccess = function() {
          const item = getRequest.result;
          if (!item) {
            callback(new Error("Itinerario non trovato"));
            return;
          }
          if (item.user.uid !== currentUser.uid) {
            callback(new Error("Non hai l'autorizzazione per eliminare questo itinerario"));
            return;
          }

          const deleteRequest = store.delete(id);
          deleteRequest.onsuccess = function() {
            callback(null);
          };
          deleteRequest.onerror = function(e) {
            callback(e.target.error);
          };
        };

        getRequest.onerror = function(e) {
          callback(e.target.error);
        };
      }
    }
  };
})();
