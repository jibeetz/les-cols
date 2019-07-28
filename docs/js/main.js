

let colsList = '';
let  selectedCol;
let isSelectedCol = false;
let hoveredCol;
let colsL = [];
let list = document.getElementById('list');
var mapBoxUrl = 'https://api.mapbox.com/styles/v1/mapbox/{id}/tiles/{z}/{x}/{y}?access_token=' + config.token;

var mapInitCoordinates = [47.02167640440166, 8.653083890676498];

var streets = L.tileLayer(mapBoxUrl, {id: 'streets-v11'});
var outdoors = L.tileLayer(mapBoxUrl, {id: 'outdoors-v9'});
var satellite = L.tileLayer(mapBoxUrl, {id: 'satellite-streets-v11'});
// https://docs.mapbox.com/api/maps/#styles

var startIcon = L.divIcon({className: 'start_icon'});
var finishIcon = L.divIcon({className: 'finish_icon'});

var baseMaps = {
    "Outdoors": outdoors,
    "Streets": streets,
    "Satellite": satellite
};

const credits = '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>';

let list_items = document.getElementsByClassName('list_item');

function generateMiddleLatLng() {
    data.cols = data.cols.map((col) => {

        let midLat = (col.start_latlng[0] + col.end_latlng[0]) / 2;
        let midLng = (col.start_latlng[1] + col.end_latlng[1]) / 2;

        col.mid_latlng = [midLat, midLng]

        return col;
    });
}

function setColOpacity(col, opacityLevel) {
    col.setStyle({
        opacity: opacityLevel,
        weight: 4
    });
    col.startMarker.setOpacity(opacityLevel);
    col.finishMarker.setOpacity(opacityLevel);
}

generateMiddleLatLng()

let map = L.map('map', {
    attributionControl: false,
    layers: [streets]
    }).setView(mapInitCoordinates, 9);

var creditsOnMap = L.control.attribution().addTo(map);
creditsOnMap.addAttribution(credits);

L.control.layers(baseMaps).addTo(map);

map.zoomControl.setPosition('bottomright');

for (let col of data.cols) {

    colsList += '<li>';
    colsList += '<a href="#' + col.name.replace(/ /g, '_').toLowerCase() +'" ';
    colsList += 'class="list_item" ';
    colsList += 'data-name="' + col.name + '" ';
    colsList += 'data-lat="' + col.mid_latlng[0] + '" ';
    colsList += 'data-long="' + col.mid_latlng[1] + '">';
    colsList += col.name;
    colsList += '</a>';
    colsList += '</li>';

    let coordinates = L.Polyline.fromEncoded(col.encoded).getLatLngs();

    let colPolyline = L.polyline(
        coordinates,
        {
            color: 'blue',
            weight: 4,
            opacity: .7,
            lineJoin: 'round'
        }
    ).addTo(map).bindPopup(col.name, {autoPan: false});

    let startMarker = L.marker([col.start_latlng[0], col.start_latlng[1]],{
        icon: startIcon,
        title: 'start'
    }).addTo(map);
    let finishMarker = L.marker([col.end_latlng[0], col.end_latlng[1]],{
        icon: finishIcon,
        title: 'Finish'
    }).addTo(map);

    colPolyline.name = col.name;
    colPolyline.startMarker = startMarker;
    colPolyline.finishMarker = finishMarker;

    colsL.push(colPolyline);
}

list.innerHTML = colsList;

function mouseenterCol() {
    let colName = this.getAttribute('data-name');
    hoveredCol = colsL.find((colL) => colL.name === colName);
    if(hoveredCol === selectedCol) {
        return;
    }
    hoveredCol.setStyle({
        weight: 6
    })
}

function mouseleaveCol() {
    let colName = this.getAttribute('data-name');
    hoveredCol = colsL.find((colL) => colL.name === colName);
    hoveredCol.setStyle({
        weight: 4
    })
}

function zoomTo(e, l) {
    let colLat = this.getAttribute('data-lat');
    let colLong = this.getAttribute('data-long');
    let colName = this.getAttribute('data-name');
    selectedCol = colsL.find((colL) => colL.name === colName);

    Array.from(list_items).forEach(function(list_item) {
        list_item.parentElement.classList.remove('selected');
    });

    this.parentElement.classList.add('selected');

    isSelectedCol = false;

    setView(colLat, colLong, colName);
    selectedCol.openPopup();
}

function setView(lat, lng) {
    map.setView(new L.LatLng(lat, lng), 12, {animate: true});
}

map.on('moveend', function(e){

    if(isSelectedCol) {
        console.log('drag zoom');
        for (var colL of colsL) {
            setColOpacity(colL, 1);
        }

        isSelectedCol = false;
        selectedCol = undefined;

        Array.from(list_items).forEach(function(list_item) {
            list_item.parentElement.classList.remove('selected');
        });
    }

    if(typeof selectedCol !== 'undefined') {

        for (var colL of colsL) {
            if(colL !== selectedCol){
                setColOpacity(colL, 0.2);
            }else{
                setColOpacity(colL, 1);
            }
        }

        isSelectedCol = true;
    }
})

Array.from(list_items).forEach(function(list_item) {
    list_item.addEventListener('click', zoomTo);
    list_item.addEventListener('mouseenter', mouseenterCol);
    list_item.addEventListener('mouseleave', mouseleaveCol);
});