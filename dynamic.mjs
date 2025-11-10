import { mycircosgeom, listecandidats } from './geojson.mjs';

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

// --- Étape 1 : Regrouper les candidats par circonscription ---
function groupCandidatsByCirco(liste) {
  const grouped = {};

  const codes = liste["Code de la circonscription métropole"];
  const noms = liste["Nom"];
  const prenoms = liste["Prénom"];
  const nPan = liste["N.Pan."];

  Object.keys(codes).forEach((key) => {
    const circo = codes[key];
    if (!grouped[circo]) grouped[circo] = [];
    grouped[circo].push({
      "N° Pan.": nPan[key],
      "Nom": noms[key],
      "Prénom": prenoms[key]
    });
  });

  return grouped;
}

const candidatsParCirco = groupCandidatsByCirco(listecandidats);

// --- Étape 2 : Couleur par parti ---
function getColorByListe(listeNom) {
  if (!listeNom) return "#aaaaaa";
  const liste = listeNom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const couleurs = {
    "c'est la gauche unie": "#ff0000",
    "ensemble, avant tout !": "#0055ff",
    "la metropole du bon sens": "#ffa500",
    "lyon en commun - metropole": "#00aa00",
    "maintenant la metropole pour nous les ecologistes avec bruno bernard": "#00cc00",
    "pour une metropole juste": "#ff6600",
    "pour une metropole juste - val de saone": "#ff6600",
    "uciv metropole": "#8888ff",
    "un temps d'avance avec gerard collomb": "#4444ff",
    "villeurbanne c'est vous !": "#9933ff"
  };

  return couleurs[liste] || "#aaaaaa";
}

// --- Étape 3 : Couche Leaflet combinée ---
function addCircoLayer(map) {
  const geoLayer = L.geoJSON(mycircosgeom, {
    onEachFeature: function (feature, layer) {
      const props = feature.properties;
      const circoCode = props["Code de la circonscription métropole"];
      const circoName = props["Libellé de la circonscription métropole"];
      const firstListe = props["First_Liste"];
      const candidats = candidatsParCirco[circoCode] || [];

      // Construire le contenu de la popup
      let popupContent = `
        <b>${circoName}</b><br>
        Liste en tête : <b>${firstListe}</b><br><br>
        <u>Candidats :</u><br>
        <table border="1" style="border-collapse:collapse;font-size:12px;">
        <tr><th>N°</th><th>Nom</th><th>Prénom</th></tr>
      `;

      for (const c of candidats) {
        popupContent += `<tr><td>${c["N° Pan."]}</td><td>${c["Nom"]}</td><td>${c["Prénom"]}</td></tr>`;
      }

      popupContent += `</table>`;

      layer.bindPopup(popupContent);
    },
    style: function (feature) {
      const couleur = getColorByListe(feature.properties["First_Liste"]);
      return {
        color: couleur,
        weight: 2,
        fillOpacity: 0.5
      };
    }
  });

  geoLayer.addTo(map);
}

// --- Étape 4 : Lancer ---
addCircoLayer(mymap);
