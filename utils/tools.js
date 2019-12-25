const fetch = require("node-fetch");
const fs = require("fs");
const util = require("util");
const colsList = require('./../utils/cols_src');
const addedCols = require('./../app/data/cols.json');
const config = require('./config');
// {
//     "strv": "key",
//     "url": "url"
// }

const writeFile = util.promisify(fs.writeFile);
const stat = util.promisify(fs.stat);

const isDebug = true;

const headers = {
    method: 'get',
    headers: {
        'Authorization': "Bearer " + config.strv
    }
}

async function generateCols(colsList) {

    let colsToAdd = [];

    for (const col of colsList) {

        let addedCol = addedCols.find(c => c.name === col.name)
        console.log('-----------------');
        console.log('col.id', col.id);
        console.log('typeof addedCol', typeof addedCol === 'undefined');

        if (typeof col.id !== 'undefined' && typeof addedCol === 'undefined') {

            console.log('colID', col.id);

            if (!isDebug) {

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

                colsToAdd.push(col)
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

    if (!isDebug) {
        console.log('colsToAdd length', colsToAdd.length);

        if (colsToAdd.length !== 0) {

            colsToAdd = [...addedCols, ...colsToAdd]

            await writeFile('app/data/cols.json', JSON.stringify(colsToAdd));
        }
    }
}

generateCols(colsList);