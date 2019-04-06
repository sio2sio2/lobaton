(function() {

// Objeto para acceso desde todo el script
const g = {
   map: undefined,     // Mapa.
   Centro: undefined,  // Clase para las marcas de centro.
   general: undefined  // Datos generales del mapa (la primera feature).
}


// Carga del mapa con todos sus avíos.
function init() {

   var cluster;
   const Iconos = crearIconos();

   function crearMapa() {
      g.map = L.map("map").setView([37.07, -6.27], 9);
      g.map.addControl(new L.Control.Fullscreen({position: "topright"}));
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
      }).addTo(g.map);

      // Capa que agrupa las marcas.
      cluster = L.markerClusterGroup({
         showCoverageOnHover: false,
         // Al llegar a nivel 14 de zoom se ven todas las marcas.
         disableClusteringAtZoom: 14,
         spiderfyOnMaxZoom: false
      }).addTo(g.map);
   }

   function poblarSelectores() {
      const selectEstilo = document.querySelector("select[name='estilo']");
      const selectEsp = document.querySelector("select[name='especialidad']");

      selectEstilo.addEventListener("change", function(e) {
         const Icono = Iconos[this.value];
         Icono.onready(() => cluster.eachLayer(m => m.setIcon(new Icono())));
      });

      selectEsp.addEventListener("change", function(e) {
         cluster.clearLayers();
         const Icono = Iconos[selectEstilo.value];
         L.utils.load({
            url: this.value,
            callback: function(xhr) {
               const centros = JSON.parse(xhr.responseText);
               Icono.onready(agregarCentros.bind(null, Icono, centros));
            }
         });
      });
   }

   function definirMarca() {
      g.Centro = L.Marker.extend({
         options: {mutable: "feature.properties.data"}
      });
      definirCorrecciones.call(g.Centro);
   }

   function agregarCentros(Icono, datos) {
      g.general = datos.features[0].properties;
      // Capa intermedia capaz de leer objetos GeoJSON.
      const layer = L.geoJSON(datos, {
         pointToLayer: (f, p) => new g.Centro(p, {
            icon: new Icono(),
            title: f.properties.name
         }),
         onEachFeature: function(f, l) {
            // A efectos de depuración
            l.on("click", function(e) {
               const icon = e.target.options.icon;
               console.log("DEBUG - ident", e.target.feature.properties.name);
               console.log("DEBUG - marca", e.target);
               console.log("DEBUG - datos", e.target.getData());
            });
         }
      });

      cluster.addLayer(layer);
      //layer.clearLayers();

      // Aplicamos algunas correcciones a las marcas recién creadas
      // para comprobar que funciona el sistema de correcciones correctamente
      g.Centro.invoke("apply", "bilingue", {bil: ["Inglés"]});
      g.Centro.invoke("apply", "vt+", {});
      g.Centro.invoke("apply", "adjpue", {puesto: ["11590107", "00590059"], inv: true});
      // La aplicación de correcciones, no redibuja el icono automáticamente,
      // así que cuando termian de aplicarse todas, toca redibujar.
      g.Centro.invoke("refresh");
   }

   crearMapa();
   poblarSelectores();
   definirMarca();

   document.querySelector("select[name='especialidad']").dispatchEvent(new Event("change"));
}


function definirCorrecciones() {
   // Elimina enseñanzas que no son bilingües
   this.register("bilingue", {
      attr: "oferta",
      // opts= { bil: ["Inglés", "Francés"] } => Filtra enseñanzas que no sean bilingues de francés o inglés.
      func: function(value, oferta, opts) {
         if(!opts.bil || opts.bil.length === 0) return false;
         return opts.bil.indexOf(value.idi) === -1
      }
   });

   // Añade las vacantes telefónicas a las adjudicaciones.
   this.register("vt+", {
      attr: "adj",
      add: true,
      func: function(value, adj, opts) {
         const data = this.getData(),
               res = [];
         for(const puesto in data.pla) {
            for(let i=0; i<data.pla[puesto].vt; i++) res.push({
               col: "J",
               esc: [0, 0, 0],
               pue: puesto,
               pet: null,
               // TODO:: ¿Qué narices es esto?
               per: false,
               ubi: false
            });
         }
         return res;
      }
   });

   // Elimina las adjudicaciones que no sean de los puestos suministrados.
   this.register("adjpue", {
      attr: "adj",
      // opts= {puesto: ["00590059", "11590107"], inv: true}
      func: function(value, adj, opts) {
         return !!(opts.inv ^ (opts.puesto.indexOf(value.pue) === -1));
      }
   });
}


// Definición de los distintos estilos para iconos.
function crearIconos() {
   /**
    * Función que convierte los datos en opciones de dibujo.
    *
    * @params {Array} attrs  Las opciones de dibujo que realmente se usan para dibujar el icono.
    *    Como definimos varias clases de iconos y algunos son más simples que otros,
    *    necesitan menos opciones de dibujo. Este argumento permite enumerar qué opciones
    *    requiere la clase de icono en particular y así evitar que para todas las clases de
    *    iconos se hagan las conversiones a todas las opciones de dibujo.
    *    Si no se pasan, se sobrentiende que se quieren usar todas las opciones.
    * @params {Object} o  Objeto con los datos.
    */
   function converter(attrs, o) {
      const res = {};
      const map = {  // De qué propiedad de los datos depende cada opción de dibujo.
         numvac: "adj",
        tipo: "mod",
         ofertavar: "mod",
         numofer: "oferta",
         bil: "oferta"
      }

      // Nos cargamos las propiedades irrelevantes de los datos 
      if(attrs) o = Object.keys(map).filter(e => attrs.indexOf(e) !== -1)
                                    .reduce((r, e) => { r[map[e]] = o[map[e]]; return r }, {});

      if(o.hasOwnProperty("adj")) res["numvac"] = (o.adj.total !== undefined)?o.adj.total:o.adj.length;

      if(o.hasOwnProperty("mod")) {
         res["tipo"] = o.mod.hasOwnProperty("dif")?o.mod.dif:"normal";
         res["ofervar"] = o.mod.hasOwnProperty("cam")?o.mod.cam:0;
      }

      if(o.hasOwnProperty("peticion")) res["peticion"] = o.peticion;

      if(o.hasOwnProperty("oferta")) {
         res["numofer"] = 0;
         if(o.oferta.walk !== undefined) {
            for(const ens of o.oferta.walk()) {
               if(!ens.value) continue
               res["numofer"] += ens.value.mar?3:1;
            }
         }
         else {
            for(const ens of o.oferta) res["numofer"] += ens.mar?3:1;
         }
         res["numofer"] = Math.round(res["numofer"]/3);

         let idiomas;

         // Array con los idiomas de cada enseñanza
         if(o.oferta.walk) idiomas = Array.from(o.oferta.walk()).map(ens => ens.value && ens.value.idi)
         else idiomas = o.oferta.map(ens => ens.idi)

         // Eliminamos valores nulos y valores repetidos.
         idiomas = idiomas.filter((idi, i, arr) => idi && arr.indexOf(idi) === i)

         switch(idiomas.length) {
            case 0:
               res["bil"] = null;
               break;
            case 1:
               res["bil"] = idiomas[0];
               break;
            default:
               res["bil"] = "multi";
         }

      }

      return res;
   }

   // Los dos iconos CSS comparten el HTML que está definido en un template
   const html = document.querySelector("template").content;

   // Los dos iconos CSS comparten el mismo HTML
   function updaterCSS(o) {
      const content = this.querySelector(".content");
      if(o.tipo) content.className = "content " + o.tipo;
      if(o.numvac !== undefined) content.firstElementChild.textContent = o.numvac;
      return this;
   }

   // Los boliches tienen mucha miga...
   const updaterBoliche = (function(o) {
      const paletaOferta = new Array(5).fill(null);
      const paletaPlazas = new Array(7).fill(null);

      /**
       * Obtiene una gama de colores RGB distinguibles entre sí.
       * En principio, si se desea obtener 4 colores, habrá que pasar:
       * como ratio 1/4, 2/4, 3/4 y 4/4.
       */
      function HSLtoRGB(h, s, l) {
         s = s || .65;
         l = l || .45;

         var r, g, b;

         if(s == 0){
            r = g = b = l;
         }
         else {
            function hue2rgb(p, q, t) {
               if(t < 0) t += 1;
               if(t > 1) t -= 1;
               if(t < 1/6) return p + (q - p) * 6 * t;
               if(t < 1/2) return q;
               if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
               return p;
            }

            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
         }

         return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
      }


      /**
       * Devuelve blanco o negro dependiendo de cuál contraste mejor con el
       * color RGB suministrado como argumento
       */
      function blancoNegro(rgb) {
         var y = 2.2;

         return (0.2126*Math.pow(rgb[0]/255, y) + 0.7152*Math.pow(rgb[1]/255, y) + 0.0722*Math.pow(rgb[2]/255, y) > Math.pow(0.5, y))?"#000":"#fff";
      }

      /**
       * Convierte un array de tres enteros (RGB) en notación hexadecimal.
       */
      function rgb2hex(rgb) {
         return "#" + rgb.map(dec => ("0" + dec.toString(16)).slice(-2)).join("");
      }

      paletaOferta[0] = "black";
      for(let i=1; i < paletaOferta.length; i++) {
         paletaOferta[i] = rgb2hex(HSLtoRGB(i/(paletaOferta.length-1)));
      }

      var tintaPlazas = new Array(paletaPlazas).fill(null);
      paletaPlazas[0] = tintaPlazas[0] = "black";
      for(let i=1; i < paletaPlazas.length; i++) {
         let color = HSLtoRGB(i/(paletaPlazas.length-1));
         paletaPlazas[i] = rgb2hex(color);
         tintaPlazas[i] = blancoNegro(color);
      }

      function updater(o) {
         const defs = this.querySelector("defs");
         const content = this.querySelector(".content");

         var e = this.querySelector(".ofervac");
         if(o.numofer !== undefined) {
            let x = e.querySelector("circle");
            x.setAttribute("fill", paletaOferta[Math.min(paletaOferta.length-1, o.numofer)]);
         }

         if(o.numvac !== undefined) {
            let i = Math.min(paletaPlazas.length-1, o.numvac);
            e = e.querySelector("path");
            e.setAttribute("fill", paletaPlazas[i]);
            e = e.nextElementSibling;
            e.textContent = o.numvac;
            e.setAttribute("fill", tintaPlazas[i]);
         }

         if(o.ofervar !== undefined) {
            e = this.querySelector(".ofervar");
            if(!o.ofervar) e.setAttribute("display", "none");
            else {
               e.removeAttribute("display");
               e = e.firstElementChild.nextElementSibling;
               if(o.ofervar > 0) e.removeAttribute("display");
               else e.setAttribute("display", "none");
            }
         }

         if(o.bil !== undefined) {
            e = content.querySelector(".bil");
            if(e) defs.appendChild(e);
            if(o.bil !== null) content.appendChild(defs.querySelector(".bil." + o.bil));
         }

         if(o.tipo !== undefined) {
            e = content.querySelector(".tipo");
            if(o.tipo === null) if(e) defs.appendChild(e);
            else {
               if(!e) content.appendChild(defs.querySelector(".tipo"));
               if(o.tipo === "dificil") e.setAttribute("fill", "#c13");
               else e.setAttribute("fill", "#13b"); 
            }
         }
      }

      return updater;
   })();

   return {
      piolin: L.utils.createMutableIconClass("piolin", {
         iconSize: null,
         iconAnchor: [12.5, 34],
         css:  "../dist/images/piolin.css",
         html: html,
         converter: converter.bind(null, ["numvac", "tipo"]),
         //fast: true,
         updater: updaterCSS
      }),
      chupachups: L.utils.createMutableIconClass("chupachups", {
         iconSize: [25, 34],
         iconAnchor: [12.5, 34],
         css:  "../dist/images/chupachups.css",
         html: html,
         converter: converter.bind(null, ["numvac", "tipo"]),
         //fast: true,
         updater: updaterCSS
      }),
      solicitud: L.utils.createMutableIconClass("solicitud", {
         iconSize: [40, 40],
         iconAnchor: [19.556, 35.69],
         url:  "../dist/images/solicitud.svg",
         converter: converter.bind(null, ["peticion"]),
         //fast: true,
         updater: function(o) {
            var text = this.querySelector("text");
            if(o.peticion !== undefined) {
               text.textContent = o.peticion;
               var size = (o.peticion.toString().length > 2)?28:32;
               text.setAttribute("font-size", size);
            }
            return this;
         }
      }),
      boliche: L.utils.createMutableIconClass("boliche", {
         iconSize: [40, 40],
         iconAnchor: [19.556, 35.69],
         url:  "../dist/images/boliche.svg",
         converter: converter.bind(null, undefined),
         //fast: true,
         updater: updaterBoliche,
      }),
   }
}


window.onload = init

})();
