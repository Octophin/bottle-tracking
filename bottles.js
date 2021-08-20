class Bottles {

    constructor() {

        let self = this;

        self.bottles = {};

        self.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v11',
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
                    'line-width': 0.5,
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

            // make a marker for each feature and add to the map

            let bottleMarker = new mapboxgl.Marker(el)
                .setLngLat([parseFloat(data[0].lng), parseFloat(data[0].lat)]) // FLOAT!
                .addTo(self.map);

            let currentStep = 0;

            setInterval(function() {

                currentStep += 1;

                if (currentStep >= data.length) {

                    currentStep = 0;

                }

                bottleMarker.setLngLat([parseFloat(data[currentStep].lng), parseFloat(data[currentStep].lat)]) // FLOAT!

            }, 500)

        })

    }

}

let app = new Bottles();

app.init().then(function() {

    d3.json("config.json").then(function(config) {

        app.loadBottles(config.bottles).then(function() {

            console.log(app.bottles);

        });

    })

})