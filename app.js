/**
 * ITINERA - LOGICA APPLICAZIONE (MULTI-DAY & GOOGLE MAPS)
 * 
 * Controlla l'interfaccia utente, le visualizzazioni, le mappe Leaflet,
 * l'interazione con il database e la gestione dello stato a più giorni.
 */

(function() {
  // === STATO DELL'APPLICAZIONE ===
  let currentActiveView = "feed";
  let activeTransportFilter = "all";
  let searchTimeout = null;
  let allItineraries = [];
  
  // Stato del Form di Creazione (Multi-Giorno)
  let formDataDays = [
    { dayNumber: 1, route: [], gpsTrackPoints: [], activities: [], restaurants: [] }
  ];
  let currentFormDayIndex = 0;
  
  // Stato del Modale Dettagli (Multi-Giorno)
  let activeModalTrip = null;
  let activeModalDayIndex = 0;

  // Stato della registrazione in viaggio (Tracker)
  let trackingTrip = null;
  let trackerWatchId = null;
  let trackerTimerId = null;
  let trackerStartTime = 0;
  let trackerElapsedTime = 0; // in millisecondi
  let trackerMap = null;
  let trackerMapMarkers = [];
  let trackerMapPolyline = null;
  let trackerMapGpsPolyline = null;
  let trackerLastCoords = null;

  // Riferimenti Mappe Leaflet
  let createMap = null;
  let createMapMarkers = [];
  let createMapPolyline = null;
  
  let modalMap = null;
  let modalMapMarkers = [];
  let modalMapPolyline = null;
  let modalMapGpsPolyline = null;
  
  // Foto in caricamento (Base64)
  let uploadedPhotoBase64 = null;

  // Valutazione ristorante selezionata nel form
  let selectedRestRating = 0;

  // === RIFERIMENTI ELEMENTI DOM ===
  const views = {
    login: document.getElementById("login-view"),
    feed: document.getElementById("feed-view"),
    create: document.getElementById("create-view"),
    tracker: document.getElementById("tracker-view"),
    profile: document.getElementById("profile-view")
  };

  const navButtons = {
    feed: document.getElementById("nav-feed"),
    create: document.getElementById("nav-create"),
    profile: document.getElementById("nav-profile")
  };

  const userProfileMenu = document.getElementById("user-profile-menu");
  const offlineWarningBanner = document.getElementById("offline-warning-banner");
  const bannerConfigGuideBtn = document.getElementById("banner-config-guide-btn");
  const firebaseGuideModal = document.getElementById("firebase-guide-modal");
  const btnCloseFirebaseGuide = document.getElementById("btn-close-firebase-guide");
  
  // Elementi Login
  const googleBtn = document.getElementById("google-login-btn");
  const mockEmailInput = document.getElementById("mock-email");
  const mockNameInput = document.getElementById("mock-name");
  const mockSubmitBtn = document.getElementById("mock-submit-btn");
  const googlePicker = document.getElementById("google-picker");
  const googlePickerItems = document.querySelectorAll(".google-account-item");
  
  // Elementi Form Creazione (General)
  const createForm = document.getElementById("itinerary-form");
  const cancelCreateBtn = document.getElementById("cancel-create-btn");
  const transportOptions = document.querySelectorAll(".transport-option");
  const selectedTransportInput = document.getElementById("selected-transport");
  const fileInput = document.getElementById("photo-file");
  const filePreviewContainer = document.getElementById("preview-container");
  const filePreviewImg = document.getElementById("preview-img");
  const removePhotoBtn = document.getElementById("remove-photo-btn");
  
  // Elementi Multi-Giorno (Form)
  const formDayTabs = document.getElementById("form-day-tabs");
  const btnAddDayForm = document.getElementById("btn-add-day-form");
  const btnRemoveDayForm = document.getElementById("btn-remove-day-form");
  const currentFormDayTitle = document.getElementById("current-form-day-title");
  
  // Elementi Attività (Form)
  const actTimeInput = document.getElementById("act-time");
  const actTitleInput = document.getElementById("act-title");
  const actDescInput = document.getElementById("act-desc");
  const actCostInput = document.getElementById("act-cost");
  const actCurrencyInput = document.getElementById("act-currency");
  const btnAddActivity = document.getElementById("btn-add-activity");
  const formActivitiesList = document.getElementById("form-activities-list");

  // Elementi Ristoranti (Form)
  const restNameInput = document.getElementById("rest-name");
  const restReviewInput = document.getElementById("rest-review");
  const restCostInput = document.getElementById("rest-cost");
  const restRatingInput = document.getElementById("rest-rating");
  const formStarRating = document.getElementById("form-star-rating");
  const btnAddRestaurant = document.getElementById("btn-add-restaurant");
  const formRestaurantsList = document.getElementById("form-restaurants-list");

  // Elementi Mappa (Form)
  const mapSearchInput = document.getElementById("map-search-input");
  const mapSearchBtn = document.getElementById("map-search-btn");
  const mapSectionTitleDay = document.getElementById("map-section-title-day");
  const routePlaceholder = document.getElementById("route-placeholder");
  const routeItemsList = document.getElementById("route-items-list");

  // Elementi Tracker (In Viaggio)
  const trackerTripTitle = document.getElementById("tracker-trip-title");
  const trackerDaySelect = document.getElementById("tracker-day-select");
  const stopwatchTime = document.getElementById("stopwatch-time");
  const trackerGpsStatus = document.getElementById("tracker-gps-status");
  const btnTrackerStart = document.getElementById("btn-tracker-start");
  const btnTrackerStop = document.getElementById("btn-tracker-stop");
  const btnTrackerBack = document.getElementById("btn-tracker-back");
  const btnTrackerCompleteTrip = document.getElementById("btn-tracker-complete-trip");
  const trackerRoutePlaceholder = document.getElementById("tracker-route-placeholder");
  const trackerRouteItemsList = document.getElementById("tracker-route-items-list");
  
  // Elementi Feed e Filtri
  const itineraryGrid = document.getElementById("itinerary-grid");
  const searchInput = document.getElementById("search-input");
  const filterButtons = document.querySelectorAll(".filter-btn");
  
  // Elementi Profilo
  const profileAvatar = document.getElementById("profile-avatar");
  const profileName = document.getElementById("profile-name");
  const profileEmail = document.getElementById("profile-email");
  const statTrips = document.getElementById("stat-trips");
  const statCost = document.getElementById("stat-cost");
  const statDays = document.getElementById("stat-days");
  const myTripsGrid = document.getElementById("my-trips-grid");

  // Elementi Modale Dettagli
  const detailsModal = document.getElementById("details-modal");
  const closeModalBtn = document.getElementById("modal-close-btn");
  const modalShareBtn = document.getElementById("modal-share-btn");
  const modalDayTabs = document.getElementById("modal-day-tabs");
  const modalActivitiesList = document.getElementById("modal-activities-list");
  const modalRestaurantsList = document.getElementById("modal-restaurants-list");
  const modalDayRouteList = document.getElementById("modal-day-route-list");
  
  // Toast
  const toastEl = document.getElementById("toast-notification");
  const toastText = document.getElementById("toast-text");

  // === INIZIALIZZAZIONE ===
  document.addEventListener("DOMContentLoaded", function() {
    // Configura Banner Offline
    if (!window.isFirebaseConfigured()) {
      document.body.classList.add("offline-active");
      if (offlineWarningBanner) offlineWarningBanner.style.display = "flex";
    }

    // Inizializza il database
    window.AppDB.init(function(err, res) {
      if (err) {
        showToast("Errore di connessione al database", "error");
        return;
      }
      
      console.log("Database inizializzato. Modalità: " + res.mode);

      // Gestione stato autenticazione
      window.AppDB.onAuthStateChanged(function(user) {
        // Controllo se stiamo visualizzando un viaggio condiviso tramite query string (?trip=...)
        const urlParams = new URLSearchParams(window.location.search);
        const sharedTripId = urlParams.get('trip');

        if (user || sharedTripId) {
          // Nascondi Login
          views.login.classList.remove("active");
          
          if (user) {
            userProfileMenu.style.display = "flex";
            document.getElementById("user-nav-avatar").src = user.photoURL;
          } else {
            userProfileMenu.style.display = "none"; // Ospite che visualizza solo un link esterno
          }
          
          // Carica i dati del feed
          window.AppDB.getItineraries(function(err, list) {
            if (!err) {
              allItineraries = list;
              renderItineraries();
              if (user) renderProfilePage();

              // Se c'è un viaggio condiviso, aprilo automaticamente nel modale
              if (sharedTripId) {
                const trip = allItineraries.find(t => t.id === sharedTripId);
                if (trip) {
                  setTimeout(() => {
                    openDetailsModal(trip);
                    // Rimuovi il parametro dalla barra per pulire l'URL (opzionale)
                    window.history.replaceState({}, document.title, window.location.pathname);
                  }, 500);
                } else {
                  showToast("Il viaggio condiviso non è stato trovato", "error");
                }
              }
            }
          });

          switchView(currentActiveView);
        } else {
          // Mostra Login
          views.login.classList.add("active");
          userProfileMenu.style.display = "none";
          hideAllViews();
        }
      });
    });

    setupEventListeners();
  });

  // === EVENT LISTENERS ===
  function setupEventListeners() {
    // Navigazione
    navButtons.feed.addEventListener("click", () => switchView("feed"));
    navButtons.create.addEventListener("click", () => switchView("create"));
    navButtons.profile.addEventListener("click", () => switchView("profile"));

    // Guida Firebase
    if (bannerConfigGuideBtn) {
      bannerConfigGuideBtn.addEventListener("click", (e) => {
        e.preventDefault();
        firebaseGuideModal.classList.add("active");
      });
    }
    if (btnCloseFirebaseGuide) {
      btnCloseFirebaseGuide.addEventListener("click", () => {
        firebaseGuideModal.classList.remove("active");
      });
    }
    if (firebaseGuideModal) {
      firebaseGuideModal.addEventListener("click", (e) => {
        if (e.target === firebaseGuideModal) firebaseGuideModal.classList.remove("active");
      });
    }

    // Logout
    document.getElementById("btn-logout").addEventListener("click", function() {
      window.AppDB.logout(function(err) {
        if (err) showToast("Errore durante il logout", "error");
        else {
          showToast("Logout effettuato", "success");
          currentActiveView = "feed";
        }
      });
    });

    // Login Google simulato / reale
    googleBtn.addEventListener("click", function() {
      if (window.isFirebaseConfigured()) {
        window.AppDB.login(null, null, function(err, user) {
          if (err) showToast("Autenticazione fallita: " + err.message, "error");
          else showToast("Benvenuto, " + user.displayName, "success");
        });
      } else {
        googlePicker.classList.add("active");
      }
    });

    googlePicker.addEventListener("click", function(e) {
      if (e.target === googlePicker) googlePicker.classList.remove("active");
    });

    googlePickerItems.forEach(item => {
      item.addEventListener("click", function() {
        const email = this.getAttribute("data-email");
        const name = this.getAttribute("data-name");
        googlePicker.classList.remove("active");
        window.AppDB.login(email, name, function(err, user) {
          if (err) showToast("Errore di accesso", "error");
          else showToast("Benvenuto, " + user.displayName, "success");
        });
      });
    });

    mockSubmitBtn.addEventListener("click", function() {
      const email = mockEmailInput.value.trim() || "viaggiatore@gmail.com";
      const name = mockNameInput.value.trim() || "Viaggiatore Libero";
      window.AppDB.login(email, name, function(err, user) {
        if (err) showToast("Errore di accesso", "error");
        else showToast("Benvenuto, " + user.displayName, "success");
      });
    });

    // Filtri di ricerca
    searchInput.addEventListener("input", function() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(renderItineraries, 300);
    });

    filterButtons.forEach(btn => {
      btn.addEventListener("click", function() {
        filterButtons.forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        activeTransportFilter = this.getAttribute("data-filter");
        renderItineraries();
      });
    });

    // Form - Selezione mezzo
    transportOptions.forEach(opt => {
      opt.addEventListener("click", function() {
        transportOptions.forEach(o => o.classList.remove("selected"));
        this.classList.add("selected");
        selectedTransportInput.value = this.getAttribute("data-value");
      });
    });

    // Form - Caricamento foto
    fileInput.addEventListener("change", function(e) {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        showToast("Carica solo immagini", "error");
        return;
      }
      if (file.size > 3 * 1024 * 1024) {
        showToast("L'immagine supera i 3MB. Scegline un'altra.", "error");
        fileInput.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = function(evt) {
        uploadedPhotoBase64 = evt.target.result;
        filePreviewImg.src = uploadedPhotoBase64;
        filePreviewContainer.style.display = "block";
        document.querySelector(".photo-upload-zone p").innerText = "Foto caricata";
      };
      reader.readAsDataURL(file);
    });

    removePhotoBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      uploadedPhotoBase64 = null;
      fileInput.value = "";
      filePreviewContainer.style.display = "none";
      document.querySelector(".photo-upload-zone p").innerText = "Trascina una foto o clicca per caricare";
    });

    // Form - Gestione Giorni
    btnAddDayForm.addEventListener("click", addFormDay);
    btnRemoveDayForm.addEventListener("click", removeLastFormDay);

    // Form - Gestione Attività e Ristoranti
    btnAddActivity.addEventListener("click", addActivityToFormDay);
    btnAddRestaurant.addEventListener("click", addRestaurantToFormDay);
    setupStarRatingListener();

    // Form - Cerca località
    mapSearchBtn.addEventListener("click", searchLocationOnMap);
    mapSearchInput.addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        searchLocationOnMap();
      }
    });

    // Form - Salva e Annulla
    createForm.addEventListener("submit", function(e) {
      e.preventDefault();
      saveItinerary();
    });

    cancelCreateBtn.addEventListener("click", function() {
      resetCreateForm();
      switchView("feed");
    });

    // Controlli Tracker (In Viaggio)
    btnTrackerStart.addEventListener("click", startTrackerRecording);
    btnTrackerStop.addEventListener("click", stopTrackerRecording);
    btnTrackerBack.addEventListener("click", function() {
      if (trackerWatchId || trackerTimerId) {
        if (!confirm("C'è un tracciamento in corso. Uscendo perderai i dati correnti dello spostamento. Continuare?")) {
          return;
        }
      }
      resetTrackerState();
      switchView("profile");
    });
    btnTrackerCompleteTrip.addEventListener("click", completeTripFlow);
    trackerDaySelect.addEventListener("change", changeTrackerDay);

    // Modali
    closeModalBtn.addEventListener("click", () => detailsModal.classList.remove("active"));
    modalShareBtn.addEventListener("click", shareActiveTrip);
  }

  // === GESTIONE VISUALIZZAZIONI ===
  function switchView(viewName) {
    currentActiveView = viewName;
    hideAllViews();
    
    Object.keys(navButtons).forEach(key => {
      if (key === viewName) navButtons[key].classList.add("active");
      else navButtons[key].classList.remove("active");
    });

    views[viewName].classList.add("active");

    if (viewName === "feed") {
      refreshData();
    } else if (viewName === "create") {
      initCreationMap();
      renderFormDays();
    } else if (viewName === "profile") {
      renderProfilePage();
    }
  }

  function hideAllViews() {
    Object.keys(views).forEach(key => {
      if (key !== "login") views[key].classList.remove("active");
    });
  }

  // === TOAST NOTIFICATION ===
  function showToast(text, type = "success") {
    toastText.innerText = text;
    toastEl.className = "";
    toastEl.classList.add("show", type);
    const icon = toastEl.querySelector("i");
    icon.className = type === "success" ? "fas fa-check-circle" : "fas fa-exclamation-circle";
    setTimeout(() => toastEl.classList.remove("show"), 3500);
  }

  // === DATI & FEED RENDERING ===
  function refreshData() {
    window.AppDB.getItineraries(function(err, list) {
      if (!err) {
        allItineraries = list;
        renderItineraries();
      }
    });
  }

  function renderItineraries() {
    itineraryGrid.innerHTML = "";
    const searchText = searchInput.value.toLowerCase().trim();
    
    const filteredList = allItineraries.filter(item => {
      if (activeTransportFilter !== "all" && item.mezzo.toLowerCase() !== activeTransportFilter) return false;
      if (searchText !== "") {
        const inTitle = item.title.toLowerCase().includes(searchText);
        const inDesc = item.description.toLowerCase().includes(searchText);
        const inMezzo = item.mezzo.toLowerCase().includes(searchText);
        return inTitle || inDesc || inMezzo;
      }
      return true;
    });

    if (filteredList.length === 0) {
      itineraryGrid.innerHTML = `
        <div class="route-placeholder" style="grid-column: 1 / -1; padding: 60px 0;">
          <i class="fas fa-route" style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
          <p>Nessun itinerario trovato. Creane uno tu!</p>
        </div>
      `;
      return;
    }

    filteredList.forEach(item => {
      const card = createItineraryCard(item);
      itineraryGrid.appendChild(card);
    });
  }

  function createItineraryCard(item) {
    const card = document.createElement("div");
    card.className = "itinerary-card";
    const photoUrl = item.photo || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80";
    
    let mezzoIcon = "fa-car";
    const mezzo = item.mezzo.toLowerCase();
    if (mezzo === "aereo") mezzoIcon = "fa-plane";
    else if (mezzo === "treno") mezzoIcon = "fa-train";
    else if (mezzo === "autobus") mezzoIcon = "fa-bus";
    else if (mezzo === "bicicletta") mezzoIcon = "fa-bicycle";
    else if (mezzo === "piedi") mezzoIcon = "fa-walking";
    else if (mezzo === "moto") mezzoIcon = "fa-motorcycle";

    const currentUser = window.AppDB.getCurrentUser();
    const isOwner = currentUser && item.user && item.user.uid === currentUser.uid;
    const canDelete = isOwner;
    const canStartTrip = isOwner && item.status !== 'completed';

    // Badge dello stato del viaggio
    const statusVal = item.status || 'planned';
    let statusClass = 'planned';
    let statusLabel = 'Programmato';
    if (statusVal === 'completed') {
      statusClass = 'completed';
      statusLabel = 'Completato';
    } else if (statusVal === 'active') {
      statusClass = 'active';
      statusLabel = 'In Corso';
    }

    card.innerHTML = `
      <div class="card-image-wrapper">
        <img src="${photoUrl}" alt="${item.title}" loading="lazy">
        <div class="card-actions-overlay">
          ${canDelete ? `<button class="card-action-btn delete" title="Elimina Itinerario" data-id="${item.id}"><i class="fas fa-trash"></i></button>` : ''}
        </div>
        <div class="card-badges">
          <span class="badge-mezzo ${mezzo}"><i class="fas ${mezzoIcon}"></i> ${item.mezzo}</span>
          <span class="badge-costo">${item.costo} ${item.valuta || 'EUR'}</span>
        </div>
      </div>
      <div class="card-content">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div class="card-user-info" style="margin-bottom:0;">
            <img src="${item.user.photoURL}" alt="${item.user.displayName}" class="card-user-avatar">
            <span class="card-user-name">${item.user.displayName}</span>
          </div>
          <span class="badge-stato ${statusClass}">${statusLabel}</span>
        </div>
        <h3 class="card-title">${item.title}</h3>
        <p class="card-desc">${item.description}</p>
        <div class="card-footer">
          <div class="card-stats">
            <span class="card-stat" title="Durata"><i class="far fa-calendar-alt"></i> ${item.durata} gg</span>
            <span class="card-stat" title="Tappe totali"><i class="fas fa-map-marker-alt"></i> ${countTotalTappe(item)} tappe</span>
          </div>
          <div style="display: flex; gap: 8px;">
            ${canStartTrip ? `<button class="btn-start-trip" data-id="${item.id}" title="Registra Spostamenti GPS in Tempo Reale"><i class="fas fa-location-arrow"></i> Registra</button>` : ''}
            <button class="card-btn-detail" data-id="${item.id}">Dettagli <i class="fas fa-arrow-right"></i></button>
          </div>
        </div>
      </div>
    `;

    card.querySelector(".card-btn-detail").addEventListener("click", () => openDetailsModal(item));
    
    if (canStartTrip) {
      card.querySelector(".btn-start-trip").addEventListener("click", function(e) {
        e.stopPropagation();
        startTrackingTripFlow(item);
      });
    }

    if (canDelete) {
      card.querySelector(".card-action-btn.delete").addEventListener("click", function(e) {
        e.stopPropagation();
        if (confirm("Vuoi eliminare definitivamente questo viaggio?")) {
          window.AppDB.deleteItinerary(item.id, function(err) {
            if (err) showToast("Impossibile eliminare", "error");
            else {
              showToast("Itinerario rimosso", "success");
              refreshData();
              if (currentActiveView === "profile") renderProfilePage();
            }
          });
        }
      });
    }

    return card;
  }

  function countTotalTappe(trip) {
    if (!trip.days) return 0;
    return trip.days.reduce((total, d) => total + (d.route ? d.route.length : 0), 0);
  }

  // === RENDERING PROFILO ===
  function renderProfilePage() {
    const currentUser = window.AppDB.getCurrentUser();
    if (!currentUser) return;

    profileAvatar.src = currentUser.photoURL;
    profileName.innerText = currentUser.displayName;
    profileEmail.innerText = currentUser.email;

    const myItineraries = allItineraries.filter(item => item.user && item.user.uid === currentUser.uid);

    let totalCost = 0;
    let totalDays = 0;
    myItineraries.forEach(item => {
      totalCost += parseFloat(item.costo) || 0;
      totalDays += parseInt(item.durata) || 0;
    });

    statTrips.innerText = myItineraries.length;
    statCost.innerText = totalCost + " €";
    statDays.innerText = totalDays;

    myTripsGrid.innerHTML = "";
    if (myItineraries.length === 0) {
      myTripsGrid.innerHTML = `
        <div class="route-placeholder" style="grid-column: 1 / -1; padding: 40px 0;">
          <i class="fas fa-suitcase-rolling" style="font-size: 40px; color: var(--text-muted); margin-bottom: 12px;"></i>
          <p>Non hai ancora creato nessun itinerario di viaggio.</p>
        </div>
      `;
      return;
    }

    myItineraries.forEach(item => {
      const card = createItineraryCard(item);
      myTripsGrid.appendChild(card);
    });
  }

  // === GESTIONE MULTI-GIORNO (CREAZIONE FORM) ===
  function renderFormDays() {
    formDayTabs.innerHTML = "";
    formDataDays.forEach((day, index) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = `day-tab ${index === currentFormDayIndex ? 'active' : ''}`;
      tab.innerText = `Giorno ${day.dayNumber}`;
      tab.addEventListener("click", () => switchFormDay(index));
      formDayTabs.appendChild(tab);
    });

    btnRemoveDayForm.style.display = formDataDays.length > 1 ? "block" : "none";
    document.getElementById("itinerary-duration").value = formDataDays.length;

    // Aggiorna titolo pannello attivo
    currentFormDayTitle.innerText = `Giorno ${currentFormDayIndex + 1}: Attività & Ristoranti`;
    mapSectionTitleDay.innerText = `Traccia il Percorso - Giorno ${currentFormDayIndex + 1}`;

    // Renderizza attività, ristoranti e tappe del giorno selezionato
    renderFormActivities();
    renderFormRestaurants();
    renderRouteList();

    // Aggiorna marker sulla mappa
    if (createMap) {
      updateCreationMapLayers();
    }
  }

  function switchFormDay(index) {
    currentFormDayIndex = index;
    renderFormDays();
  }

  function addFormDay() {
    const nextNum = formDataDays.length + 1;
    formDataDays.push({
      dayNumber: nextNum,
      route: [],
      gpsTrackPoints: [],
      activities: [],
      restaurants: []
    });
    currentFormDayIndex = formDataDays.length - 1;
    renderFormDays();
    showToast(`Giorno ${nextNum} aggiunto`, "success");
  }

  function removeLastFormDay() {
    if (formDataDays.length <= 1) return;
    if (confirm(`Rimuovere definitivamente il Giorno ${formDataDays.length} con tutte le sue tappe ed attività?`)) {
      formDataDays.pop();
      currentFormDayIndex = Math.min(currentFormDayIndex, formDataDays.length - 1);
      renderFormDays();
      showToast("Giorno eliminato", "success");
    }
  }

  // === ATTIVITÀ & RISTORANTI NEL FORM ===
  function addActivityToFormDay() {
    const time = actTimeInput.value;
    const title = actTitleInput.value.trim();
    const desc = actDescInput.value.trim();
    const cost = parseFloat(actCostInput.value) || 0;
    const currency = actCurrencyInput.value;

    if (!title) {
      showToast("Inserisci un titolo per l'attività", "error");
      return;
    }

    const activity = { time: time || "00:00", title, description: desc, costo: cost, valuta: currency };
    formDataDays[currentFormDayIndex].activities.push(activity);
    
    // Pulisci campi
    actTimeInput.value = "";
    actTitleInput.value = "";
    actDescInput.value = "";
    actCostInput.value = "";

    renderFormActivities();
    showToast("Attività aggiunta al programma", "success");
  }

  function renderFormActivities() {
    formActivitiesList.innerHTML = "";
    const list = formDataDays[currentFormDayIndex].activities || [];

    if (list.length === 0) {
      formActivitiesList.innerHTML = `<div style="font-size:13px; color:var(--text-muted); font-style:italic;">Nessuna attività pianificata per oggi.</div>`;
      return;
    }

    // Ordina per orario
    list.sort((a,b) => a.time.localeCompare(b.time));

    list.forEach((act, idx) => {
      const el = document.createElement("div");
      el.className = "activity-item";
      el.innerHTML = `
        <div class="activity-node"></div>
        <div class="activity-header">
          <span class="activity-time"><i class="far fa-clock"></i> ${act.time}</span>
          <span class="activity-title">${act.title}</span>
          <button type="button" class="btn-remove-activity" data-idx="${idx}"><i class="fas fa-trash-alt"></i></button>
        </div>
        ${act.description ? `<p class="activity-desc">${act.description}</p>` : ''}
        ${act.costo > 0 ? `<div class="activity-meta"><span class="activity-cost">Costo: ${act.costo} ${act.valuta}</span></div>` : ''}
      `;

      el.querySelector(".btn-remove-activity").addEventListener("click", () => {
        formDataDays[currentFormDayIndex].activities.splice(idx, 1);
        renderFormActivities();
        showToast("Attività rimossa", "success");
      });

      formActivitiesList.appendChild(el);
    });
  }

  function setupStarRatingListener() {
    const stars = formStarRating.querySelectorAll("i");
    stars.forEach(star => {
      star.addEventListener("click", function() {
        const rating = parseInt(this.getAttribute("data-rating"));
        selectedRestRating = rating;
        restRatingInput.value = rating;

        stars.forEach(s => {
          const r = parseInt(s.getAttribute("data-rating"));
          if (r <= rating) {
            s.className = "fas fa-star active";
          } else {
            s.className = "far fa-star";
          }
        });
      });
    });
  }

  function addRestaurantToFormDay() {
    const name = restNameInput.value.trim();
    const rating = parseInt(restRatingInput.value) || 0;
    const review = restReviewInput.value.trim();
    const cost = parseFloat(restCostInput.value) || 0;

    if (!name) {
      showToast("Inserisci il nome del ristorante", "error");
      return;
    }

    const restaurant = { name, rating, review, costo: cost, valuta: "EUR" };
    formDataDays[currentFormDayIndex].restaurants.push(restaurant);

    // Pulisci
    restNameInput.value = "";
    restReviewInput.value = "";
    restCostInput.value = "";
    restRatingInput.value = "0";
    selectedRestRating = 0;
    formStarRating.querySelectorAll("i").forEach(s => s.className = "far fa-star");

    renderFormRestaurants();
    showToast("Ristorante aggiunto", "success");
  }

  function renderFormRestaurants() {
    formRestaurantsList.innerHTML = "";
    const list = formDataDays[currentFormDayIndex].restaurants || [];

    if (list.length === 0) {
      formRestaurantsList.innerHTML = `<div style="font-size:13px; color:var(--text-muted); font-style:italic;">Nessun ristorante aggiunto per oggi.</div>`;
      return;
    }

    list.forEach((rest, idx) => {
      const el = document.createElement("div");
      el.className = "restaurant-card";
      
      let starsHtml = "";
      for (let i = 1; i <= 5; i++) {
        starsHtml += `<i class="${i <= rest.rating ? 'fas' : 'far'} fa-star"></i>`;
      }

      el.innerHTML = `
        <div class="restaurant-header">
          <span class="restaurant-title">${rest.name}</span>
          <button type="button" class="btn-remove-activity" data-idx="${idx}"><i class="fas fa-trash-alt"></i></button>
        </div>
        <div class="stars-display">${starsHtml}</div>
        ${rest.review ? `<p class="restaurant-review">"${rest.review}"</p>` : ''}
        ${rest.costo > 0 ? `<div class="restaurant-meta"><span class="restaurant-cost">Spesa: ${rest.costo} €</span></div>` : ''}
      `;

      el.querySelector(".btn-remove-activity").addEventListener("click", () => {
        formDataDays[currentFormDayIndex].restaurants.splice(idx, 1);
        renderFormRestaurants();
        showToast("Ristorante rimosso", "success");
      });

      formRestaurantsList.appendChild(el);
    });
  }

  // === INTEGRAZIONE DI GOOGLE MAPS LAYERS IN LEAFLET ===
  function createMapBaseLayers() {
    return {
      "CartoDB Scuro (Default)": L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO'
      }),
      "Google Mappa Stradale": L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps'
      }),
      "Google Satellite": L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps Satellite'
      }),
      "Google Rilievo/Montagna": L.tileLayer('https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps Terrain'
      })
    };
  }

  // === MAPPA DI CREAZIONE ===
  function initCreationMap() {
    if (createMap) {
      setTimeout(() => createMap.invalidateSize(), 100);
      return;
    }

    // Inizializza mappa centrata in Italia
    createMap = L.map("create-map-container").setView([41.9028, 12.4964], 6);

    const baseLayers = createMapBaseLayers();
    baseLayers["CartoDB Scuro (Default)"].addTo(createMap);

    // Controllo di selezione layer integrato (Google/OSM)
    L.control.layers(baseLayers).addTo(createMap);

    // Evento Click sulla mappa
    createMap.on("click", function(e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`, {
        headers: { "Accept-Language": "it" }
      })
      .then(res => res.json())
      .then(data => {
        let label = "Tappa su mappa";
        if (data && data.display_name) {
          const addr = data.address;
          label = addr.city || addr.town || addr.village || addr.suburb || addr.road || "Tappa " + (formDataDays[currentFormDayIndex].route.length + 1);
        }
        addRoutePoint(lat, lng, label);
      })
      .catch(() => {
        addRoutePoint(lat, lng, "Tappa " + (formDataDays[currentFormDayIndex].route.length + 1));
      });
    });
  }

  function updateCreationMapLayers() {
    if (!createMap) return;

    // Pulisci marker e polilinee
    createMapMarkers.forEach(m => createMap.removeLayer(m));
    createMapMarkers = [];

    if (createMapPolyline) {
      createMap.removeLayer(createMapPolyline);
      createMapPolyline = null;
    }

    const currentDay = formDataDays[currentFormDayIndex];
    const route = currentDay.route || [];

    // Disegna tappe principali
    route.forEach((point, index) => {
      const num = index + 1;
      const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="background-color:#3b82f6;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:11px;border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.5)">${num}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([point.lat, point.lng], { icon: customIcon }).addTo(createMap)
        .bindPopup(`<b>Tappa ${num}:</b> ${point.label}`);
      
      createMapMarkers.push(marker);
    });

    // Disegna linea manuale delle tappe (linea blu tratteggiata delle tappe programmate)
    if (route.length >= 2) {
      const latlngs = route.map(p => [p.lat, p.lng]);
      createMapPolyline = L.polyline(latlngs, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.8,
        dashArray: '8, 8'
      }).addTo(createMap);
    }

    // Centra e zoomma
    if (route.length > 0) {
      const group = new L.featureGroup(createMapMarkers);
      createMap.fitBounds(group.getBounds().pad(0.2));
    }
  }

  // === INTEGRAZIONE OSRM ROUTING API (CALCOLO SPOSTAMENTI) ===
  function addRoutePoint(lat, lng, label) {
    const currentDay = formDataDays[currentFormDayIndex];
    const prevPoint = currentDay.route[currentDay.route.length - 1];
    
    const newPoint = { lat, lng, label, time: "" };
    
    if (prevPoint) {
      const mezzo = (selectedTransportInput.value || "Auto").toLowerCase();
      const profile = mezzo === "bicicletta" ? "bicycle" : (mezzo === "piedi" ? "foot" : "driving");
      
      showToast("Calcolo percorso...", "success");
      
      fetch(`https://router.project-osrm.org/route/v1/${profile}/${prevPoint.lng},${prevPoint.lat};${lng},${lat}?overview=false`)
        .then(res => res.json())
        .then(data => {
          if (data && data.routes && data.routes[0]) {
            const distance = data.routes[0].distance; // metri
            const duration = data.routes[0].duration; // secondi
            
            const distanceKm = (distance / 1000).toFixed(1);
            let durationMin = Math.round(duration / 60);
            let timeStr = "";
            
            if (durationMin >= 60) {
              const ore = Math.floor(durationMin / 60);
              const min = durationMin % 60;
              timeStr = `${ore}h ${min}min (${distanceKm} km)`;
            } else {
              timeStr = `${durationMin} min (${distanceKm} km)`;
            }
            
            newPoint.time = timeStr;
          } else {
            newPoint.time = simulateTravelTime(prevPoint, newPoint, selectedTransportInput.value);
          }
          currentDay.route.push(newPoint);
          renderFormDays();
        })
        .catch(() => {
          newPoint.time = simulateTravelTime(prevPoint, newPoint, selectedTransportInput.value);
          currentDay.route.push(newPoint);
          renderFormDays();
        });
    } else {
      currentDay.route.push(newPoint);
      renderFormDays();
    }
  }

  function simulateTravelTime(p1, p2, mezzo) {
    const distMeters = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
    const distKm = distMeters / 1000;
    
    let speed = 60; // km/h Auto
    const m = (mezzo || "Auto").toLowerCase();
    if (m === "aereo") speed = 800;
    else if (m === "treno") speed = 100;
    else if (m === "bicicletta") speed = 18;
    else if (m === "piedi") speed = 4.5;
    else if (m === "autobus") speed = 45;
    else if (m === "moto") speed = 65;

    const timeHours = distKm / speed;
    const timeMinutes = Math.round(timeHours * 60);
    
    if (timeMinutes >= 60) {
      const h = Math.floor(timeMinutes / 60);
      const m = timeMinutes % 60;
      return `${h}h ${m}m (${distKm.toFixed(1)} km)`;
    }
    return `${timeMinutes} min (${distKm.toFixed(1)} km)`;
  }

  function searchLocationOnMap() {
    const query = mapSearchInput.value.trim();
    if (!query) return;

    mapSearchBtn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Cerca";
    
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
      headers: { "Accept-Language": "it" }
    })
    .then(res => res.json())
    .then(results => {
      mapSearchBtn.innerHTML = "Cerca";
      if (results && results.length > 0) {
        const place = results[0];
        const lat = parseFloat(place.lat);
        const lng = parseFloat(place.lon);
        
        createMap.setView([lat, lng], 12);
        const label = place.display_name.split(',')[0];
        addRoutePoint(lat, lng, label);
        mapSearchInput.value = "";
      } else {
        showToast("Nessun luogo trovato", "error");
      }
    })
    .catch(() => {
      mapSearchBtn.innerHTML = "Cerca";
      showToast("Errore di rete nella ricerca", "error");
    });
  }

  function renderRouteList() {
    routeItemsList.innerHTML = "";
    const route = formDataDays[currentFormDayIndex].route || [];
    
    if (route.length === 0) {
      routePlaceholder.style.display = "block";
      return;
    }

    routePlaceholder.style.display = "none";

    route.forEach((point, index) => {
      const item = document.createElement("div");
      item.className = "route-item-container";
      
      let timeBadgeHtml = "";
      if (index > 0 && point.time) {
        let mezzoIcon = "fa-car";
        const mezzo = (selectedTransportInput.value || "Auto").toLowerCase();
        if (mezzo === "aereo") mezzoIcon = "fa-plane";
        else if (mezzo === "treno") mezzoIcon = "fa-train";
        else if (mezzo === "bicicletta") mezzoIcon = "fa-bicycle";
        else if (mezzo === "piedi") mezzoIcon = "fa-walking";

        timeBadgeHtml = `
          <div class="route-time-badge" title="Tempo di spostamento programmato">
            <i class="fas ${mezzoIcon}"></i> Stima: ${point.time}
          </div>
        `;
      }

      item.innerHTML = `
        ${timeBadgeHtml}
        <div class="route-item">
          <div class="route-item-details">
            <div class="route-item-number">${index + 1}</div>
            <span class="route-item-name" title="${point.label}">${point.label}</span>
          </div>
          <button type="button" class="route-item-remove" data-index="${index}" title="Rimuovi"><i class="fas fa-times-circle"></i></button>
        </div>
      `;

      item.querySelector(".route-item-remove").addEventListener("click", function(e) {
        e.stopPropagation();
        removeRoutePoint(index);
      });

      routeItemsList.appendChild(item);
    });
  }

  function removeRoutePoint(index) {
    const currentDay = formDataDays[currentFormDayIndex];
    currentDay.route.splice(index, 1);

    if (index > 0 && index < currentDay.route.length) {
      const prev = currentDay.route[index - 1];
      const next = currentDay.route[index];
      
      const mezzo = (selectedTransportInput.value || "Auto").toLowerCase();
      const profile = mezzo === "bicicletta" ? "bicycle" : (mezzo === "piedi" ? "foot" : "driving");

      fetch(`https://router.project-osrm.org/route/v1/${profile}/${prev.lng},${prev.lat};${next.lng},${next.lat}?overview=false`)
        .then(res => res.json())
        .then(data => {
          if (data && data.routes && data.routes[0]) {
            const distance = data.routes[0].distance;
            const duration = data.routes[0].duration;
            const distanceKm = (distance / 1000).toFixed(1);
            let durationMin = Math.round(duration / 60);
            next.time = durationMin >= 60 ? `${Math.floor(durationMin/60)}h ${durationMin%60}min (${distanceKm} km)` : `${durationMin} min (${distanceKm} km)`;
          } else {
            next.time = simulateTravelTime(prev, next, selectedTransportInput.value);
          }
          renderFormDays();
        })
        .catch(() => {
          next.time = simulateTravelTime(prev, next, selectedTransportInput.value);
          renderFormDays();
        });
    } else {
      renderFormDays();
    }
  }

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
              
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // === SALVA E RESET FORM ===
  function saveItinerary() {
    const title = document.getElementById("itinerary-title").value.trim();
    const description = document.getElementById("itinerary-desc").value.trim();
    const mezzo = selectedTransportInput.value;
    const costo = parseFloat(document.getElementById("itinerary-cost").value);
    const valuta = document.getElementById("itinerary-currency").value;
    const data = document.getElementById("itinerary-date").value;

    if (!title || !description || !mezzo || isNaN(costo) || !data) {
      showToast("Compila tutti i campi richiesti!", "error");
      return;
    }

    const totalTappe = formDataDays.reduce((c, d) => c + d.route.length, 0);
    if (totalTappe === 0) {
      showToast("Inserisci almeno una tappa nel viaggio!", "error");
      return;
    }

    const itineraryData = {
      title,
      description,
      mezzo,
      costo,
      valuta,
      durata: formDataDays.length,
      data,
      photo: uploadedPhotoBase64 || "",
      days: formDataDays,
      status: "planned" // Predefinito: Solo Programmato
    };

    const submitBtn = createForm.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Salvataggio...";

    window.AppDB.addItinerary(itineraryData, function(err) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Condividi Itinerario";

      if (err) {
        showToast("Errore di salvataggio: " + err.message, "error");
      } else {
        showToast("Viaggio programmato con successo!", "success");
        resetCreateForm();
        refreshData();
        switchView("feed");
      }
    });
  }

  function resetCreateForm() {
    createForm.reset();
    transportOptions.forEach(o => o.classList.remove("selected"));
    selectedTransportInput.value = "";
    
    uploadedPhotoBase64 = null;
    filePreviewContainer.style.display = "none";
    document.querySelector(".photo-upload-zone p").innerText = "Trascina una foto o clicca per caricare";

    formDataDays = [
      { dayNumber: 1, route: [], gpsTrackPoints: [], activities: [], restaurants: [] }
    ];
    currentFormDayIndex = 0;
    
    if (createMap) {
      createMapMarkers.forEach(m => createMap.removeLayer(m));
      createMapMarkers = [];
      if (createMapPolyline) createMap.removeLayer(createMapPolyline);
      createMapPolyline = null;
    }
  }

  // === REGISTRAZIONE IN VIAGGIO (LOGICA TRACKER) ===
  function startTrackingTripFlow(trip) {
    if (trackerWatchId || trackerTimerId) {
      showToast("Hai già un tracciamento in corso per un altro viaggio!", "error");
      return;
    }

    trackingTrip = trip;
    switchView("tracker");

    trackerTripTitle.innerText = trip.title;

    // Popola selezione giorno
    trackerDaySelect.innerHTML = "";
    trip.days.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.dayNumber;
      opt.innerText = `Giorno ${d.dayNumber}`;
      trackerDaySelect.appendChild(opt);
    });

    // Seleziona il primo giorno che non ha un tempo effettivo registrato
    const firstUnrecordedDay = trip.days.find(d => !d.actualTime);
    if (firstUnrecordedDay) {
      trackerDaySelect.value = firstUnrecordedDay.dayNumber;
    } else {
      trackerDaySelect.value = 1;
    }

    stopwatchTime.innerText = "00:00:00";
    trackerElapsedTime = 0;
    
    btnTrackerStart.style.display = "flex";
    btnTrackerStop.style.display = "none";
    trackerGpsStatus.innerHTML = `<i class="fas fa-satellite" style="color:var(--text-muted);"></i> GPS non attivo. Premi Avvia per registrare lo spostamento reale.`;

    initTrackerMap();
  }

  function changeTrackerDay() {
    if (trackerWatchId || trackerTimerId) {
      showToast("Impossibile cambiare giorno mentre la registrazione è attiva!", "error");
      trackerDaySelect.value = activeTrackerDayNumber();
      return;
    }
    stopwatchTime.innerText = "00:00:00";
    trackerElapsedTime = 0;
    initTrackerMap();
  }

  function activeTrackerDayNumber() {
    return parseInt(trackerDaySelect.value) || 1;
  }

  function activeTrackerDay() {
    const num = activeTrackerDayNumber();
    return trackingTrip.days.find(d => d.dayNumber === num);
  }

  function initTrackerMap() {
    if (trackerMap) {
      trackerMap.remove();
      trackerMap = null;
    }

    const day = activeTrackerDay();
    if (!day) return;

    trackerMapMarkers = [];

    // Div contenitore
    const container = document.getElementById("tracker-map-container");
    container.innerHTML = "";

    // Mappa centrata su prima tappa programmata o Italia di default
    const defaultCenter = day.route && day.route[0] ? [day.route[0].lat, day.route[0].lng] : [41.9028, 12.4964];
    const defaultZoom = day.route && day.route[0] ? 12 : 6;

    trackerMap = L.map("tracker-map-container").setView(defaultCenter, defaultZoom);

    const baseLayers = createMapBaseLayers();
    baseLayers["CartoDB Scuro (Default)"].addTo(trackerMap);
    L.control.layers(baseLayers).addTo(trackerMap);

    // Disegna tappe pianificate sulla mappa (Blu)
    const route = day.route || [];
    route.forEach((point, index) => {
      const num = index + 1;
      const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="background-color:#3b82f6;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:11px;border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.5)">${num}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([point.lat, point.lng], { icon: customIcon }).addTo(trackerMap)
        .bindPopup(`<b>Pianificato - Tappa ${num}:</b> ${point.label}`);
      
      trackerMapMarkers.push(marker);
    });

    if (route.length >= 2) {
      const latlngs = route.map(p => [p.lat, p.lng]);
      trackerMapPolyline = L.polyline(latlngs, {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.6,
        dashArray: '6, 6'
      }).addTo(trackerMap);
    }

    // Se ci sono già coordinate GPS registrate per questo giorno (es. tracciato pre-esistente), mostralo in rosso
    const gpsTrack = day.gpsTrackPoints || [];
    if (gpsTrack.length >= 2) {
      const latlngsGps = gpsTrack.map(p => [p.lat, p.lng]);
      trackerMapGpsPolyline = L.polyline(latlngsGps, {
        color: '#f43f5e',
        weight: 4,
        opacity: 0.9,
        lineJoin: 'round'
      }).addTo(trackerMap);
    }

    // Centra sui marker pianificati
    if (trackerMapMarkers.length > 0) {
      const group = new L.featureGroup(trackerMapMarkers);
      trackerMap.fitBounds(group.getBounds().pad(0.2));
    }

    renderTrackerRouteList();
  }

  function renderTrackerRouteList() {
    trackerRouteItemsList.innerHTML = "";
    const day = activeTrackerDay();
    if (!day) return;

    const gpsPoints = day.gpsTrackPoints || [];
    
    if (gpsPoints.length === 0) {
      trackerRoutePlaceholder.style.display = "block";
      return;
    }

    trackerRoutePlaceholder.style.display = "none";

    // Mostra un riepilogo dei punti GPS registrati
    gpsPoints.forEach((point, index) => {
      const item = document.createElement("div");
      item.className = "route-item-container";
      item.innerHTML = `
        <div class="route-item" style="border: 1px solid rgba(244, 63, 94, 0.15); background-color: rgba(244, 63, 94, 0.02); padding: 8px 12px;">
          <div class="route-item-details">
            <div class="route-item-number" style="background-color: var(--accent-coral); color: white; border-color: rgba(244, 63, 94, 0.2); font-size:10px; width:18px; height:18px;">R</div>
            <span class="route-item-name" style="font-size: 13px;">Rilevamento GPS #${index + 1} (${point.time || 'Ok'})</span>
          </div>
        </div>
      `;
      trackerRouteItemsList.appendChild(item);
    });
  }

  function startTrackerRecording() {
    if (trackerWatchId || trackerTimerId) return;

    if (!navigator.geolocation) {
      showToast("Il browser non supporta la geolocalizzazione", "error");
      return;
    }

    const day = activeTrackerDay();
    if (!day) return;

    showToast("Tracciamento GPS ed acquisizione avviata!", "success");

    // Azzera i dati GPS registrati precedentemente per oggi per fare un nuovo spostamento pulito
    day.gpsTrackPoints = [];
    trackerLastCoords = null;
    renderTrackerRouteList();

    // Rimuovi polilinea GPS precedente
    if (trackerMapGpsPolyline) {
      trackerMap.removeLayer(trackerMapGpsPolyline);
      trackerMapGpsPolyline = null;
    }

    // Avvia cronometro
    trackerStartTime = Date.now();
    trackerTimerId = setInterval(updateStopwatch, 200);

    // Avvia geolocalizzazione ad alta precisione
    trackerGpsStatus.innerHTML = `<i class="fas fa-spinner fa-spin" style="color:var(--accent-amber);"></i> Aggancio segnale GPS in corso...`;
    
    trackerWatchId = navigator.geolocation.watchPosition(
      function(position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        trackerGpsStatus.innerHTML = `<i class="fas fa-satellite" style="color:var(--accent-emerald);"></i> Segnale GPS attivo. Precisione: ${position.coords.accuracy.toFixed(0)}m`;

        // Salva coordinata
        const timeLabel = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const newPoint = { lat, lng, time: timeLabel };
        day.gpsTrackPoints.push(newPoint);

        // Centra mappa
        if (trackerMap) trackerMap.setView([lat, lng], 16);

        // Aggiorna tracciato rosso
        if (trackerMap) {
          const latlngsGps = day.gpsTrackPoints.map(p => [p.lat, p.lng]);
          if (trackerMapGpsPolyline) {
            trackerMapGpsPolyline.setLatLngs(latlngsGps);
          } else {
            trackerMapGpsPolyline = L.polyline(latlngsGps, {
              color: '#f43f5e',
              weight: 4,
              opacity: 0.9,
              lineJoin: 'round'
            }).addTo(trackerMap);
          }
        }

        renderTrackerRouteList();
      },
      function(error) {
        console.error(error);
        trackerGpsStatus.innerHTML = `<i class="fas fa-exclamation-triangle" style="color:var(--accent-coral);"></i> Errore GPS: segnale perso.`;
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );

    // Gestione pulsanti
    btnTrackerStart.style.display = "none";
    btnTrackerStop.style.display = "flex";
  }

  function updateStopwatch() {
    trackerElapsedTime = Date.now() - trackerStartTime;
    
    const totSeconds = Math.floor(trackerElapsedTime / 1000);
    const hours = Math.floor(totSeconds / 3600);
    const minutes = Math.floor((totSeconds % 3600) / 60);
    const seconds = totSeconds % 60;

    const pad = (n) => n.toString().padStart(2, '0');
    stopwatchTime.innerText = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  function stopTrackerRecording() {
    if (!trackerWatchId && !trackerTimerId) return;

    // Ferma timer e GPS
    clearInterval(trackerTimerId);
    trackerTimerId = null;

    navigator.geolocation.clearWatch(trackerWatchId);
    trackerWatchId = null;

    const day = activeTrackerDay();
    if (!day) return;

    // Calcola tempo effettivo trascorso in ore/minuti
    const totMinutes = Math.round(trackerElapsedTime / 1000 / 60);
    let durationText = "0 min";
    if (totMinutes >= 60) {
      const h = Math.floor(totMinutes / 60);
      const m = totMinutes % 60;
      durationText = `${h}h ${m}min`;
    } else {
      durationText = `${totMinutes} min`;
    }

    day.actualTime = durationText;

    // Imposta stato viaggio a "In Corso" (active) se non è già completato
    if (trackingTrip.status !== 'completed') {
      trackingTrip.status = 'active';
    }

    // Salva nel Database
    window.AppDB.addItinerary(trackingTrip, function(err) {
      if (err) {
        showToast("Impossibile salvare i dati del tracciamento", "error");
      } else {
        showToast(`Spostamento Giorno ${day.dayNumber} salvato! Tempo reale: ${durationText}`, "success");
        refreshData();
      }
    });

    btnTrackerStart.style.display = "flex";
    btnTrackerStop.style.display = "none";
    trackerGpsStatus.innerHTML = `<i class="fas fa-check-circle" style="color:var(--accent-emerald);"></i> Spostamento registrato con successo!`;
  }

  function completeTripFlow() {
    if (trackerWatchId || trackerTimerId) {
      showToast("Ferma la registrazione corrente prima di completare il viaggio!", "error");
      return;
    }

    if (confirm("Vuoi segnare l'intero viaggio come completato? Lo stato diventerà 'Completato' e non sarà più possibile registrare nuovi spostamenti.")) {
      trackingTrip.status = "completed";

      window.AppDB.addItinerary(trackingTrip, function(err) {
        if (err) {
          showToast("Errore durante il salvataggio", "error");
        } else {
          showToast("Viaggio completato con successo!", "success");
          resetTrackerState();
          refreshData();
          switchView("profile");
        }
      });
    }
  }

  function resetTrackerState() {
    if (trackerTimerId) clearInterval(trackerTimerId);
    if (trackerWatchId) navigator.geolocation.clearWatch(trackerWatchId);
    
    trackingTrip = null;
    trackerWatchId = null;
    trackerTimerId = null;
    trackerStartTime = 0;
    trackerElapsedTime = 0;
    
    if (trackerMap) {
      trackerMap.remove();
      trackerMap = null;
    }
    trackerMapMarkers = [];
    trackerMapPolyline = null;
    trackerMapGpsPolyline = null;
  }

  // === RENDERING DETTAGLI VIAGGIO (MODALE MULTI-GIORNO) ===
  function openDetailsModal(item) {
    activeModalTrip = item;
    activeModalDayIndex = 0;

    detailsModal.classList.add("active");

    // Copertina e Utente
    document.getElementById("modal-img").src = item.photo || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80";
    document.getElementById("modal-user-avatar").src = item.user.photoURL;
    document.getElementById("modal-user-name").innerText = item.user.displayName;
    document.getElementById("modal-title").innerText = item.title;
    document.getElementById("modal-desc").innerText = item.description;

    // Info generali
    document.getElementById("modal-val-costo").innerText = `${item.costo} ${item.valuta || 'EUR'}`;
    document.getElementById("modal-val-mezzo").innerText = item.mezzo;
    document.getElementById("modal-val-durata").innerText = `${item.durata} gg`;
    document.getElementById("modal-val-data").innerText = new Date(item.data).toLocaleDateString('it-IT');

    // Genera schede giorni nel modale
    renderModalDayTabs();
    renderModalDayDetails();
  }

  function renderModalDayTabs() {
    modalDayTabs.innerHTML = "";
    const days = activeModalTrip.days || [];
    
    if (days.length === 0) {
      modalDayTabs.innerHTML = `<div style="font-size:13px; color:var(--text-muted); font-style:italic;">Nessun programma giornaliero.</div>`;
      return;
    }

    days.forEach((day, index) => {
      const tab = document.createElement("button");
      tab.className = `day-tab ${index === activeModalDayIndex ? 'active' : ''}`;
      tab.innerText = `Giorno ${day.dayNumber}`;
      tab.addEventListener("click", () => {
        activeModalDayIndex = index;
        modalDayTabs.querySelectorAll(".day-tab").forEach((t, i) => {
          t.className = `day-tab ${i === index ? 'active' : ''}`;
        });
        renderModalDayDetails();
      });
      modalDayTabs.appendChild(tab);
    });
  }

  function renderModalDayDetails() {
    const day = activeModalTrip.days[activeModalDayIndex];
    if (!day) return;

    // Aggiorna titolo mappa e tappe
    document.getElementById("modal-map-title-day").innerHTML = `<i class="fas fa-map-marked-alt"></i> Tappe - Giorno ${day.dayNumber}`;

    // 1. Renderizza Attività
    modalActivitiesList.innerHTML = "";
    const acts = day.activities || [];
    if (acts.length === 0) {
      modalActivitiesList.innerHTML = `<div style="font-size:13px; color:var(--text-muted); font-style:italic;">Nessuna attività programmata per questo giorno.</div>`;
    } else {
      acts.sort((a,b) => a.time.localeCompare(b.time));
      acts.forEach(act => {
        const item = document.createElement("div");
        item.className = "activity-item";
        item.innerHTML = `
          <div class="activity-node"></div>
          <div class="activity-header">
            <span class="activity-time"><i class="far fa-clock"></i> ${act.time}</span>
            <span class="activity-title">${act.title}</span>
          </div>
          ${act.description ? `<p class="activity-desc">${act.description}</p>` : ''}
          ${act.costo > 0 ? `<div class="activity-meta"><span class="activity-cost">Spesa: ${act.costo} ${act.valuta || 'EUR'}</span></div>` : ''}
        `;
        modalActivitiesList.appendChild(item);
      });
    }

    // 2. Renderizza Ristoranti
    modalRestaurantsList.innerHTML = "";
    const rests = day.restaurants || [];
    if (rests.length === 0) {
      modalRestaurantsList.innerHTML = `<div style="font-size:13px; color:var(--text-muted); font-style:italic;">Nessun locale inserito per questo giorno.</div>`;
    } else {
      rests.forEach(rest => {
        const item = document.createElement("div");
        item.className = "restaurant-card";
        let starsHtml = "";
        for (let i = 1; i <= 5; i++) {
          starsHtml += `<i class="${i <= rest.rating ? 'fas' : 'far'} fa-star"></i>`;
        }
        item.innerHTML = `
          <div class="restaurant-header">
            <span class="restaurant-title">${rest.name}</span>
          </div>
          <div class="stars-display" style="margin-bottom:6px;">${starsHtml}</div>
          ${rest.review ? `<p class="restaurant-review">"${rest.review}"</p>` : ''}
          ${rest.costo > 0 ? `<div class="restaurant-meta"><span class="restaurant-cost">Spesa stimata: ${rest.costo} €</span></div>` : ''}
        `;
        modalRestaurantsList.appendChild(item);
      });
    }

    // 3. Renderizza Lista Tappe e Visualizzazione del Tempo (Confronto Effettivo vs Stimato)
    modalDayRouteList.innerHTML = "";
    const route = day.route || [];
    
    // Mostra il tempo totale di spostamento in cima alla lista tappe
    if (route.length > 0) {
      const timeContainer = document.createElement("div");
      timeContainer.className = "modal-time-container";

      if (day.actualTime) {
        // Se registrato: mostra tempo effettivo in verde
        timeContainer.innerHTML = `
          <div class="time-badge-actual" title="Registrato tramite cronometro GPS">
            <i class="fas fa-history"></i> Tempo Effettivo Spostamento: <b>${day.actualTime}</b>
          </div>
        `;
      } else {
        // Se non registrato: mostra tempo stimato programmato (somma dei tempi stimati OSRM)
        let totalEstMin = 0;
        let hasEstTimes = false;
        route.forEach(point => {
          if (point.time) {
            hasEstTimes = true;
            const matches = point.time.match(/(\d+)\s*min/);
            if (matches) {
              totalEstMin += parseInt(matches[1]);
            }
            const hourMatches = point.time.match(/(\d+)h\s*(\d+)?min/);
            if (hourMatches) {
              totalEstMin += parseInt(hourMatches[1]) * 60 + (hourMatches[2] ? parseInt(hourMatches[2]) : 0);
            }
          }
        });

        let estTimeStr = "Stima non disponibile";
        if (hasEstTimes && totalEstMin > 0) {
          if (totalEstMin >= 60) {
            estTimeStr = `${Math.floor(totalEstMin / 60)}h ${totalEstMin % 60}min (stima)`;
          } else {
            estTimeStr = `${totalEstMin} min (stima)`;
          }
        }

        timeContainer.innerHTML = `
          <div class="time-badge-estimated" title="Calcolato automaticamente in pianificazione">
            <i class="far fa-clock"></i> Spostamento Stimato: <b>${estTimeStr}</b>
          </div>
        `;
      }
      modalDayRouteList.appendChild(timeContainer);
    }

    if (route.length === 0) {
      const emptyEl = document.createElement("div");
      emptyEl.style = "font-size:13px; color:var(--text-muted); font-style:italic;";
      emptyEl.innerText = "Nessuna tappa presente per oggi.";
      modalDayRouteList.appendChild(emptyEl);
    } else {
      route.forEach((point, index) => {
        const item = document.createElement("div");
        item.className = "route-item-container";
        
        let estTimeHtml = "";
        // Se non registrato, mostra le singole stime di tratta pianificate
        if (!day.actualTime && index > 0 && point.time) {
          let mezzoIcon = "fa-car";
          const mezzo = (activeModalTrip.mezzo || "Auto").toLowerCase();
          if (mezzo === "aereo") mezzoIcon = "fa-plane";
          else if (mezzo === "treno") mezzoIcon = "fa-train";
          else if (mezzo === "bicicletta") mezzoIcon = "fa-bicycle";
          else if (mezzo === "piedi") mezzoIcon = "fa-walking";

          estTimeHtml = `
            <div class="route-time-badge" style="margin: 6px auto;">
              <i class="fas ${mezzoIcon}"></i> Stima: ${point.time}
            </div>
          `;
        }

        item.innerHTML = `
          ${estTimeHtml}
          <div class="route-item" style="border:1px solid var(--glass-border); padding: 10px 14px; background: rgba(255,255,255,0.01);">
            <div class="route-item-details">
              <div class="route-item-number" style="background: var(--bg-tertiary); color: var(--accent-emerald); border-color: rgba(16, 185, 129, 0.2);">${index + 1}</div>
              <span class="route-item-name">${point.label}</span>
            </div>
          </div>
        `;
        modalDayRouteList.appendChild(item);
      });
    }

    // 4. Carica Mappa del Giorno
    setTimeout(() => {
      initModalMap(day);
    }, 200);
  }

  function initModalMap(day) {
    if (modalMap) {
      modalMap.remove();
      modalMap = null;
    }

    const route = day.route || [];
    const gpsTrack = day.gpsTrackPoints || [];

    if (route.length === 0 && gpsTrack.length === 0) {
      document.getElementById("modal-map-container").style.display = "none";
      return;
    }

    document.getElementById("modal-map-container").style.display = "block";

    const firstPoint = route[0] || gpsTrack[0];
    modalMap = L.map("modal-map-container").setView([firstPoint.lat, firstPoint.lng], 10);

    const baseLayers = createMapBaseLayers();
    baseLayers["CartoDB Scuro (Default)"].addTo(modalMap);
    L.control.layers(baseLayers).addTo(modalMap);

    modalMapMarkers = [];
    const latlngs = [];

    // Tappe principali pianificate
    route.forEach((point, index) => {
      const num = index + 1;
      latlngs.push([point.lat, point.lng]);

      const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="background-color:#10b981;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:11px;border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.5)">${num}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([point.lat, point.lng], { icon: customIcon }).addTo(modalMap)
        .bindPopup(`<b>Pianificato - Tappa ${num}:</b> ${point.label}`);
      
      modalMapMarkers.push(marker);
    });

    // Polilinea manuale tappe (linea verde tratteggiata per le tappe programmate)
    if (route.length >= 2) {
      modalMapPolyline = L.polyline(latlngs, {
        color: '#10b981',
        weight: 4,
        opacity: 0.8,
        dashArray: '8, 8',
        lineJoin: 'round'
      }).addTo(modalMap);
    }

    // Polilinea percorso GPS completo reale (linea rossa continua)
    if (gpsTrack.length >= 2) {
      const latlngsGps = gpsTrack.map(p => [p.lat, p.lng]);
      modalMapGpsPolyline = L.polyline(latlngsGps, {
        color: '#f43f5e',
        weight: 4,
        opacity: 0.9,
        lineJoin: 'round'
      }).addTo(modalMap);
    }

    // Adatta inquadratura
    const allMarkers = [...modalMapMarkers];
    if (allMarkers.length === 0 && gpsTrack.length > 0) {
      const groupGps = L.polyline(gpsTrack.map(p => [p.lat, p.lng]));
      modalMap.fitBounds(groupGps.getBounds().pad(0.2));
    } else if (allMarkers.length > 0) {
      const group = new L.featureGroup(allMarkers);
      modalMap.fitBounds(group.getBounds().pad(0.25));
    }

    setTimeout(() => {
      modalMap.invalidateSize();
    }, 150);
  }

  // === FUNZIONE DI CONDIVISIONE LINK DIRETTO / GUIDA FIREBASE ===
  function shareActiveTrip() {
    if (!activeModalTrip) return;

    if (window.isFirebaseConfigured()) {
      const shareUrl = window.location.origin + window.location.pathname + `?trip=${activeModalTrip.id}`;
      
      if (navigator.share) {
        navigator.share({
          title: `Itinerario: ${activeModalTrip.title}`,
          text: `Guarda l'itinerario del mio viaggio "${activeModalTrip.title}" su Itinera!`,
          url: shareUrl
        })
        .then(() => showToast("Viaggio condiviso!", "success"))
        .catch(err => console.log("Errore condivisione: ", err));
      } else {
        navigator.clipboard.writeText(shareUrl)
          .then(() => {
            showToast("Link copiato negli appunti!", "success");
          })
          .catch(() => {
            showToast("Impossibile copiare il link", "error");
          });
      }
    } else {
      if (firebaseGuideModal) firebaseGuideModal.classList.add("active");
      showToast("La condivisione richiede la configurazione Cloud!", "error");
    }
  }

})();
