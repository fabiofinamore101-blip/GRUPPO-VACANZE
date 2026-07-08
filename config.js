/**
 * ITINERA - CONFIGURAZIONE
 * 
 * Se lasci firebaseConfig con valori vuoti o come definiti sotto,
 * l'applicazione funzionerà in "Modalità Locale (Offline)" utilizzando
 * il database IndexedDB del browser. I dati rimarranno comunque salvati
 * sul tuo computer!
 * 
 * Per passare alla "Modalità Cloud (Firebase)" con salvataggio reale online
 * e login Gmail (Google Auth), crea un progetto su https://console.firebase.google.com/
 * e inserisci le tue chiavi qui sotto.
 */

window.firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Controlla se le chiavi Firebase sono state compilate
window.isFirebaseConfigured = function() {
  return window.firebaseConfig && 
         window.firebaseConfig.apiKey && 
         window.firebaseConfig.apiKey !== "";
};
