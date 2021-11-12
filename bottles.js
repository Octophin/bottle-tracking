class Bottles {

    constructor() {

        let self = this;

        // Storage for setIntervals so we can reset them
        self.intervals = [];

        self.bottles = {};

        self.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/octophin/ckslje0pablu318rhq5u46k7k?fresh=true',
            center: [-5.494078, 50.079286],
            zoom: 7
        });

        self.loadedLayerNames = {
            "currentMapLayers": [],
            "oldMapLayers": []
        }

        self.map.on("load", function() {

            // Load bottle arrow image

            self.map.loadImage(
                'images/bottle.png',
                (error, image) => {

                    if (error) throw error;

                    // Add the image to the map style.
                    self.map.addImage('bottle', image);

                    self.ready = true;

                }
            );

        });



    }

    clearIntervals() {

        this.intervals.forEach(clearInterval);

    }

    init() {

        let self = this;

        if (self.ready) {

            return Promise.resolve(this);

        }

        return new Promise(function(resolve, reject) {

            let interval = setInterval(function() {

                if (self.ready) {

                    clearInterval(interval);
                    resolve(this);

                }

            })

        })

    }

    loadBottles(bottles) {

        // bottles is an array of objects with:
        // {data: "data.csv", name: "uk", colour: "red"}

        return Promise.all(bottles.map(x => this.loadBottleData(x.data, x.name, x.colour, x.flag, x.info, x.map)));

    }

    openPanel(info) {
        document.getElementById("sidePanel").style.display = "block";
        document.getElementById("bottle_info").innerHTML = info;
        document.getElementById("buttonContainer").style.width = "68.3%"
    }

    loadBottleData(url, name, colour, flag, info, mapVersion) {

        let self = this;

        return d3.csv(url).then(function(data) {

            self.bottles[name] = {
                name: name,
                coords: data,
                colour: colour
            }

            // Add geojson source for bottle track

            self.map.addSource(name, {
                'type': 'geojson',
                'data': {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'LineString',
                        'coordinates': data.map(function(row) {

                            return [row.lng, row.lat]

                        })
                    }
                }
            });

            let visibility = 'none'
            if (mapVersion == "current") visibility = 'visible';

            self.map.addLayer({
                'id': name + "_line_" + mapVersion,
                'type': 'line',
                'source': name,
                'paint': {
                    'line-color': colour,
                    'line-width': 1,
                    'line-dasharray': [1, 1.5]
                },
                'layout': {
                    "visibility": visibility
                }

            });
            self.map.addLayer({
                'id': name + "_bottles_" + mapVersion,
                'type': 'symbol',
                'source': name,
                'layout': {
                    'symbol-placement': 'line',
                    'symbol-spacing': 15,
                    'symbol-avoid-edges': true,
                    'icon-allow-overlap': false,
                    'icon-image': 'bottle',
                    'icon-size': 0.2,
                    "visibility": visibility
                }
            });

            self.map.on("click", name + "_bottles", (e) => { self.openPanel(info) });

            // Make a marker for the bottle that moves about

            var el = document.createElement('div');
            el.className = 'marker marker--' + name;
            el.innerHTML = flag;
            el.addEventListener("click", () => { self.openPanel(info) });

            twemoji.parse(el);

            // make a marker for each feature and add to the map

            self.bottles[name].marker = new mapboxgl.Marker(el)
                .setLngLat([parseFloat(data[data.length - 1].lng), parseFloat(data[data.length - 1].lat)]) // FLOAT!
                .addTo(self.map);
            if (mapVersion == "old") {
                el.style.display = "none"
                self.loadedLayerNames["oldMapLayers"].push(name)
            } else self.loadedLayerNames["currentMapLayers"].push(name)

        })

    }

    play() {

        // Reset any existing intervals
        this.clearIntervals();

        for (let bottle in this.bottles) {

            bottle = this.bottles[bottle];

            let currentStep = 0;

            let bottleInterval = setInterval(function() {

                currentStep += 1;

                if (currentStep >= bottle.coords.length) {

                    clearInterval(bottleInterval);

                }

                bottle.marker.setLngLat([parseFloat(bottle.coords[currentStep].lng), parseFloat(bottle.coords[currentStep].lat)]) // FLOAT!

            }, 100)

            this.intervals.push(bottleInterval);

        }

    }

    closePanel() {
        document.getElementById("sidePanel").style.display = "none";
        document.getElementById("buttonContainer").style.width = "100%"
    }

    changeMap(id) {
        console.log(id)
        let self = this;
        let bottleSet;
        let oldBottleSet;
        if (id == "newMapBtn") {
            bottleSet = self.loadedLayerNames["currentMapLayers"];
            oldBottleSet = self.loadedLayerNames["oldMapLayers"]
            old = "old"
            current = "current"
        }
        if (id == "oldMapBtn") {
            console.log("here");
            console.log(self.loadedLayerNames)
            bottleSet = self.loadedLayerNames["oldMapLayers"];
            oldBottleSet = self.loadedLayerNames["currentMapLayers"];
            old = "current",
                current = "old"
        }

        for (let i = 0; i < oldBottleSet.length; i++) {
            document.getElementsByClassName("marker--" + oldBottleSet[i])[0].style.display = "none"
            self.map.setLayoutProperty(oldBottleSet[i] + "_bottles_" + old, 'visibility', 'none');
            self.map.setLayoutProperty(oldBottleSet[i] + "_line_" + old, 'visibility', 'none');
        }

        for (let i = 0; i < bottleSet.length; i++) {
            document.getElementsByClassName("marker--" + bottleSet[i])[0].style.display = "block"
            self.map.setLayoutProperty(bottleSet[i] + "_bottles_" + current, 'visibility', 'visible');
            self.map.setLayoutProperty(bottleSet[i] + "_line_" + current, 'visibility', 'visible');
        }
    }



}

const app = new Bottles();
window.app = app;

app.init().then(function() {

    d3.json("config.json").then(function(config) {

        app.loadBottles(config.bottles).then(function() {

            // Data and map loaded

            $("#play").show();

        });

    })

})