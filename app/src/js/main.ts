import * as L from 'leaflet'
import elevationModule from './leaflet-elevation'
import * as PolylineEncoded from 'polyline-encoded'
import { filterColsList } from './filter_cols'

declare module 'leaflet' {
    namespace control {
        function elevation(options?: any): void
    }

    namespace Polyline {
        function fromEncoded(encoded: string, options?: any): L.Polyline
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

type filterColsListD = (cols: Array<L.Polyline>, colsDOMList: HTMLCollectionOf<Element>) => void

interface ElevationObj {
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

class LesCols {

    private L: any
    private elevationModule: any
    private PolylineEncoded: any
    private mapboxToken: string
    readonly mapBoxAPIUrl: string = 'https://api.mapbox.com/styles/v1/mapbox/{id}/tiles/{z}/{x}/{y}?access_token='
    readonly mapInitCoordinates: L.LatLngTuple = [47.02167640440166, 8.653083890676498]

    readonly mapStartIcon: L.DivIcon
    readonly mapFinishIcon: L.DivIcon

    readonly mapColColorNormal: string = '#0026af'
    readonly mapColColorHover: string = '#008aff'
    readonly menuColClassSelected: string = 'selected'
    readonly markerTitleStart: string = 'Start'
    readonly markerTitleFinish: string = 'Finish'

    readonly mapStyleStreets: L.TileLayer
    readonly mapStyleOutdoors: L.TileLayer
    readonly mapStyleSatellite: L.TileLayer
    // https://docs.mapbox.com/api/maps/#styles

    readonly mapStyles: L.Control.LayersObject = {
        'Outdoors': mapStyleOutdoors,
        'Streets': mapStyleStreets,
        'Satellite': mapStyleSatellite
    }

    readonly mapCredits: string = '<a href="https://github.com/Raruto/leaflet-elevation">Leaflet Elevation</a> | © <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>'

    private menuColsEls: HTMLCollectionOf<Element> = document.getElementsByClassName('menu_col')
    private menuEl: HTMLElement = document.getElementById('menu')
    private menuColsListEl: HTMLElement = document.getElementById('cols_list')
    private menuToggleTriggerEl: HTMLElement = document.getElementById('toggle_list_trigger')

    private cols: Array<L.Polyline>
    private map: L.Map
    private selectedCol: L.Polyline
    private isSelectedCol: boolean = false
    private hoveredCol: L.Polyline
    private mapControlElevation: any
    private filterColsList: filterColsListD

    constructor(mapboxToken: string, L: any, elevationModule: any, PolylineEncoded: any, filterColsList: filterColsListD) {

        this.mapboxToken = mapboxToken
        this.L = L
        this.PolylineEncoded = PolylineEncoded
        this.elevationModule = elevationModule
        this.mapBoxAPIUrl = this.mapBoxAPIUrl + this.mapboxToken

        this.L.control.elevation = this.elevationModule
        this.mapStartIcon = this.L.divIcon({ className: 'start_icon' })
        this.mapFinishIcon = this.L.divIcon({ className: 'finish_icon' })

        this.mapStyleStreets = this.L.tileLayer(this.mapBoxAPIUrl, { id: 'streets-v11', tileSize: 512, zoomOffset: -1 })
        this.mapStyleOutdoors = this.L.tileLayer(this.mapBoxAPIUrl, { id: 'outdoors-v9', tileSize: 512, zoomOffset: -1 })
        this.mapStyleSatellite = this.L.tileLayer(this.mapBoxAPIUrl, { id: 'satellite-streets-v11', tileSize: 512, zoomOffset: -1 })

        this.filterColsList = filterColsList

        this.generateApp()

    }

    generateMiddleLatLng(): Array<L.Polyline> {
        return this.cols.map((col: L.Polyline) => {

            let midLat = (col.start_latlng[0] + col.end_latlng[0]) / 2
            let midLng = (col.start_latlng[1] + col.end_latlng[1]) / 2

            col.mid_latlng = [midLat, midLng]

            return col
        })
    }

    setColOpacity(col: L.Polyline, opacityLevel: number): void {
        col.setStyle({
            opacity: opacityLevel
        })
        col.startMarker.setOpacity(opacityLevel)
        col.finishMarker.setOpacity(opacityLevel)
    }

    setupMap(): void {

        this.map = this.L.map('map', {
            attributionControl: false,
            layers: [this.mapStyleStreets]
        }).setView(this.mapInitCoordinates, 9)

        this.L.control.layers(this.mapStyles).addTo(this.map)

        let mapCreditsAttribution: L.Control.Attribution = this.L.control.attribution().addTo(this.map)
        mapCreditsAttribution.addAttribution(this.mapCredits)
        this.map.zoomControl.setPosition('bottomright')

        this.mapControlElevation = L.control.elevation(
            {
                elevationDiv: "#elevation-div",
                useLeafletMarker: false,
                followMarker: false,
                reverseCoords: true,
                theme: "lime-theme"
            }
        )
        this.mapControlElevation.initCustom(this.map)
    }

    applyPathOnMap(col: L.Polyline): L.Polyline {

        let colCoordinates: any = L.Polyline.fromEncoded(col.encoded).getLatLngs()

        let colPolyline: L.Polyline = L.polyline(
            colCoordinates,
            {
                color: this.mapColColorNormal,
                weight: 4,
                opacity: .7,
                lineJoin: 'round'
            }
        ).addTo(this.map).bindPopup(col.name, { autoPan: false }).on('click', function () { console.log('col', col.name) })

        let startMarker: L.Marker<any> = L.marker([col.start_latlng[0], col.start_latlng[1]], {
            icon: this.mapStartIcon,
            title: this.markerTitleStart
        }).addTo(this.map)

        let finishMarker: L.Marker<any> = L.marker([col.end_latlng[0], col.end_latlng[1]], {
            icon: this.mapFinishIcon,
            title: this.markerTitleFinish
        }).addTo(this.map)

        colPolyline.name = col.name
        colPolyline.startMarker = startMarker
        colPolyline.finishMarker = finishMarker

        Object.assign(colPolyline, col)

        return colPolyline
    }

    addColToMenu(col: L.Polyline): void {
        let menuCol: string = '<li>'
        menuCol += '<a href="#' + col.name.replace(/ /g, '_').toLowerCase() + '" '
        menuCol += 'class="menu_col" '
        menuCol += 'data-name="' + col.name + '" '
        menuCol += 'data-lat="' + col.mid_latlng[0] + '" '
        menuCol += 'data-long="' + col.mid_latlng[1] + '">'
        menuCol += col.name
        menuCol += '</a>'
        menuCol += '</li>'

        this.menuColsListEl.innerHTML += menuCol
    }

    addEventsToMenuCols() {

        let self = this
        Array.from(this.menuColsEls).forEach(function (menuColEl: Element) {

            menuColEl.addEventListener('click', function () {
                self.zoomTo(this)
            })

            menuColEl.addEventListener('mouseenter', function () {
                self.passHover(this, self.mapColColorHover)
            })
            menuColEl.addEventListener('mouseleave', function () {
                self.passHover(this, self.mapColColorNormal)
            })
        })

    }

    passHover(colEl: Element, color: string) {

        let colName = colEl.getAttribute('data-name')
        let hoveredCol = this.cols.find((col: L.Polyline) => col.name === colName)
        hoveredCol.setStyle({
            color: color,
            opacity: 1
        })

    }

    removeSelectedState() {
        let self = this
        Array.from(this.menuColsEls).forEach(function (menuColEl) {
            menuColEl.parentElement.classList.remove(self.menuColClassSelected)
        })
    }

    addToggleEventToMenu() {
        this.menuToggleTriggerEl.addEventListener('click', () => {
            this.menuEl.classList.toggle('hidden')
        })
    }

    setView(lat: number, lng: number) {
        this.map.setView(new L.LatLng(lat, lng), 12, { animate: true })
    }

    zoomTo(e: HTMLElement) {
        let colLat: number = parseFloat(e.getAttribute('data-lat'))
        let colLong: number = parseFloat(e.getAttribute('data-long'))
        let colName: string = e.getAttribute('data-name')
        this.selectedCol = this.cols.find((col: L.Polyline) => col.name === colName)
        this.removeSelectedState()

        e.parentElement.classList.add(this.menuColClassSelected)

        this.isSelectedCol = false

        this.setView(colLat, colLong)
        this.selectedCol.openPopup()

        let fileName = this.selectedCol.name.toLowerCase().replace(/ /g, "_").replace(/ü/g, "u").replace(/\./g, "")
        fetch('data/coords/' + fileName + '.json').then((res) => {
            return res.json()
        }).then((data) => {
            let obj: ElevationObj = {
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

            this.mapControlElevation.loadDataCustom(obj, this.map)
        })
    }

    addEventToMap() {
        this.map.on('moveend click', function () {

            if (this.isSelectedCol) {
                for (var col of this.cols) {
                    setColOpacity(col, 1)
                }

                this.isSelectedCol = false
                this.selectedCol = undefined

                this.removeSelectedState()
            }

            if (typeof this.selectedCol !== 'undefined') {

                for (var col of this.cols) {
                    if (col !== this.selectedCol) {
                        setColOpacity(col, 0.4)
                    } else {
                        setColOpacity(col, 1)
                    }
                }

                this.isSelectedCol = true
            }
        })
    }

    generateApp = async () => {

        this.PolylineEncoded

        const response = await fetch('data/cols.json')
        this.cols = await response.json()

        this.cols = this.generateMiddleLatLng()

        this.setupMap()

        this.cols = this.cols.map(c => {

            this.addColToMenu(c)
            c = this.applyPathOnMap(c)
            return c

        })

        this.addEventToMap()
        this.addEventsToMenuCols()
        this.addToggleEventToMenu()
        this.filterColsList(this.cols, this.menuColsEls)
    }
}

const mapboxToken = process.env.TOKEN
L.control.elevation = elevationModule

const mapBoxAPIUrl = 'https://api.mapbox.com/styles/v1/mapbox/{id}/tiles/{z}/{x}/{y}?access_token=' + mapboxToken
const mapInitCoordinates: L.LatLngTuple = [47.02167640440166, 8.653083890676498]

const mapStartIcon = L.divIcon({ className: 'start_icon' })
const mapFinishIcon = L.divIcon({ className: 'finish_icon' })

const mapColColorNormal = '#0026af'
const mapColColorHover = '#008aff'
const menuColClassSelected = 'selected'
const markerTitleStart = 'Start'
const markerTitleFinish = 'Finish'

const mapStyleStreets = L.tileLayer(mapBoxAPIUrl, { id: 'streets-v11', tileSize: 512, zoomOffset: -1 })
const mapStyleOutdoors = L.tileLayer(mapBoxAPIUrl, { id: 'outdoors-v9', tileSize: 512, zoomOffset: -1 })
const mapStyleSatellite = L.tileLayer(mapBoxAPIUrl, { id: 'satellite-streets-v11', tileSize: 512, zoomOffset: -1 })
// https://docs.mapbox.com/api/maps/#styles

const mapStyles = {
    "Outdoors": mapStyleOutdoors,
    "Streets": mapStyleStreets,
    "Satellite": mapStyleSatellite
}

const mapCredits = '<a href="https://github.com/Raruto/leaflet-elevation">Leaflet Elevation</a> | © <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>'

const menuColsEls = document.getElementsByClassName('menu_col')
const menuEl = document.getElementById('infos')
const menuColsListEl = document.getElementById('cols_list')
const menuToggleTriggerEl = document.getElementById('toggle_list_trigger')

let cols: Array<L.Polyline> = []
let map: L.Map
let selectedCol: L.Polyline
let isSelectedCol: boolean = false
let hoveredCol: L.Polyline
let colsL: Array<L.Polyline> = []
let mapControlElevation: any

function generateMiddleLatLng() {
    cols = cols.map((col: L.Polyline) => {

        let midLat = (col.start_latlng[0] + col.end_latlng[0]) / 2
        let midLng = (col.start_latlng[1] + col.end_latlng[1]) / 2

        col.mid_latlng = [midLat, midLng]

        return col
    })
}

function setColOpacity(col: L.Polyline, opacityLevel: number) {
    col.setStyle({
        opacity: opacityLevel
    })
    col.startMarker.setOpacity(opacityLevel)
    col.finishMarker.setOpacity(opacityLevel)
}

function setupMap() {
    map = L.map('map', {
        attributionControl: false,
        layers: [mapStyleStreets]
    }).setView(mapInitCoordinates, 9)

    L.control.layers(mapStyles).addTo(map)

    var mapCreditsAttribution: L.Control.Attribution = L.control.attribution().addTo(map)
    mapCreditsAttribution.addAttribution(mapCredits)
    map.zoomControl.setPosition('bottomright')

    mapControlElevation = L.control.elevation(
        {
            elevationDiv: "#elevation-div",
            useLeafletMarker: false,
            followMarker: false,
            reverseCoords: true,
            theme: "lime-theme"
        }
    )
    mapControlElevation.initCustom(map)
}

function applyPathOnMap(col: L.Polyline) {

    let coordinates: any = L.Polyline.fromEncoded(col.encoded).getLatLngs()

    let colPolyline: L.Polyline = L.polyline(
        coordinates,
        {
            color: mapColColorNormal,
            weight: 4,
            opacity: .7,
            lineJoin: 'round'
        }
    ).addTo(map).bindPopup(col.name, { autoPan: false }).on('click', function () { console.log('col', col.name) })

    let startMarker = L.marker([col.start_latlng[0], col.start_latlng[1]], {
        icon: mapStartIcon,
        title: markerTitleStart
    }).addTo(map)
    let finishMarker = L.marker([col.end_latlng[0], col.end_latlng[1]], {
        icon: mapFinishIcon,
        title: markerTitleFinish
    }).addTo(map)

    colPolyline.name = col.name
    colPolyline.startMarker = startMarker
    colPolyline.finishMarker = finishMarker

    colsL.push(colPolyline)
}

function addColToMenu(col: L.Polyline) {

    let menuCol = '<li>'
    menuCol += '<a href="#' + col.name.replace(/ /g, '_').toLowerCase() + '" '
    menuCol += 'class="menu_col" '
    menuCol += 'data-name="' + col.name + '" '
    menuCol += 'data-lat="' + col.mid_latlng[0] + '" '
    menuCol += 'data-long="' + col.mid_latlng[1] + '">'
    menuCol += col.name
    menuCol += '</a>'
    menuCol += '</li>'

    menuColsListEl.innerHTML += menuCol
}

function addEventsToMenu() {
    Array.from(menuColsEls).forEach(function (menuColEl: HTMLElement) {
        menuColEl.addEventListener('click', zoomTo)
        menuColEl.addEventListener('mouseenter', mouseenterCol)
        menuColEl.addEventListener('mouseleave', mouseleaveCol)
    })
}

const generateApp = async () => {

    PolylineEncoded

    const response = await fetch('data/cols.json')
    cols = await response.json()

    generateMiddleLatLng()

    setupMap()

    for (let col of cols) {
        addColToMenu(col)
        applyPathOnMap(col)
    }

    addEventToMap()
    addEventsToMenu()
    addToggleEventToMenu()
    filterColsList(cols, menuColsEls)
}

function addToggleEventToMenu() {
    menuToggleTriggerEl.addEventListener('click', function () {
        menuEl.classList.toggle('hidden')
    })
}

function removeSelectedState() {
    Array.from(menuColsEls).forEach(function (menuColEl) {
        menuColEl.parentElement.classList.remove(menuColClassSelected)
    })
}

function passHover(col: Element, color: string) {

    let colName = col.getAttribute('data-name')
    hoveredCol = colsL.find((colL: L.Polyline) => colL.name === colName)
    console.log('hoveredCol', hoveredCol)
    hoveredCol.setStyle({
        color: color,
        opacity: 1
    })
}

function mouseenterCol() {
    passHover(this, mapColColorHover)
}

function mouseleaveCol() {
    passHover(this, mapColColorNormal)
}

function zoomTo() {
    let colLat = this.getAttribute('data-lat')
    let colLong = this.getAttribute('data-long')
    let colName = this.getAttribute('data-name')
    selectedCol = colsL.find((colL: L.Polyline) => colL.name === colName)
    removeSelectedState()

    this.parentElement.classList.add(menuColClassSelected)

    isSelectedCol = false

    setView(colLat, colLong)
    selectedCol.openPopup()

    let fileName = selectedCol.name.toLowerCase().replace(/ /g, "_").replace(/ü/g, "u").replace(/\./g, "")
    fetch('data/coords/' + fileName + '.json').then(function (res) {
        return res.json()
    }).then(function (data) {

        let obj: ElevationObj = {
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

        mapControlElevation.loadDataCustom(obj, map)
    })
}

function setView(lat: number, lng: number) {
    map.setView(new L.LatLng(lat, lng), 12, { animate: true })
}

function addEventToMap() {
    map.on('moveend click', function () {

        if (isSelectedCol) {
            for (var colL of colsL) {
                setColOpacity(colL, 1)
            }

            isSelectedCol = false
            selectedCol = undefined

            removeSelectedState()
        }

        if (typeof selectedCol !== 'undefined') {

            for (var colL of colsL) {
                if (colL !== selectedCol) {
                    setColOpacity(colL, 0.4)
                } else {
                    setColOpacity(colL, 1)
                }
            }

            isSelectedCol = true
        }
    })
}

// generateApp()

let lesCols: LesCols = new LesCols(process.env.TOKEN, L, elevationModule, PolylineEncoded, filterColsList)