import * as L from 'leaflet'
import * as LeafletElevation from './leaflet-elevation'
import * as PolylineEncoded from 'polyline-encoded'

const mapBoxUrl = 'https://api.mapbox.com/styles/v1/mapbox/{id}/tiles/{z}/{x}/{y}?access_token=' + config.token;
const mapInitCoordinates = [47.02167640440166, 8.653083890676498];

console.log('test');

const startIcon = L.divIcon({ className: 'start_icon' });
const finishIcon = L.divIcon({ className: 'finish_icon' });

const colNormalColor = '#0026af';
const colHoverColor = '#008aff';
const selectedListItemClass = 'selected';
const startMarkerTitle = 'Start';
const finishMarkerTitle = 'Finish';

const streets = L.tileLayer(mapBoxUrl, { id: 'streets-v11', tileSize: 512, zoomOffset: -1 });
const outdoors = L.tileLayer(mapBoxUrl, { id: 'outdoors-v9', tileSize: 512, zoomOffset: -1 });
const satellite = L.tileLayer(mapBoxUrl, { id: 'satellite-streets-v11', tileSize: 512, zoomOffset: -1 });
// https://docs.mapbox.com/api/maps/#styles

const baseMaps = {
    "Outdoors": outdoors,
    "Streets": streets,
    "Satellite": satellite
};

const credits = '<a href="https://github.com/Raruto/leaflet-elevation">Leaflet Elevation</a> | © <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>';

const list_items = document.getElementsByClassName('list_item');
const infos = document.getElementById('infos');
const colsList = document.getElementById('list');
const toggleListTrigger = document.getElementById('toggle_list_trigger');
const search_input = document.getElementById('search_input');

let cols = {};
let map = {};
let selectedCol;
let isSelectedCol = false;
let hoveredCol;
let colsL = [];
let controlElevation;

function generateMiddleLatLng() {
    cols = cols.map((col) => {

        let midLat = (col.start_latlng[0] + col.end_latlng[0]) / 2;
        let midLng = (col.start_latlng[1] + col.end_latlng[1]) / 2;

        col.mid_latlng = [midLat, midLng]

        return col;
    });
}

function setColOpacity(col, opacityLevel) {
    col.setStyle({
        opacity: opacityLevel
    });
    col.startMarker.setOpacity(opacityLevel);
    col.finishMarker.setOpacity(opacityLevel);
}

function setupMap() {
    map = L.map('map', {
        attributionControl: false,
        layers: [streets]
    }).setView(mapInitCoordinates, 9);

    L.control.layers(baseMaps).addTo(map);

    var creditsOnMap = L.control.attribution().addTo(map);
    creditsOnMap.addAttribution(credits);
    map.zoomControl.setPosition('bottomright');

    controlElevation = L.control.elevation(
        {
            elevationDiv: "#elevation-div",
            useLeafletMarker: false,
            followMarker: false,
            reverseCoords: true,
            theme: "lime-theme"
        }
    );
    controlElevation.initCustom(map);

}

function applyPathsOnMap(col) {
    let coordinates = L.Polyline.fromEncoded(col.encoded).getLatLngs();

    let colPolyline = L.polyline(
        coordinates,
        {
            color: colNormalColor,
            weight: 4,
            opacity: .7,
            lineJoin: 'round'
        }
    ).addTo(map).bindPopup(col.name, { autoPan: false }).on('click', function () { console.log('col', col.name); });

    let startMarker = L.marker([col.start_latlng[0], col.start_latlng[1]], {
        icon: startIcon,
        title: startMarkerTitle
    }).addTo(map);
    let finishMarker = L.marker([col.end_latlng[0], col.end_latlng[1]], {
        icon: finishIcon,
        title: finishMarkerTitle
    }).addTo(map);

    colPolyline.name = col.name;
    colPolyline.startMarker = startMarker;
    colPolyline.finishMarker = finishMarker;

    colsL.push(colPolyline);
}

function addColsToList(col) {

    let colsListItem = '<li>';
    colsListItem += '<a href="#' + col.name.replace(/ /g, '_').toLowerCase() + '" ';
    colsListItem += 'class="list_item" ';
    colsListItem += 'data-name="' + col.name + '" ';
    colsListItem += 'data-lat="' + col.mid_latlng[0] + '" ';
    colsListItem += 'data-long="' + col.mid_latlng[1] + '">';
    colsListItem += col.name;
    colsListItem += '</a>';
    colsListItem += '</li>';

    colsList.innerHTML += colsListItem;
}

function addEventsOnList() {
    Array.from(list_items).forEach(function (list_item) {
        list_item.addEventListener('click', zoomTo);
        list_item.addEventListener('mouseenter', mouseenterCol);
        list_item.addEventListener('mouseleave', mouseleaveCol);
    });
}

const generateApp = async () => {

    const response = await fetch('data/cols.json');
    cols = await response.json();

    generateMiddleLatLng()

    setupMap();

    for (let col of cols) {
        addColsToList(col);
        applyPathsOnMap(col);
    }

    addEventToMap();
    addEventsOnList();
    addEventToInfos();
    setupSearch();
}

function addEventToInfos() {
    toggle_list_trigger.addEventListener('click', function () {
        infos.classList.toggle('hidden');
    });
}

function removeSelectedState() {
    Array.from(list_items).forEach(function (list_item) {
        list_item.parentElement.classList.remove(selectedListItemClass);
    });
}

function passHover(col, color) {
    let colName = col.getAttribute('data-name');
    hoveredCol = colsL.find((colL) => colL.name === colName);
    hoveredCol.setStyle({
        color: color,
        opacity: 1
    })
}

function mouseenterCol() {
    passHover(this, colHoverColor);
}

function mouseleaveCol() {
    passHover(this, colNormalColor);
}

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

function zoomTo(e, l) {
    let colLat = this.getAttribute('data-lat');
    let colLong = this.getAttribute('data-long');
    let colName = this.getAttribute('data-name');
    selectedCol = colsL.find((colL) => colL.name === colName);

    removeSelectedState();

    this.parentElement.classList.add(selectedListItemClass);

    isSelectedCol = false;

    setView(colLat, colLong, colName);
    selectedCol.openPopup();

    let fileName = selectedCol.name.toLowerCase().replace(/ /g, "_").replace(/ü/g, "u").replace(/\./g, "");
    fetch('data/coords/' + fileName + '.json').then(function (res) {
        return res.json();
    }).then(function (data) {

        let obj = {
            "name": "demo.geojson",
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": data
                    },
                    "properties": null
                }]
        }

        controlElevation.loadDataCustom(obj, map);
    });
}

function setView(lat, lng) {
    map.setView(new L.LatLng(lat, lng), 12, { animate: true });
}

function addEventToMap() {
    map.on('moveend click', function (e) {

        if (isSelectedCol) {
            console.log('drag zoom');
            for (var colL of colsL) {
                setColOpacity(colL, 1);
            }

            isSelectedCol = false;
            selectedCol = undefined;

            removeSelectedState();
        }

        if (typeof selectedCol !== 'undefined') {

            for (var colL of colsL) {
                if (colL !== selectedCol) {
                    setColOpacity(colL, 0.4);
                } else {
                    setColOpacity(colL, 1);
                }
            }

            isSelectedCol = true;
        }
    })
}

function setupSearch() {
    search_input.addEventListener('keyup', function (e) {

        let searchText = this.value.toLowerCase();
        let results = cols.filter(object => {

            let isResultsName = object.name.toLowerCase().indexOf(searchText) !== -1;

            return isResultsName;

        });

        Array.from(list_items).forEach(function (list_item) {

            let list_items_results = results.find(r => {
                return r.name === list_item.getAttribute("data-name");
            })

            let updateListItem = (list_items_results) ? 'remove' : 'add';
            list_item.parentElement.classList[updateListItem]('hidden');
        });
    });
}

generateApp();