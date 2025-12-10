//Initialisation de la map
const zoomLevelInit = 13;
const View = {
  lat: 45.7615,
  long: 4.8316
};

var mymap = L.map('map').setView([View.lat, View.long],zoomLevelInit);

const mainLayer = L.tileLayer(
    'https://api.maptiler.com/maps/openstreetmap/{z}/{x}/{y}.jpg?key=aIxtIJ1Idwo78baByRQ0', 
    {
      attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
      minZoom: 10,
      maxZoom: 17,
      tileSize: 512,
      zoomOffset: -1,
      });

mainLayer.addTo(mymap);

// CRÉATION LÉGENDE
const legend = L.control({ position: "bottomright" });

legend.onAdd = function () {
    const div = L.DomUtil.create("div", "info legend");
    div.innerHTML = "<b>Légende</b><br>";
    return div;
  };

legend.addTo(mymap);

// Ordre d'affichage des couches
mymap.createPane("paneChoro");
mymap.getPane("paneChoro").style.zIndex = 200;

mymap.createPane("paneBurvote");
mymap.getPane("paneBurvote").style.zIndex = 400;

mymap.createPane("paneCommunes");
mymap.getPane("paneCommunes").style.zIndex = 600;

// GEOM BUREAUX DE VOTE

// Fonction de style des secteurs de bureau de vote
function styleBurvotes() {
  return {
    color: "#333",
    weight: 1,
    fillOpacity: 0
  };
}

let burvotesLayer;
let choroLayer = null;

fetch('./Data finale/geom/lyon_intramuros_com_donnees_communales.secteurbureauvote.geojson')
.then(response => response.json())
.then(data => {
   burvotesLayer = L.geoJSON(data, {
    pane: "paneBurvote",
    style: styleBurvotes,
    interactive:false
  }).addTo(mymap);

  // Choroplèthe (remplissage)
  choroLayer = L.geoJSON(data, {
    pane: "paneChoro",
    style: () => ({
      fillColor: "transparent",
      fillOpacity: 0,
      color: "transparent",
      weight: 0
    })
  }).addTo(mymap);
})
.catch(err => console.error("Erreur de chargement JSON :", err));

// GEOM COMMUNES

// Fonction de style selon la commune
function styleCommunes() {
  return {
    color: "#a70000ff",
    weight: 2,
    fillOpacity: 0
  };
}

let communesLayer;

fetch('./Data finale/geom/lyon_intramuros_adr_voie_lieu.adrcommunes_2024.geojson')
.then(response => response.json())
.then(data => {

  communesLayer = L.geoJSON(data, {
    pane: "paneCommunes",
    style: styleCommunes,
    interactive:false
  });

  communesLayer.addTo(mymap);
})
.catch(err => console.error("Erreur de chargement JSON :", err));

// CHOROPLETE RESULTATS ELECTORAUX

let votesDataLegis24 = null;
let votesDataEurop24 = null;
let choroplethActive = false;

// Chargement des données
Promise.all([
  fetch("./Data finale/legis2024_premiertour-resultats-definitifs-burvotes-lyon.json")
      .then(r => r.json()),

  fetch("./Data finale/europ2024_premiertour-resultats-definitifs-burvotes-lyon.json")
      .then(r => r.json())
]).then(([legisJson, europJson]) => {

    votesDataLegis24 = legisJson.data;
    votesDataEurop24 = europJson.data;

    if (!votesDataLegis24 || !votesDataEurop24) {
      console.error("ERREUR : json.data est manquant !");
      return;
    }

    // Maintenant, on peut initialiser le menu des nuances selon l’élection par défaut :
    updateNuancesMenu();
});

// Lecture de la valeur sélectionnée
function getSelectedElection() {
  return document.querySelector("input[name='election']:checked")?.value;
}

// Récupération de tous les partis politiques uniques dans une liste
function getNuancesFromData(data){
  const election = getSelectedElection();

  if (election === "legislatives24") {
  return [...new Set(data.map(d => d["Nuance candidat"]))];
}
  if (election === "europeennes24"){
  return [...new Set(data.map(d => d["Parti politique"]))];
}}

// source : https://www.archives-resultats-elections.interieur.gouv.fr/resultats/senatoriales-2020/nuances.php
const NomCompletNuances = {
  "EXG": "Extrême gauche",
  "UXD": "Union de l'extrême droite",
  "ECO": "Écologiste",
  "DIV": "Divers",
  "UDI": "Union des Démocrates et Indépendants",
  "REC": "Reconquête",
  "ENS":  "Ensemble",
  "RN":   "Rassemblement National",
  "UG":   "Nouveau Front populaire",
  "LR":   "Les Républicains", 
  "DVG":  "Divers Gauche", 
  "DVC":  "Divers Centre",
  "DVD":  "Divers Droite",

  'PCF': "Parti communiste français", 
  "Extrême-droite": "Extrême-droite",
  'Écologiste': "Écologiste",
  'LFI' : "La France insoumise",
  "EPR Modem": "EPR Modem",
  "PP PS": "Place Publique/Parti Socialiste"
};

let electionRadios = document.querySelectorAll("input[name='election']");

electionRadios.forEach(r => {
  r.addEventListener("change", updateNuancesMenu);
});

const selectNuance = document.getElementById("selectNuance");

function updateNuancesMenu() {
  const election = getSelectedElection();

  let data = null;

  if (election === "legislatives24") data = votesDataLegis24;
  if (election === "europeennes24") data = votesDataEurop24;

  if (!data) return;

  //ordre alphabétique des partis politiques
  const nuances = getNuancesFromData(data).sort((a, b) =>
    (NomCompletNuances[a] || a).localeCompare(NomCompletNuances[b] || b)
  );
  
  // On vide le menu nuance
  selectNuance.innerHTML = "";
  
  // Option vide
  const def = document.createElement("option");
  def.value = "";
  def.textContent = "-- Sélectionner une nuance --";
  selectNuance.appendChild(def);

  // Ajout des nuances
  nuances.forEach(n => {
    const opt = document.createElement("option");
    opt.value = n;
    opt.textContent = NomCompletNuances[n] || n;
    selectNuance.appendChild(opt);
  });

  // Ajouter l'option "Abstention"
  const optAbs = document.createElement("option");
  optAbs.value = "Abstention";
  optAbs.textContent = "Abstention";
  selectNuance.appendChild(optAbs);
}

selectNuance.addEventListener("change", () => {
  const nuance = selectNuance.value;
  const election = getSelectedElection();

  if (election === "legislatives24") {
    updateChoropleth(nuance, votesDataLegis24);
  } else if (election === "europeennes24") {
    updateChoropleth(nuance, votesDataEurop24);
  }
});

// Fonction choroplèthe dynamique
function updateChoropleth(nuance, data) {
  const election = getSelectedElection();

  let label = null;
  if (election === "legislatives24") label = "Nuance candidat";
  if (election === "europeennes24") label = "Parti politique";

  if (!burvotesLayer || !data) return;

  const values = {};

  if (nuance === "Abstention") {
    data.forEach(d => {
      let pct = ("" + d["% Abstentions"])
      .replace(",", ".")
      .replace("%", "");
      // values[d["Code BV"]] = parseFloat(pct);
      const key = d["Code commune"] + "_" + d["Code BV"];
      values[key] = parseFloat(pct);

    });
  } else {
    data
      .filter(d => d[label] === nuance)
      .forEach(d => {
        let pct = ("" + d["% Voix\/exprim\u00e9s"])
        .replace(",", ".")
        .replace("%", "");
        // values[d["Code BV"]] = parseFloat(pct);
        const key = d["Code commune"] + "_" + d["Code BV"];
        values[key] = parseFloat(pct);
      });
  }

  // Palettes par parti politique
  const palettes = {
    "EXG": ["#7F0000", "#990000", "#B2182B", "#D7301F", "#EF6548", "#FC8D59", "#FDBB84", "#FDD3B1", "#FEE8D8"],
    "UXD": ["#041F3D", "#08306B", "#0F4C8A", "#2171B5", "#3D8DC8", "#56A1D3", "#74B3DE", "#9CCBE8", "#C4E0F1"],
    "ECO": ["#002B13", "#00441B", "#005F24", "#006D2C", "#138B46", "#238B45", "#41AE76", "#6CC199", "#97D4BA"],
    "DIV": ["#6F3515", "#93441A", "#A85A22", "#B67332", "#C4893A", "#DAAB3A", "#E5C76B", "#EEE2A4", "#F6EFD0"],
    "UDI": ["#6B0917", "#8A0D1E", "#B81F32", "#DE2E4B", "#F36D8F", "#F59FBD", "#F7C8D7", "#FADBE6", "#FCECF3"],
    "REC": ["#041F3D", "#08306B", "#0F4C8A", "#2171B5", "#3D8DC8", "#56A1D3", "#74B3DE", "#9CCBE8", "#C4E0F1"],
    "ENS": ["#C45A45", "#E87659", "#EE8D64", "#F5A86B", "#F8BD72", "#FACA15", "#FDDC57", "#FDEB8A", "#FEF7C5"],
    "RN":  ["#041F3D", "#08306B", "#0F4C8A", "#2171B5", "#3D8DC8", "#56A1D3", "#74B3DE", "#9CCBE8", "#C4E0F1"],
    "UG":  ["#3D1E6B", "#54278F", "#6542A1", "#756BB1", "#897EC0", "#9E9AC8", "#BDB7DA", "#D7D1E6", "#ECE9F3"],
    "LR":  ["#064479", "#08589E", "#1A6EAD", "#2B8CBE", "#3FA6CA", "#4EB3D3", "#6CC7D8", "#93D9DD", "#BBE9E3"], 
    "DVG": ["#7F0000", "#990000", "#B2182B", "#D7301F", "#EF6548", "#FC8D59", "#FDBB84", "#FDD3B1", "#FEE8D8"], 
    "DVC": ["#C05A4A", "#F0604D", "#F07060", "#F38071", "#F59A84", "#F79F95", "#FBBFB8", "#FCD6CF", "#FEEAEA"],
    "DVD": ["#041F3D", "#08306B", "#0F4C8A", "#2171B5", "#3D8DC8", "#56A1D3", "#74B3DE", "#9CCBE8", "#C4E0F1"],
    "Abstention": ["#1F2231", "#2E3244", "#44485A", "#5D6371", "#767C88", "#9297A3", "#B3B5BB", "#D1D2D2", "#E8E9E9"],

    "PCF": ["#7F0000", "#990000", "#B2182B", "#D7301F", "#EF6548", "#FC8D59", "#FDBB84", "#FDD3B1", "#FEE8D8"],
    "Écologiste": ["#002B13", "#00441B", "#005F24", "#006D2C", "#138B46", "#238B45", "#41AE76", "#6CC199", "#97D4BA"],
    "EPR Modem": ["#C45A45", "#E87659", "#EE8D64", "#F5A86B", "#F8BD72", "#FACA15", "#FDDC57", "#FDEB8A", "#FEF7C5"],
    "PP PS":  ["#6B0917", "#8A0D1E", "#B81F32", "#DE2E4B", "#F36D8F", "#F59FBD", "#F7C8D7", "#FADBE6", "#FCECF3"],
    "LR":  ["#064479", "#08589E", "#1A6EAD", "#2B8CBE", "#3FA6CA", "#4EB3D3", "#6CC7D8", "#93D9DD", "#BBE9E3"], 
    "Extrême-droite":  ["#041F3D", "#08306B", "#0F4C8A", "#2171B5", "#3D8DC8", "#56A1D3", "#74B3DE", "#9CCBE8", "#C4E0F1"],
    "LFI":  ["#3D1E6B", "#54278F", "#6542A1", "#756BB1", "#897EC0", "#9E9AC8", "#BDB7DA", "#D7D1E6", "#ECE9F3"]
  };
  
  // échelle couleur
  function getColorForNuance(nuance, value) {
    const pal = palettes[nuance] || palettes["Abstention"];

    if (value > 70) return pal[0];
    else if (value > 50) return pal[1];
    else if (value > 40) return pal[2];
    else if (value > 30) return pal[3];
    else if (value > 20) return pal[4];
    else if (value > 15) return pal[5];
    else if (value > 10) return pal[6];
    else if (value > 5) return pal[7];
    else return pal[8];
  };

  function updateLegend(nuance) {
    if (!nuance) {
      legend.getContainer().innerHTML = "<b>Aucune nuance sélectionnée</b>";
      return;
    }
  
    const pal = palettes[nuance] || palettes["Abstention"];
  
    const grades = [
      "> 70 %",
      "50 – 70 %",
      "40 – 50 %",
      "30 – 40 %",
      "20 – 30 %",
      "15 – 20 %",
      "10 – 15 %",
      "5 – 10 %",
      "0 – 5 %"
    ];
  
    let html = "<b>" + (NomCompletNuances[nuance] || nuance) + "</b><br>";
  
    for (let i = 0; i < pal.length; i++) {
      html += `
        <div class="legend-line">
          <i style="background:${pal[i]}"></i>
          <span>${grades[i]}</span>
        </div>
      `;
    }
  
    legend.getContainer().innerHTML = html;
  };

  updateLegend(nuance);

  // mise à jour du style
  choroLayer.eachLayer(layer => {
    const commune = layer.feature.properties.commune;
    const insee = layer.feature.properties.insee;
    const numero = layer.feature.properties.numero;
    
    const key = insee + "_" + numero;
    const val = values[key];


    // palette
    let fill = (nuance === "Abstention")
      ? getColorForNuance("Abstention", val)   // couleur spéciale abstention
      : getColorForNuance(nuance, val);

    layer.setStyle({
      fillColor: fill,
      fillOpacity: (val !== undefined && val !== null) ? 0.6 : 0,
      color: "#333",
      weight: 1
    });

    layer.bindPopup(
      `<b>Commune :</b> ${commune}<br>
      <b>Bureau de vote :</b> ${numero}<br>
      <b> ${nuance === "Abstention" ? "Abstentions : " : "Voix/exprimés : "}</b>
      <b>${val ? val + "%" : "No data"}</b>`
    );
  });

  choroplethActive = true;

}