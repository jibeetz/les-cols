
function generateMiddleLatLng() {
    data.cols = data.cols.map((col) => {

        let midLat = (col.start_latlng[0] + col.end_latlng[0]) / 2;
        let midLng = (col.start_latlng[1] + col.end_latlng[1]) / 2;

        col.mid_latlng = [midLat, midLng]

        return col;
    })
}

generateMiddleLatLng()

let list = document.getElementById('list');

var mapBoxUrl = 'https://api.mapbox.com/styles/v1/mapbox/{id}/tiles/{z}/{x}/{y}?access_token=' + config.token;

var streets = L.tileLayer(mapBoxUrl, {id: 'streets-v11'});
var outdoors = L.tileLayer(mapBoxUrl, {id: 'outdoors-v9'});
var satellite = L.tileLayer(mapBoxUrl, {id: 'satellite-streets-v11'});

// https://docs.mapbox.com/api/maps/#styles

var baseMaps = {
    "Outdoors": outdoors,
    "Streets": streets,
    "Satellite": satellite
};

let map = L.map('map',
    {
        attributionControl: false,
        layers: [streets]
    }).setView([47.02167640440166, 8.653083890676498], 9);

var credits = L.control.attribution().addTo(map);
credits.addAttribution('© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>');

L.control.layers(baseMaps).addTo(map);

map.zoomControl.setPosition('bottomright');

let colsList = '';

let colsL = [];

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

    let colL = L.polyline(
        coordinates,
        {
            color: 'blue',
            weight: 4,
            opacity: .7,
            lineJoin: 'round'
        }
    ).addTo(map).bindPopup(col.name);

    colL.name = col.name

    colsL.push(colL);
}

list.innerHTML = colsList;

function zoomTo() {
    let colLat = this.getAttribute('data-lat');
    let colLong = this.getAttribute('data-long');
    let colName = this.getAttribute('data-name');
    setView(colLat, colLong, colName);
}

function setView(lat, lng, colName) {
    map.setView(new L.LatLng(lat, lng), 12, {animate: true});

    let selectedCol = colsL.find((colL) => {
        return colL.name === colName
    });
    selectedCol.openPopup();

}

let list_items = document.getElementsByClassName('list_item');

Array.from(list_items).forEach(function(list_item) {
    list_item.addEventListener('click', zoomTo);
});