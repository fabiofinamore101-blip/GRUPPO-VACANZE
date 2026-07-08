/**
 * ITINERA - LOGICA APPLICAZIONE
 * 
 * Controlla l'interfaccia utente, le visualizzazioni, le mappe Leaflet,
 * l'interazione con il database IndexedDB/Firebase e la gestione dello stato.
 */

(function() {
  // === STATO DELL'APPLICAZIONE ===
  let currentActiveView = "feed";
  let activeTransportFilter = "all";
  let searchTimeout = null;
  let allItineraries = [];
  
  // Riferimenti Mappe Leaflet
  let createMap = null;
  let createMapMarkers = [];
  let createMapPolyline = null;
  let createRoutePoints = []; // Array di {lat, lng, label}
  
  let modalMap = null;
  let modalMapMarkers = [];
  let modalMapPolyline = null;
  
  // Foto in caricamento (Base64)
  let uploadedPhotoBase64 = null;

  // === RIFERIMENTI ELEMENTI DOM ===
  const views = {
    login: document.getElementById("login-view"),
    feed: document.getElementById("feed-view"),
    create: document.getElementById("create-view"),
    profile: document.getElementById("profile-view")
  };

  const navButtons = {
    feed: document.getElementById("nav-feed"),
    create: document.getElementById("nav-create"),
    profile: document.getElementById("nav-profile")
  };

  const profileHeaderInfo = document.getElementById("profile-header-info");
  const userProfileMenu = document.getElementById("user-profile-menu");
  
  // Elementi Login
  const googleBtn = document.getElementById("google-login-btn");
  const mockEmailInput = document.getElementById("mock-email");
  const mockNameInput = document.getElementById("mock-name");
  const mockSubmitBtn = document.getElementById("mock-submit-btn");
  const googlePicker = document.getElementById("google-picker");
  const googlePickerItems = document.querySelectorAll(".google-account-item");
  
  // Elementi Form Creazione
  const createForm = document.getElementById("itinerary-form");
  const cancelCreateBtn = document.getElementById("cancel-create-btn");
  const transportOptions = document.querySelectorAll(".transport-option");
  const selectedTransportInput = document.getElementById("selected-transport");
  const fileInput = document.getElementById("photo-file");
  const filePreviewContainer = document.getElementById("preview-container");
  const filePreviewImg = document.getElementById("preview-img");
  const removePhotoBtn = document.getElementById("remove-photo-btn");
  const mapSearchInput = document.getElementById("map-search-input");
  const mapSearchBtn = document.getElementById("map-search-btn");
  const routePlaceholder = document.getElementById("route-placeholder");
  const routeItemsList = document.getElementById("route-items-list");
  
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

  // Elementi Modale
  const detailsModal = document.getElementById("details-modal");
  const closeModalBtn = document.getElementById("modal-close-btn");
  
  // Toast
  const toastEl = document.getElementById("toast-notification");
  const toastText = document.getElementById("toast-text");

  // === INIZIALIZZAZIONE ===
  document.addEventListener("DOMContentLoaded", function() {
    // Inizializza il database (IndexedDB o Firebase)
    window.AppDB.init(function(err, res) {
      if (err) {
        showToast("Errore di connessione al database", "error");
        return;
      }
      
      console.log("Database inizializzato con successo. Modalità: " + res.mode);
      
      // Imposta badge modalità su login card
      const modeBadge = document.createElement("div");
      modeBadge.className = "app-mode-badge";
      modeBadge.innerHTML = res.mode === "firebase" ? 
        "<i class='fab fa-google'></i> Cloud Firebase Attivo" : 
        "<i class='fas fa-hdd'></i> Archivio Locale Browser";
      views.login.querySelector(".login-card").appendChild(modeBadge);

      // Gestione stato autenticazione
      window.AppDB.onAuthStateChanged(function(user) {
        if (user) {
          // Utente Autenticato
          views.login.classList.remove("active");
          userProfileMenu.style.display = "flex";
          
          // Imposta avatar in navbar
          document.getElementById("user-nav-avatar").src = user.photoURL;
          
          // Carica i dati
          refreshData();
          switchView(currentActiveView);
        } else {
          // Utente Non Autenticato
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
        // Mostra il selettore di account Google simulato
        googlePicker.classList.add("active");
      }
    });

    // Clicca fuori dal Google Picker per chiuderlo
    googlePicker.addEventListener("click", function(e) {
      if (e.target === googlePicker) {
        googlePicker.classList.remove("active");
      }
    });

    // Seleziona account mock
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

    // Form di login mock (Email & Nome liberi)
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

    // Form - Selezione mezzo di trasporto
    transportOptions.forEach(opt => {
      opt.addEventListener("click", function() {
        transportOptions.forEach(o => o.classList.remove("selected"));
        this.classList.add("selected");
        selectedTransportInput.value = this.getAttribute("data-value");
      });
    });

    // Form - Gestione caricamento foto
    fileInput.addEventListener("change", function(e) {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        showToast("Carica solo file immagine", "error");
        return;
      }

      // Controlla dimensioni (consigliato max 3MB per IndexedDB)
      if (file.size > 3 * 1024 * 1024) {
        showToast("L'immagine supera i 3MB. Scegline una più piccola.", "error");
        fileInput.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = function(evt) {
        uploadedPhotoBase64 = evt.target.result;
        filePreviewImg.src = uploadedPhotoBase64;
        filePreviewContainer.style.display = "block";
        document.querySelector(".photo-upload-zone p").innerText = "Foto caricata con successo";
      };
      reader.readAsDataURL(file);
    });

    // Form - Rimuovi foto
    removePhotoBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      uploadedPhotoBase64 = null;
      fileInput.value = "";
      filePreviewContainer.style.display = "none";
      document.querySelector(".photo-upload-zone p").innerText = "Trascina una foto o clicca per caricare";
    });

    // Form - Cerca località sulla mappa
    mapSearchBtn.addEventListener("click", searchLocationOnMap);
    mapSearchInput.addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        searchLocationOnMap();
      }
    });

    // Form - Invio salvataggio itinerario
    createForm.addEventListener("submit", function(e) {
      e.preventDefault();
      saveItinerary();
    });

    cancelCreateBtn.addEventListener("click", function() {
      resetCreateForm();
      switchView("feed");
    });

    // Chiusura Modale Dettagli
    closeModalBtn.addEventListener("click", () => {
      detailsModal.classList.remove("active");
    });
    
    detailsModal.addEventListener("click", function(e) {
      if (e.target === detailsModal) {
        detailsModal.classList.remove("active");
      }
    });
  }

  // === GESTIONE VISUALIZZAZIONI ===
  function switchView(viewName) {
    if (!window.AppDB.getCurrentUser()) {
      views.login.classList.add("active");
      hideAllViews();
      return;
    }

    currentActiveView = viewName;
    hideAllViews();
    
    // Attiva pulsante menu
    Object.keys(navButtons).forEach(key => {
      if (key === viewName) navButtons[key].classList.add("active");
      else navButtons[key].classList.remove("active");
    });

    // Attiva la vista
    views[viewName].classList.add("active");

    // Logica di caricamento specifica per vista
    if (viewName === "feed") {
      refreshData();
    } else if (viewName === "create") {
      initCreationMap();
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
    toastEl.className = ""; // Reset
    toastEl.classList.add("show", type);

    // Icona corrispondente
    const icon = toastEl.querySelector("i");
    if (type === "success") {
      icon.className = "fas fa-check-circle";
    } else {
      icon.className = "fas fa-exclamation-circle";
    }

    setTimeout(() => {
      toastEl.classList.remove("show");
    }, 3500);
  }

  // === DATI E RENDERING ===
  function refreshData() {
    window.AppDB.getItineraries(function(err, list) {
      if (err) {
        showToast("Errore nel caricamento degli itinerari", "error");
        return;
      }
      allItineraries = list;
      renderItineraries();
    });
  }

  function renderItineraries() {
    itineraryGrid.innerHTML = "";
    
    const searchText = searchInput.value.toLowerCase().trim();
    
    const filteredList = allItineraries.filter(item => {
      // Filtro Mezzo
      if (activeTransportFilter !== "all" && item.mezzo.toLowerCase() !== activeTransportFilter) {
        return false;
      }
      // Filtro Ricerca testo
      if (searchText !== "") {
        const inTitle = item.title.toLowerCase().includes(searchText);
        const inDesc = item.description.toLowerCase().includes(searchText);
        const inMezzo = item.mezzo.toLowerCase().includes(searchText);
        const inRoute = item.route.some(pt => pt.label.toLowerCase().includes(searchText));
        return inTitle || inDesc || inMezzo || inRoute;
      }
      return true;
    });

    if (filteredList.length === 0) {
      itineraryGrid.innerHTML = `
        <div class="route-placeholder" style="grid-column: 1 / -1; padding: 60px 0;">
          <i class="fas fa-route" style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
          <p>Nessun itinerario trovato. Prova a cambiare filtro o creane uno tu!</p>
        </div>
      `;
      return;
    }

    filteredList.forEach(item => {
      const card = createItineraryCard(item);
      itineraryGrid.appendChild(card);
    });
  }

  function createItineraryCard(item, isProfileView = false) {
    const card = document.createElement("div");
    card.className = "itinerary-card";
    
    // Foto di copertina
    const photoUrl = item.photo || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80";
    
    // Icona mezzo
    let mezzoIcon = "fa-car";
    const mezzo = item.mezzo.toLowerCase();
    if (mezzo === "aereo") mezzoIcon = "fa-plane";
    else if (mezzo === "treno") mezzoIcon = "fa-train";
    else if (mezzo === "autobus") mezzoIcon = "fa-bus";
    else if (mezzo === "bicicletta") mezzoIcon = "fa-bicycle";
    else if (mezzo === "piedi") mezzoIcon = "fa-walking";
    else if (mezzo === "moto") mezzoIcon = "fa-motorcycle";

    // Controlla se l'utente possiede la card per permettere l'eliminazione
    const currentUser = window.AppDB.getCurrentUser();
    const canDelete = currentUser && item.user && item.user.uid === currentUser.uid;

    let deleteButtonHtml = "";
    if (canDelete) {
      deleteButtonHtml = `
        <button class="card-action-btn delete" title="Elimina Itinerario" data-id="${item.id}">
          <i class="fas fa-trash"></i>
        </button>
      `;
    }

    card.innerHTML = `
      <div class="card-image-wrapper">
        <img src="${photoUrl}" alt="${item.title}" loading="lazy">
        <div class="card-actions-overlay">
          ${deleteButtonHtml}
        </div>
        <div class="card-badges">
          <span class="badge-mezzo ${mezzo}">
            <i class="fas ${mezzoIcon}"></i> ${item.mezzo}
          </span>
          <span class="badge-costo">${item.costo} ${item.valuta || 'EUR'}</span>
        </div>
      </div>
      <div class="card-content">
        <div class="card-user-info">
          <img src="${item.user.photoURL}" alt="${item.user.displayName}" class="card-user-avatar">
          <span class="card-user-name">${item.user.displayName}</span>
        </div>
        <h3 class="card-title">${item.title}</h3>
        <p class="card-desc">${item.description}</p>
        <div class="card-footer">
          <div class="card-stats">
            <span class="card-stat" title="Durata"><i class="far fa-calendar-alt"></i> ${item.durata} gg</span>
            <span class="card-stat" title="Tappe"><i class="fas fa-map-marker-alt"></i> ${item.route ? item.route.length : 0} tappe</span>
          </div>
          <button class="card-btn-detail" data-id="${item.id}">
            Dettagli <i class="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>
    `;

    // Click sui Dettagli
    card.querySelector(".card-btn-detail").addEventListener("click", () => openDetailsModal(item));

    // Click per eliminare
    if (canDelete) {
      card.querySelector(".card-action-btn.delete").addEventListener("click", function(e) {
        e.stopPropagation();
        if (confirm("Sei sicuro di voler eliminare questo itinerario?")) {
          window.AppDB.deleteItinerary(item.id, function(err) {
            if (err) {
              showToast("Errore durante l'eliminazione", "error");
            } else {
              showToast("Itinerario eliminato con successo", "success");
              refreshData();
              if (currentActiveView === "profile") {
                renderProfilePage();
              }
            }
          });
        }
      });
    }

    return card;
  }

  // === RENDERING PROFILO ===
  function renderProfilePage() {
    const currentUser = window.AppDB.getCurrentUser();
    if (!currentUser) return;

    // Imposta info utente
    profileAvatar.src = currentUser.photoURL;
    profileName.innerText = currentUser.displayName;
    profileEmail.innerText = currentUser.email;

    // Filtra itinerari dell'utente corrente
    const myItineraries = allItineraries.filter(item => item.user && item.user.uid === currentUser.uid);

    // Calcola statistiche
    const totalTrips = myItineraries.length;
    let totalCost = 0;
    let totalDays = 0;

    myItineraries.forEach(item => {
      totalCost += parseFloat(item.costo) || 0;
      totalDays += parseInt(item.durata) || 0;
    });

    statTrips.innerText = totalTrips;
    statCost.innerText = totalCost + " €";
    statDays.innerText = totalDays;

    // Renderizza la griglia
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

  // === MAPPA DI CREAZIONE (LEAFLET) ===
  function initCreationMap() {
    // Se la mappa è già stata creata, esci, altrimenti creala
    if (createMap) {
      setTimeout(() => createMap.invalidateSize(), 100);
      return;
    }

    // Inizializza mappa centrata in Italia
    createMap = L.map("create-map-container").setView([41.9028, 12.4964], 6);

    // Carica i tasselli stradali CartoDB Dark Matter (per mantenere il tema scuro premium!)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(createMap);

    // Evento Click sulla mappa per aggiungere checkpoint
    createMap.on("click", function(e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      
      // Prova a recuperare il nome del luogo tramite Reverse Geocoding gratuito
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12`, {
        headers: { "Accept-Language": "it" }
      })
      .then(res => res.json())
      .then(data => {
        let label = "Tappa su mappa";
        if (data && data.display_name) {
          // Ricava un nome corto (es. città o frazione)
          const address = data.address;
          label = address.city || address.town || address.village || address.suburb || address.county || "Tappa " + (createRoutePoints.length + 1);
        }
        addRoutePoint(lat, lng, label);
      })
      .catch(() => {
        addRoutePoint(lat, lng, "Tappa " + (createRoutePoints.length + 1));
      });
    });
  }

  // Cerca un indirizzo tramite Nominatim Geocoder API
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
        
        // Centra la mappa
        createMap.setView([lat, lng], 12);
        
        // Chiede all'utente se vuole inserire la tappa
        const label = place.display_name.split(',')[0];
        addRoutePoint(lat, lng, label);
        mapSearchInput.value = "";
      } else {
        showToast("Nessun luogo trovato con questo nome", "error");
      }
    })
    .catch(err => {
      mapSearchBtn.innerHTML = "Cerca";
      showToast("Errore durante la ricerca del luogo", "error");
    });
  }

  // Aggiunge un punto al percorso
  function addRoutePoint(lat, lng, label) {
    const point = { lat, lng, label };
    createRoutePoints.push(point);
    
    // Crea marker con numero
    const num = createRoutePoints.length;
    const customIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `<div style="background-color:#3b82f6;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:11px;border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.5)">${num}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(createMap)
      .bindPopup(`<b>Tappa ${num}:</b> ${label}`);
    
    createMapMarkers.push(marker);

    // Disegna la polilinea
    drawRoutePolyline();
    
    // Aggiorna l'interfaccia della lista tappe
    renderRouteList();
  }

  function drawRoutePolyline() {
    // Rimuovi polilinea precedente
    if (createMapPolyline) {
      createMap.removeLayer(createMapPolyline);
    }

    if (createRoutePoints.length < 2) return;

    const latlngs = createRoutePoints.map(p => [p.lat, p.lng]);
    
    // Crea linea sfumata blu/teal
    createMapPolyline = L.polyline(latlngs, {
      color: '#3b82f6',
      weight: 4,
      opacity: 0.8,
      dashArray: '8, 8',
      lineJoin: 'round'
    }).addTo(createMap);
  }

  function renderRouteList() {
    routeItemsList.innerHTML = "";
    
    if (createRoutePoints.length === 0) {
      routePlaceholder.style.display = "block";
      return;
    }

    routePlaceholder.style.display = "none";

    createRoutePoints.forEach((point, index) => {
      const item = document.createElement("div");
      item.className = "route-item";
      item.innerHTML = `
        <div class="route-item-details">
          <div class="route-item-number">${index + 1}</div>
          <span class="route-item-name" title="${point.label}">${point.label}</span>
        </div>
        <button type="button" class="route-item-remove" data-index="${index}" title="Rimuovi tappa">
          <i class="fas fa-times-circle"></i>
        </button>
      `;

      item.querySelector(".route-item-remove").addEventListener("click", function(e) {
        e.stopPropagation();
        removeRoutePoint(index);
      });

      routeItemsList.appendChild(item);
    });
  }

  function removeRoutePoint(index) {
    // Rimuovi il marker dalla mappa
    createMap.removeLayer(createMapMarkers[index]);
    createMapMarkers.splice(index, 1);
    
    // Rimuovi il punto dati
    createRoutePoints.splice(index, 1);

    // Aggiorna la numerazione dei marker rimanenti
    createMapMarkers.forEach((marker, idx) => {
      const num = idx + 1;
      const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="background-color:#3b82f6;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:11px;border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.5)">${num}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      marker.setIcon(customIcon);
      marker.bindPopup(`<b>Tappa ${num}:</b> ${createRoutePoints[idx].label}`);
    });

    // Ridisegna polilinea
    drawRoutePolyline();
    
    // Aggiorna lista in HTML
    renderRouteList();
  }

  // === SALVATAGGIO ITINERARIO ===
  function saveItinerary() {
    const title = document.getElementById("itinerary-title").value.trim();
    const description = document.getElementById("itinerary-desc").value.trim();
    const mezzo = selectedTransportInput.value;
    const costo = parseFloat(document.getElementById("itinerary-cost").value);
    const valuta = document.getElementById("itinerary-currency").value;
    const durata = parseInt(document.getElementById("itinerary-duration").value);
    const data = document.getElementById("itinerary-date").value;

    if (!title || !description || !mezzo || isNaN(costo) || isNaN(durata) || !data) {
      showToast("Compila tutti i campi richiesti!", "error");
      return;
    }

    if (createRoutePoints.length === 0) {
      showToast("Aggiungi almeno una tappa sulla mappa!", "error");
      return;
    }

    // Preparazione dati
    const itineraryData = {
      title,
      description,
      mezzo,
      costo,
      valuta,
      durata,
      data,
      photo: uploadedPhotoBase64 || "", // Se vuota, metteremo un default nel rendering
      route: createRoutePoints
    };

    // Mostra caricamento sul pulsante
    const submitBtn = createForm.querySelector("button[type='submit']");
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Salvataggio...";

    window.AppDB.addItinerary(itineraryData, function(err, result) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;

      if (err) {
        showToast("Errore durante il salvataggio: " + err.message, "error");
      } else {
        showToast("Itinerario condiviso con successo!", "success");
        resetCreateForm();
        refreshData();
        switchView("feed");
      }
    });
  }

  function resetCreateForm() {
    createForm.reset();
    
    // Resetta mezzo selezionato
    transportOptions.forEach(o => o.classList.remove("selected"));
    selectedTransportInput.value = "";
    
    // Resetta foto
    uploadedPhotoBase64 = null;
    filePreviewContainer.style.display = "none";
    document.querySelector(".photo-upload-zone p").innerText = "Trascina una foto o clicca per caricare";
    
    // Resetta mappa
    createMapMarkers.forEach(m => createMap.removeLayer(m));
    createMapMarkers = [];
    if (createMapPolyline) {
      createMap.removeLayer(createMapPolyline);
      createMapPolyline = null;
    }
    createRoutePoints = [];
    renderRouteList();
  }

  // === MODALE DETTAGLI (ZOOM DIALOG) ===
  function openDetailsModal(item) {
    detailsModal.classList.add("active");

    // Copertina
    const photoUrl = item.photo || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80";
    document.getElementById("modal-img").src = photoUrl;

    // Info Utente Autore
    document.getElementById("modal-user-avatar").src = item.user.photoURL;
    document.getElementById("modal-user-name").innerText = item.user.displayName;

    // Dettagli Generali
    document.getElementById("modal-title").innerText = item.title;
    document.getElementById("modal-desc").innerText = item.description;

    // Info Bar
    document.getElementById("modal-val-costo").innerText = `${item.costo} ${item.valuta || 'EUR'}`;
    document.getElementById("modal-val-mezzo").innerText = item.mezzo;
    document.getElementById("modal-val-durata").innerText = `${item.durata} gg`;
    document.getElementById("modal-val-data").innerText = new Date(item.data).toLocaleDateString('it-IT');

    // Inizializza Mappa del Modale
    setTimeout(() => {
      initModalMap(item.route);
    }, 200);
  }

  function initModalMap(routePoints) {
    // Rimuovi mappa precedente se esiste
    if (modalMap) {
      modalMap.remove();
      modalMap = null;
    }

    if (!routePoints || routePoints.length === 0) {
      document.getElementById("modal-map-container").style.display = "none";
      return;
    }

    document.getElementById("modal-map-container").style.display = "block";

    // Inizializza la mappa sulla prima tappa
    const firstPoint = routePoints[0];
    modalMap = L.map("modal-map-container").setView([firstPoint.lat, firstPoint.lng], 8);

    // Carica mappa stradale scura
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(modalMap);

    modalMapMarkers = [];
    const latlngs = [];

    // Aggiungi marker per ogni tappa
    routePoints.forEach((point, index) => {
      const num = index + 1;
      latlngs.push([point.lat, point.lng]);

      const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="background-color:#10b981;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:11px;border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.5)">${num}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([point.lat, point.lng], { icon: customIcon }).addTo(modalMap)
        .bindPopup(`<b>Tappa ${num}:</b> ${point.label}`);
      
      modalMapMarkers.push(marker);
    });

    // Disegna polilinea
    if (routePoints.length >= 2) {
      modalMapPolyline = L.polyline(latlngs, {
        color: '#10b981',
        weight: 4,
        opacity: 0.8,
        dashArray: '8, 8',
        lineJoin: 'round'
      }).addTo(modalMap);

      // Centra e zoomma la mappa per inquadrare tutte le tappe
      const group = new L.featureGroup(modalMapMarkers);
      modalMap.fitBounds(group.getBounds().pad(0.15));
    } else {
      modalMap.setView([firstPoint.lat, firstPoint.lng], 12);
    }

    // Invalida la dimensione per correggere problemi di caricamento di Leaflet in div nascosti
    setTimeout(() => {
      modalMap.invalidateSize();
    }, 150);
  }
})();
