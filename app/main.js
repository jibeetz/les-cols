


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

let map = L.map('map').setView([47.02167640440166, 8.653083890676498], 9);
L.tileLayer(
    'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    }).addTo(map);

let colsList = '';

for (let col of data.cols) {

        colsList += '<li>';
        colsList += '<a href="#' + col.name.replace(/ /g, '_').toLowerCase() +'" ';
        colsList += 'class="list_item" ';
        colsList += 'data-lat="' + col.mid_latlng[0] + '" ';
        colsList += 'data-long="' + col.mid_latlng[1] + '">';
        colsList += col.name;
        colsList += '</a>';
        colsList += '</li>';

    let coordinates = L.Polyline.fromEncoded(col.encoded).getLatLngs();

    L.polyline(
        coordinates,
        {
            color: 'blue',
            weight: 2,
            opacity: .7,
            lineJoin: 'round'
        }
    ).addTo(map);
}

list.innerHTML = colsList;

function zoomTo() {
    let colLat = this.getAttribute('data-lat');
    let colLong = this.getAttribute('data-long');
    map.setView(new L.LatLng(colLat, colLong), 12, {animate: true});
}

let list_items = document.getElementsByClassName('list_item');

Array.from(list_items).forEach(function(list_item) {
    list_item.addEventListener('click', zoomTo);
});