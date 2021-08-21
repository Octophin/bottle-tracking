class Bottles {

    constructor() {

        let self = this;

        self.bottles = {};

        self.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/octophin/ckslje0pablu318rhq5u46k7k?fresh=true',
            center: [-5.494078, 50.079286],
            zoom: 7
        });

        self.map.on("load", function() {

            // Load bottle arrow image

            self.map.loadImage(
                'images/bottle.png',
                (error, image) => {

                    if (error) throw error;

                    // Add the image to the map style.
                    self.map.addImage('bottle', image);

                    self.ready = true;

                });

        })

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

        return Promise.all(bottles.map(x => this.loadBottleData(x.data, x.name, x.colour, x.flag)));

    }

    loadBottleData(url, name, colour, flag) {

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

            self.map.addLayer({
                'id': name + "_line",
                'type': 'line',
                'source': name,
                'paint': {
                    'line-color': colour,
                    'line-width': 1,
                    'line-dasharray': [1, 1.5]
                }
            });

            self.map.addLayer({
                'id': name + "_bottles",
                'type': 'symbol',
                'source': name,
                'layout': {
                    'symbol-placement': 'line',
                    'symbol-spacing': 15,
                    'symbol-avoid-edges': true,
                    'icon-allow-overlap': false,
                    'icon-image': 'bottle',
                    'icon-size': 0.2,
                }
            });

            // Make a marker for the bottle that moves about

            var el = document.createElement('div');
            el.className = 'marker marker--' + name;
            el.innerHTML = flag;

            twemoji.parse(el);

            // make a marker for each feature and add to the map

            self.bottles[name].marker = new mapboxgl.Marker(el)
                .setLngLat([parseFloat(data[data.length - 1].lng), parseFloat(data[data.length - 1].lat)]) // FLOAT!
                .addTo(self.map);
        })

    }

    play() {

        for (let bottle in this.bottles) {

            bottle = this.bottles[bottle];

            let currentStep = 0;

            let bottleInterval = setInterval(function() {

                currentStep += 1;

                if (currentStep >= bottle.coords.length) {

                    clearInterval(bottleInterval);

                }

                bottle.marker.setLngLat([parseFloat(bottle.coords[currentStep].lng), parseFloat(bottle.coords[currentStep].lat)]) // FLOAT!

            }, 500)

        }

    }

}

let app = new Bottles();

app.init().then(function() {

    d3.json("config.json").then(function(config) {

        app.loadBottles(config.bottles).then(function() {

            // Data and map loaded

            $("#play").show();

        });

    })

})