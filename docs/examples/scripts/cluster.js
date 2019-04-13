// Generador de centros.
function* genCentros() {
   const NUM = 1500; // 1500 marcas.

   const esqii = [36.623794, -7.234497];
   const esqsd = [38.159936, -2.362061];

   function random(a, b) { return a + Math.random()*(b-a); }

   for(let i=0; i<NUM; i++) {
      yield {
         type: "Feature",
         geometry: {
            type: "Point",
            coordinates: [random(-7.234497, -2.362061), random(38.159936, 36.623794)]
         },
         properties: {
            name: "Icono " + i,
            data: {
               peticion: Math.floor(random(1, 300)),
               tipo: ["dificil", "normal", "compensatoria"][Math.floor(Math.random()*3)],
               bil: ["inglés", "francés", "alemán", "multi"][Math.floor(Math.random()*4)],
               ofervar: Math.floor(Math.random()*3) - 1,
               numofer: Math.floor(Math.random()*6),
               numvac: Math.floor(Math.random()*11)
            }
         }
      }
   }
}


function init() {
   var map = L.map('map').setView([37.07, -6.27], 9);
   map.addControl(new L.Control.Fullscreen({position: "topright"}));
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
     maxZoom: 18
   }).addTo(map);

   // Para el ejemplo basta con eliminar algunos atributos
   // como las coordenadas del punto.
   function converter(attrs, o) {
      return Object.keys(o).filter(e => attrs.indexOf(e) !== -1).
         reduce((res, e) => { res[e] = o[e]; return res}, {});
   }

   function updater(o) {
      const content = this.querySelector(".content");
      if(o.tipo) content.className = "content " + o.tipo;
      if(o.numvac !== undefined) content.firstElementChild.textContent = o.numvac;
      return this;
   }

   const Icon = L.DivIcon.extend({
      options: {
         updater: updater,
         className: "icon",
         iconSize: [25, 34],
         iconAnchor: [12.5, 34],
         html: document.querySelector("template").content
      }
   });

   const layer = L.geoJSON(null, {
            pointToLayer: (f, l) => L.marker(l, {
            icon: new Icon({params: converter(["numvac", "tipo"], f.properties.data)}),
            title: f.properties.name})
         });  //Debe ser una coma, pero así podemos consultar cluster desde la consola.
         cluster = L.markerClusterGroup({showCoverageOnHover: false}).addTo(map);

   const centros = genCentros();

   /*
   for(const c of centros) {
      layer.addData(c);
      cluster.addLayer(layer);
      layer.clearLayers();
   }
   */

   const progress = document.getElementById('progress'),
         progressBar = document.getElementById('progress-bar');

   progressBar.style.width = "0";

   let id = 0, total = 1500,
        x = setInterval(function() {
               const c = centros.next()
               if(c.done) {
                  clearInterval(id);
                  progress.style.display = "none";
                  return;
               }
               layer.addData(c.value);
               cluster.addLayer(layer);
               layer.clearLayers();
               //Cada 200 marcas y si se tarda más de 1 segundo.
               if(id % 200 === 0 && id*20 > 1000) {
                  progress.style.display = "block";
                  progressBar.style.width = Math.round(id*100/total) + '%';
               }
               id++;
            }, 20);

   /*
   layer.on("clusterclick", function(e) {
      console.log(e.layer.getChildCount());
   });
   */
}

window.onload = init
