import * as L from 'leaflet'
import elevationModule from './leaflet-elevation'
import * as PolylineEncoded from 'polyline-encoded'

PolylineEncoded

declare module 'leaflet' {
    namespace control {
        function elevation(options?: any): void
    }

    namespace Polyline {
        function fromEncoded(encoded: string, options?: any): L.Polyline;
    }

    export interface Polyline {
        name: string
        startMarker: L.Marker
        finishMarker: L.Marker
        mid_latlng: Array<number>
        start_latlng: L.LatLngTuple
        end_latlng: L.LatLngTuple
        encoded: string
    }
}

const token = process.env.TOKEN;
L.control.elevation = elevationModule

const mapBoxUrl = 'https://api.mapbox.com/styles/v1/mapbox/{id}/tiles/{z}/{x}/{y}?access_token=' + token;
const mapInitCoordinates: L.LatLngTuple = [47.02167640440166, 8.653083890676498];

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

let cols: Array<L.Polyline> = [];
let map: L.Map;
let selectedCol: L.Polyline;
let isSelectedCol: boolean = false;
let hoveredCol: L.Polyline;
let colsL: Array<L.Polyline> = [];
let controlElevation: any;

function generateMiddleLatLng() {
    cols = cols.map((col: L.Polyline) => {

        let midLat = (col.start_latlng[0] + col.end_latlng[0]) / 2;
        let midLng = (col.start_latlng[1] + col.end_latlng[1]) / 2;

        col.mid_latlng = [midLat, midLng]

        return col;
    });
}

function setColOpacity(col: L.Polyline, opacityLevel: number) {
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

function applyPathsOnMap(col: L.Polyline) {

    let coordinates: any = L.Polyline.fromEncoded(col.encoded).getLatLngs();

    let colPolyline: L.Polyline = L.polyline(
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

function addColsToList(col: L.Polyline) {

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
    Array.from(list_items).forEach(function (list_item: HTMLElement) {
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
    toggleListTrigger.addEventListener('click', function () {
        infos.classList.toggle('hidden');
    });
}

function removeSelectedState() {
    Array.from(list_items).forEach(function (list_item) {
        list_item.parentElement.classList.remove(selectedListItemClass);
    });
}

function passHover(col: Element, color: string) {

    let colName = col.getAttribute('data-name');
    hoveredCol = colsL.find((colL: L.Polyline) => colL.name === colName);
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

function getRandomArbitrary(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

interface Obj {
    "name": string,
    "type": string,
    "features": [
        {
            "type": string,
            "geometry": {
                "type": string,
                "coordinates": string[]
            },
            "properties": null
        }]
}

function zoomTo() {
    let colLat = this.getAttribute('data-lat');
    let colLong = this.getAttribute('data-long');
    let colName = this.getAttribute('data-name');
    selectedCol = colsL.find((colL: L.Polyline) => colL.name === colName);
    removeSelectedState();

    this.parentElement.classList.add(selectedListItemClass);

    isSelectedCol = false;

    setView(colLat, colLong);
    selectedCol.openPopup();

    let fileName = selectedCol.name.toLowerCase().replace(/ /g, "_").replace(/ü/g, "u").replace(/\./g, "");
    fetch('data/coords/' + fileName + '.json').then(function (res) {
        return res.json();
    }).then(function (data) {

        let obj: Obj = {
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

function setView(lat: number, lng: number) {
    map.setView(new L.LatLng(lat, lng), 12, { animate: true });
}

function addEventToMap() {
    map.on('moveend click', function () {

        if (isSelectedCol) {
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
    search_input.addEventListener('keyup', function () {

        const inputElement: HTMLInputElement = this as HTMLInputElement
        const inputValue: string = inputElement.value

        let searchText: string = inputValue.toLowerCase();
        let results: Array<any> = cols.filter((object: L.Polyline) => {
            return object.name.toLowerCase().indexOf(searchText) !== -1;
        });

        Array.from(list_items).forEach(function (list_item: Element) {

            let list_items_results: Array<L.Polyline> = results.find((r: L.Polyline) => {
                return r.name === list_item.getAttribute("data-name");
            })

            if (list_items_results) {
                list_item.parentElement.classList.remove('hidden');
            }

            if (!list_items_results) {
                list_item.parentElement.classList.add('hidden');
            }
        });
    });
}

generateApp();