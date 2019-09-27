const fetch = require("node-fetch");
const fs = require("fs");
const util = require("util");
const cols = require('./../utils/cols_src');
const destCols = require('./../app/data/cols.json');
const config = require('./config');

const writeFile = util.promisify(fs.writeFile);
const stat = util.promisify(fs.stat);

const isOnlyElevation = true;

const headers = {
    method: 'get',
    headers: {
        'Authorization': "Bearer " + config.strv
    }
}

async function generateCols(cols) {

    let colsList = [];

    for (const col of cols) {

        let destCol = destCols.find(c => c.name === col.name)
        console.log('-----------------');
        console.log('col.id', col.id);
        console.log('typeof destCol', typeof destCol === 'undefined');

        if (typeof col.id !== 'undefined' && typeof destCol === 'undefined') {

            console.log('colID', col.id);

            if (!isOnlyElevation) {

                let colData = await fetch(config.url + col.id, headers)
                    .then(async (response) => {
                        return await response.json()
                    })
                    .catch(function () {
                        console.log("error");
                    });

                // console.log('colData', colData);

                col.encoded = colData.map.polyline
                col.average_grade = colData.average_grade
                col.climb_category = colData.climb_category
                col.distance = colData.distance
                col.total_elevation_gain = colData.total_elevation_gain
                col.elevation_high = colData.elevation_high
                col.elevation_low = colData.elevation_low
                col.start_latlng = colData.start_latlng
                col.end_latlng = colData.end_latlng

                delete col.id

                colsList.push(col)
            }
        }

        let fileName = col.name.toLowerCase().replace(/ /g, "_").replace(/ü/g, "u").replace(/\./g, "");

        let isFileExist = await stat('app/data/coords/' + fileName + '.json').then(async (response) => {
            return true
        }).catch(function () {
            console.log("error");
            return false;
        });

        if (!isFileExist) {
            let colDataStreams = await fetch(config.url + col.id + '/streams?keys=altitude,latlng', headers)
                .then(async (response) => {
                    return await response.json()
                })
                .catch(function () {
                    console.log("error");
                });

            let colDatalatlng = colDataStreams.find(colDataStream => colDataStream.type === 'latlng').data
            let colDataAltitude = colDataStreams.find(colDataStream => colDataStream.type === 'altitude').data

            let colDatalatlngAlt = colDatalatlng.map((clong, i) => {
                clong.push(colDataAltitude[i])
                return clong
            });

            console.log('colDatalatlngAlt', colDatalatlngAlt);
            console.log('fileName', fileName);

            await writeFile('app/data/coords/' + fileName + '.json', JSON.stringify(colDatalatlngAlt));
        }
    }

    if (!isOnlyElevation) {
        console.log('colsList length', colsList.length);

        if (colsList.length !== 0) {

            colsList = [...destCols, ...colsList]

            await writeFile('app/data/cols.json', JSON.stringify(colsList));
        }
    }
}

generateCols(cols);