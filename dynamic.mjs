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

fetch('./Data source/geom/metropole-de-lyon_com_donnees_communales.secteurbureauvote.json')
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

fetch('./Data finale/geom/metropole-de-lyon_adr_voie_lieu.adrcommunes_2024.json')
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
  fetch("./Data finale/legis2024_premiertour-resultats-definitifs-burvotes-metrop-lyon.json")
      .then(r => r.json()),

  fetch("./Data finale/europ2024_premiertour-resultats-definitifs-burvotes-metrop-lyon.json")
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
  return [...new Set(data.map(d => d["Nuance liste"]))];
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

  'LCOM': "Liste Parti communiste français", 
  'LDIV': "Liste Divers", 
  'LDVD': "Liste divers droite",
  'LDVG': "Liste divers gauche",
  'LECO': "Liste Écologiste",
  'LENS': "Liste Ensemble",
  'LEXD': "Liste d'extrême droite",
  'LEXG': "Liste d'extrême gauche",
  'LFI' : "Liste La France insoumise",
  'LLR': "Liste Les Républicains",
  'LREC': "Liste Reconquête", 
  'LRN': "Liste Rassemblement National",
  'LUG': "Liste d'union de la gauche",
  'LVEC': "Liste Europe écologie les Verts"
}
    
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

  const nuances = getNuancesFromData(data);

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
    opt.textContent = NomCompletNuances[n];
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
  if (election === "europeennes24") label = "Nuance liste";

  if (!burvotesLayer || !data) return;

  const values = {};

  if (nuance === "Abstention") {
    data.forEach(d => {
      let pct = d["% Abstentions"]
                  .replace(",", ".")
                  .replace("%", "");
      values[d["Code BV"]] = parseFloat(pct);
    });
  } else {
    data
      .filter(d => d[label] === nuance)
      .forEach(d => {
        let pct = d["% Voix/exprimés"]
                    .replace(",", ".")
                    .replace("%", "");
        values[d["Code BV"]] = parseFloat(pct);
      });
  }

  // Palettes par parti politique

  const palettes = {
    "EXG": ["#990000", "#d7301f", "#ef6548", "#fc9272"],
    "UXD": ["#08306b", "#2171b5", "#4292c6", "#6baed6"],
    "ECO": ["#00441b", "#006d2c", "#238b45", "#41ae76"],
    "DIV": ["#93441A", "#B67332", "#DAAB3A", "#e5e7e6"],
    "UDI": ["#8A0D1E", "#DE2E4B", "#F36D8F", "#F59FBD"],
    "REC": ["#08306b", "#2171b5", "#4292c6", "#6baed6"],
    "ENS":  ["#E87659", "#F5A86B", "#FACA15", "#fdde6fff"],
    "RN":   ["#08306b", "#2171b5", "#4292c6", "#6baed6"],
    "UG":   ["#54278f", "#756bb1", "#9e9ac8", "#cbc9e2"],
    "LR":   ["#08589e", "#2b8cbe", "#4eb3d3", "#7bccc4"], 
    "DVG":  ["#990000", "#d7301f", "#ef6548", "#fc9272"], 
    "DVC":  ["#F0604D", "#F38071", "#F79F95", "#FBBFB8"],
    "DVD":  ["#08306b", "#2171b5", "#4292c6", "#6baed6"],
    "Abstention": ["#2E3244", "#5D6371", "#9297a3ff", "#C5C6C6"],

    'LCOM': ["#990000", "#d7301f", "#ef6548", "#fc9272"],
    'LDIV': ["#93441A", "#B67332", "#DAAB3A", "#e5e7e6"],
    'LDVD': ["#08306b", "#2171b5", "#4292c6", "#6baed6"],
    'LDVG': ["#990000", "#d7301f", "#ef6548", "#fc9272"],
    'LECO': ["#00441b", "#006d2c", "#238b45", "#41ae76"],
    'LENS': ["#E87659", "#F5A86B", "#FACA15", "#fdde6fff"],
    'LEXD': ["#08306b", "#2171b5", "#4292c6", "#6baed6"],
    'LEXG': ["#990000", "#d7301f", "#ef6548", "#fc9272"],
    'LFI' : ["#8A0D1E", "#DE2E4B", "#F36D8F", "#F59FBD"],
    'LLR': ["#08589e", "#2b8cbe", "#4eb3d3", "#7bccc4"], 
    'LREC': ["#08306b", "#2171b5", "#4292c6", "#6baed6"],
    'LRN': ["#08306b", "#2171b5", "#4292c6", "#6baed6"],
    'LUG': ["#54278f", "#756bb1", "#9e9ac8", "#cbc9e2"],
    'LVEC': ["#00441b", "#006d2c", "#238b45", "#41ae76"]
  };

  // échelle couleur
  function getColorForNuance(nuance, value) {
    const pal = palettes[nuance] || palettes["Abstention"];
  
    // On suppose value ∈ [0, 50]
    if (value > 50) return pal[0];
    if (value > 30) return pal[1];
    if (value > 15) return pal[2];
    return pal[3];
  }

  // mise à jour du style
  choroLayer.eachLayer(layer => {
    const codeBV = layer.feature.properties.numero;
    const commune = layer.feature.properties.commune;
    const val = values[codeBV];

    // palette
    let fill = (nuance === "Abstention")
      ? getColorForNuance("Abstention", val)   // couleur spéciale abstention
      : getColorForNuance(nuance, val);

    layer.setStyle({
      fillColor: fill,
      fillOpacity: val ? 0.6 : 0,
      color: "#333",
      weight: 1
    });

    layer.bindPopup(
      `<b>Commune :</b> ${commune}<br>
      <b>Bureau de vote :</b> ${codeBV}<br>
      ${nuance === "Abstention" ? "% Abstentions : " : "% voix/exprimés : "}
      <b>${val ? val + "%" : "N/A"}</b>`
    );
  });

  choroplethActive = true;

}