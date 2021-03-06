import * as L from 'leaflet'
import elevationModule from './leaflet-elevation'
import { filterColsList } from './filter_cols'
import * as gpxModule from './gpx'

declare module 'leaflet' {
    namespace control {
        function elevation(options?: any): void
    }

    export interface Polyline {
        name: string
        startMarker: L.Marker
        finishMarker: L.Marker
        mid_latlng: Array<number>
        start_latlng: L.LatLngTuple
        end_latlng: L.LatLngTuple
        encoded: string,
        file: string,
        _latlngs: any,
        distance: number,
        elevation_min: number,
        elevation_max: number,
        elevation_gain: number,
        elevation_loss: number,
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
    private mapboxToken: string
    readonly mapBoxAPIUrl: string = 'https://api.mapbox.com/styles/v1/mapbox/{id}/tiles/{z}/{x}/{y}?access_token='
    readonly mapInitCoordinates: L.LatLngTuple = [47.02167640440166, 8.653083890676498]

    readonly mapIconStart: L.DivIcon
    readonly mapIconFinish: L.DivIcon

    readonly mapColColorNormal: string = '#d41111'
    readonly mapColColorHover: string = '#8f0a0a'
    readonly menuColClassSelected: string = 'selected'
    readonly markerTitleStart: string = 'Start'
    readonly markerTitleFinish: string = 'Finish'

    readonly mapStyleStreets: L.TileLayer
    readonly mapStyleOutdoors: L.TileLayer
    readonly mapStyleSatellite: L.TileLayer
    // https://docs.mapbox.com/api/maps/#styles

    readonly mapStyles: L.Control.LayersObject

    readonly mapCredits: string = '<a href="https://github.com/Raruto/leaflet-elevation">Leaflet Elevation</a> | © <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>'

    private menuColsEls: HTMLCollectionOf<Element> = document.getElementsByClassName('menu_col')
    private menuEl: HTMLElement = document.getElementById('menu')
    private menuColsListEl: HTMLElement = document.getElementById('cols_list')
    private menuToggleTriggerEl: HTMLElement = document.getElementById('toggle_list_trigger')
    private elevationContainerEl: HTMLElement = document.getElementById('elevation-div')

    private cols: Array<L.Polyline>
    private map: L.Map
    private selectedCol: L.Polyline = null
    private mapControlElevation: any
    private filterColsList: filterColsListD

    constructor(mapboxToken: string, L: any, elevationModule: any, filterColsList: filterColsListD, gpxModule: any) {

        this.mapboxToken = mapboxToken
        this.L = L
        this.elevationModule = elevationModule
        this.mapBoxAPIUrl = this.mapBoxAPIUrl + this.mapboxToken

        this.L.control.elevation = this.elevationModule
        this.L.GPX = gpxModule
        this.mapIconStart = this.L.divIcon({ className: 'start_icon' })
        this.mapIconFinish = this.L.divIcon({ className: 'finish_icon' })

        this.mapStyleStreets = this.L.tileLayer(this.mapBoxAPIUrl, { id: 'streets-v11', tileSize: 512, zoomOffset: -1 })
        this.mapStyleOutdoors = this.L.tileLayer(this.mapBoxAPIUrl, { id: 'outdoors-v9', tileSize: 512, zoomOffset: -1 })
        this.mapStyleSatellite = this.L.tileLayer(this.mapBoxAPIUrl, { id: 'satellite-streets-v11', tileSize: 512, zoomOffset: -1 })

        this.mapStyles = {
            'Outdoors': this.mapStyleOutdoors,
            'Streets': this.mapStyleStreets,
            'Satellite': this.mapStyleSatellite
        }

        this.filterColsList = filterColsList

        this.generateApp()
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

    addColToMenu(col: L.Polyline): void {

        let menuCol = document.createElement('li');
        let menuColLink = document.createElement('a');
        menuColLink.href = '#' + col.file
        menuColLink.className = 'menu_col'
        menuColLink.setAttribute('data-name', col.file)
        menuColLink.innerHTML = col.name + '-' + col.distance

        menuCol.appendChild(menuColLink);

        this.menuColsListEl.appendChild(menuCol)
    }

    addEventsToMenuCol(col: L.Polyline) {
        let self = this

        let menuColEl: Element = document.querySelector('.menu_col[data-name="' + col.file + '"]')

        menuColEl.addEventListener('click', function () {
            self.zoomTo(this, col)
        })

        menuColEl.addEventListener('mouseenter', function () {
            col.setStyle({
                color: self.mapColColorHover,
                opacity: 1
            })
        })
        menuColEl.addEventListener('mouseleave', function () {
            col.setStyle({
                color: self.mapColColorNormal,
                opacity: 1
            })
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

    zoomTo(e: HTMLElement, col: L.Polyline) {

        let colLat: number = col.mid_latlng[0]
        let colLong: number = col.mid_latlng[1]
        this.selectedCol = col
        this.removeSelectedState()

        e.parentElement.classList.add(this.menuColClassSelected)

        this.setView(colLat, colLong)
        this.selectedCol.openPopup()

        let elevationData = col._latlngs.map((llm: any) => [llm.lat, llm.lng, llm.meta.ele])

        let obj: ElevationObj = {
            "name": "demo.geojson",
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": elevationData
                    },
                    "properties": null
                }]
        }

        this.elevationContainerEl.classList.add('visible')

        for (var col of this.cols) {
            let opacity = (col !== this.selectedCol) ? 0.4 : 1
            this.setColOpacity(col, opacity)
        }

        this.mapControlElevation.loadDataCustom(obj, this.map)

    }

    addEventToMap() {

        this.map.on('click', () => {

            if (this.selectedCol) {
                for (var col of this.cols) {
                    this.setColOpacity(col, 1)
                }

                this.selectedCol = null

                this.removeSelectedState()

                this.elevationContainerEl.classList.remove('visible')
                return;
            }

        })

    }

    generateApp = async () => {

        const response = await fetch('data/cols.json')
        this.cols = await response.json()

        this.setupMap()

        for (let c of this.cols) {

            let thisGpx = await new this.L.GPX('data/' + c.file + '.gpx', {
                async: true,
                polyline_options: {
                    color: this.mapColColorNormal,
                    weight: 3,
                    opacity: 1,
                    lineJoin: 'round'
                }
            })

            const s = this

            thisGpx.addTo(this.map).bindPopup(c.name, { autoPan: false }).on('click', function () { console.log('col', c.name) });

            thisGpx.on('loaded', function (e: any) {

                let loadedData = e.target

                let start_lat = loadedData._polyline._latlngs[0].lat
                let start_lng = loadedData._polyline._latlngs[0].lng
                let end_lat = loadedData._polyline._latlngs[loadedData._polyline._latlngs.length - 1].lat
                let end_lng = loadedData._polyline._latlngs[loadedData._polyline._latlngs.length - 1].lng

                let midLat = (start_lat + end_lat) / 2
                let midLng = (start_lng + end_lng) / 2

                c.mid_latlng = [midLat, midLng]

                let startMarker: L.Marker<any> = s.L.marker([start_lat, start_lng], {
                    icon: s.mapIconStart,
                    title: s.markerTitleStart
                }).addTo(s.map)

                let finishMarker: L.Marker<any> = s.L.marker([end_lat, end_lng], {
                    icon: s.mapIconFinish,
                    title: s.markerTitleFinish
                }).addTo(s.map)

                c.startMarker = startMarker
                c.finishMarker = finishMarker

                c.distance = loadedData.get_distance()
                
                c.elevation_min = loadedData.get_elevation_min()
                c.elevation_max = loadedData.get_elevation_max()
                c.elevation_gain = loadedData.get_elevation_gain()
                c.elevation_loss = loadedData.get_elevation_loss()

                c = Object.assign(e.target._polyline, c)

                s.cols.forEach(function (col: L.Polyline, i: number) { if (col.file === c.file) s.cols[i] = c; });

                s.addColToMenu(c)
                s.addEventsToMenuCol(c)

            })

        }

        this.addEventToMap()
        this.addToggleEventToMenu()
        this.filterColsList(this.cols, this.menuColsEls)

    }
}

new LesCols(process.env.TOKEN, L, elevationModule, filterColsList, gpxModule)