/**
 * Constructor del mapa
 * @name MapAAdjOfer
 * @class
 * @param {String} id  Identificador del elemento HTML
 *    donde se incrustará el mapa.
 * @param {String} pathToRootDir  Ruta relativa desde el directorio en que
 *    se encuentra la página web al directorio ``dist``.
 * @classdesc Implementa  un mapa que muestra la adjudicación de vacantes provisionales
 *    y la oferta educativa de cada centro, organizado según especialidades de los
 *    cuerpos 590 y 591. El mapa ofrece:
 *    <ul>
 *    <li>La ubicación de los centros y información relativa a su oferta educativa,
 *       plantillas orgánicas y de funcionamiento y vacantes anuales.
 *    <li>Filtros según distintos criterios para eliminar aquellos centros irrelevantes.
 *    <li>Cálculo de rutas con su distancia y sus tiempos estimados de viaje desde un origen
 *       arbitrario.
 *    <li>Cálculo de las isocronas.
 *    </ul>
 */
const MapaAdjOfer = (function() {
   "use strict";

   function MapaAdjOfer(id, pathToDistDir) {
      /** @lends MapaAdjOfer.prototype */
      Object.defineProperties(this, {
         /**
          * Identificador del elemento HTML donde se ubica el mapa
          * @private
          * @type {String}
          */
         _idmap: {
            value: id,
            writable: false,
            enumerable: false,
            configurable: false
         },
         /**
          * Ruta a la raiz desde el directorio donde su ubica la página.
          * @private
          * @type  {String}
          */
         _path: {
            value: pathToDistDir,
            writable: false,
            enumerable: false,
            configurable: false
         },
         /**
          * Guarda las funciones que se desean ejecutar al acabar de cargar los datos.
          * @private
          * @type {Array}
          */
         _events: {
            value: [],
            writable: false,
            enumerable: false,
            configurable: false
         }
      });

      /**
       * Iconos disponibles
       * @memberof MapaAdjOfer.prototype
       * @type {Icon}
       */
      this.Iconos = createIcons.call(this);
      loadMap.call(this);
      createMarker.call(this);
   }


   /**
    * Agregar centros al mapa.
    * @memberof MapaAdjOfer.prototype
    *
    * @param {String} estilo    Estilo del icono.
    * @param {Object} datos     Datos en formato GeoJSON.
    *
    */
   MapaAdjOfer.prototype.agregarCentros = function(estilo, datos) {
      const Icon = this.Iconos[estilo];
      Icon.onready((function() {
         this.general = datos.features[0].properties;
         // Capa intermedia capaz de leer objetos GeoJSON.
         const layer = L.geoJSON(datos, {
            pointToLayer: (f, p) => new this.Centro(p, {
               icon: new Icon(),
               title: f.properties.name
            })
         });

         this.cluster.addLayer(layer);
         this._events.forEach(func => func());
      }).bind(this));
   }


   /**
    * Cambia el estilo del icono.
    * @memeberof MapaAdjOfer.prototype
    *
    * @param {String} estilo  Nuevo estilo para el icono.
    */
   MapaAdjOfer.prototype.cambiarIcono = function(estilo) {
      const Icono = this.Iconos[estilo];
      Icono.onready(() => this.Centro.store.forEach(m => m.setIcon(new Icono())));
   }

   /**
    * Define una función que se ejecutará al acabar de agregar datos.
    * @memeberof MapaAdjOfer.prototype
    *
    * @param {Function} func   La función.
    */
   MapaAdjOfer.prototype.lanzarTrasDatos = function(func) {
      this._events.push(func);
   }


   /**
    * Elimina todas las funciones que se disparan al acabar de agregar datos.
    * @memberof MapaAdjOfer.prototype
    */
   MapaAdjOfer.prototype.flush = function() {
      this._event.length = 0;
   } 

   /**
    * Carga el mapa y crea la capa de cluster donde se agregan los centros.
    * @this {MapAdjOfer} El objeto que implemnta el mapa
    * @private
    */
   function loadMap() {
      this.map = L.map(this._idmap, {
         center: [37.07, -6.27],
         zoom: 9
      });

      this.map.zoomControl.setPosition('topright');

      this.map.addControl(new L.Control.Fullscreen({position: "topright"}));
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
      }).addTo(this.map);

      /**
       * Capa donde se agregan las marcas
       * @memberof MapaAdjOfer.prototype
       * @type {L.MarkerClusterGroup}
       *
       */
      this.cluster = L.markerClusterGroup({
         showCoverageOnHover: false,
         // Al llegar a nivel 14 de zoom se ven todas las marcas.
         disableClusteringAtZoom: 14,
         spiderfyOnMaxZoom: false,
         iconCreateFunction: L.utils.noFilteredIconCluster
      }).addTo(this.map);
   }

   /**
    * Crea la clase de marca para los centros y le
    * añade las correcciones y filtros definidos para ella.
    * @this {MapAdjOfer} El objeto que implemnta el mapa
    * @private
    */
   function createMarker() {
      /**
       * Clase de marca para los centros educativos.
       * @memberof MapAdjOfer.prototype
       * @type {Marker}
       */
      this.Centro = L.Marker.extend({
         options: {
            mutable: "feature.properties.data",
            filter: this.cluster,
            //filter: "filtered",
            //filter: L.utils.grayFilter
         }
      });
      createCorrections.call(this);
      createFilters.call(this);
   }

   /**
    * Registra las correcciones disponibles.
    * @this {MapAdjOfer} El objeto que implemnta el mapa
    * @private
    */
   function createCorrections() {
      // Elimina enseñanzas que no son bilingües
      this.Centro.register("bilingue", {
         attr: "oferta",
         // opts= { bil: ["Inglés", "Francés"] } => Filtra enseñanzas que no sean bilingues de francés o inglés.
         func: function(idx, oferta, opts) {
            if(!opts.bil || opts.bil.length === 0) return false;
            return opts.bil.indexOf(oferta[idx].idi) === -1
         }
      });

      // Añade vacantes telefónicas a las adjudicaciones.
      this.Centro.register("vt+", {
         attr: "adj",
         add: true,
         func: function(idx, adj, opts) {
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

      // Elimina las adjudicaciones de los puestos suministrados.
      this.Centro.register("adjpue", {
         attr: "adj",
         // opts= {puesto: ["00590059", "11590107"], inv: true}
         func: function(idx, adj, opts) {
            return !!(opts.inv ^ (opts.puesto.indexOf(adj[idx].pue) !== -1));
         }
      });
   }

   /**
    * Registra los filtros definidios para este tipo de mapa.
    * @this {MapAdjOfer} El objeto que implemnta el mapa
    * @private
    */
   function createFilters() {
      // Filtra según cantidad de adjudicaciones.
      this.Centro.registerF("adj", {
         attrs: "adj",
         // opts= {min: 0}
         func: function(opts) {
             return this.getData().adj.total < opts.min;
         }
      });
      // Filtra según número de enseñanzas.
      this.Centro.registerF("oferta", {
         attrs: "oferta",
         // opts= {min: 0}
         func: function(opts) {
             return this.getData().oferta.total < opts.min;
         }
      });
   }


   /**
    * Define los distintos tipos de iconos disponibles
    * @this {MapAdjOfer} El objeto que implemnta el mapa
    * @private
    */
   function createIcons() {
      // Los dos iconos CSS comparten todo, excepto el estilo CSS.
      const converterCSS = new L.utils.Converter(["numvac", "tipo"])
                                 .define("tipo", "mod.tipo", t => t || "normal")
                                 .define("numvac", "adj", a => a.total !== undefined?a.total:a.length);

      const html = document.querySelector("template").content;

      function updaterCSS(o) {
         const content = this.querySelector(".content");
         if(o.tipo) content.className = "content " + o.tipo;
         if(o.numvac !== undefined) content.firstElementChild.textContent = o.numvac;
         return this;
      }

      const converterSol = new L.utils.Converter(["peticion"]).define("peticion");

      // Los boliches tienen mucha miga...
      const converterBol = new L.utils.Converter(["numvac", "tipo", "numofer", "bil", "ofervar"])
                                 .define("tipo", "mod.dif", t => t || "normal")
                                 .define("numvac", "adj", a => a.total)
                                 .define("ofervar", "mod.cam", c => c || 0);

      // Para calcular la cantidad de oferta se considera
      // 1 una enseñanza deseable y 1/3 una que no lo es.
      converterBol.define("numofer", "oferta", function(oferta) {
         let res = 0;
         for(const ens of oferta) {
            if(ens.filters.length>0) continue
            res += ens.mar?3:1;
         }
         return Math.round(res/3);
      });

      converterBol.define("bil", "oferta", function(oferta) {
         // Array.from(oferta) y no oferta, para usar el iterador y tener disponible "filters".
         const idiomas = Array.from(oferta).map(ens => ens.filters.length===0 && ens.idi)
                                                  // Eliminamos valores nulos y valores repetidos.
                                                  .filter((idi, i, arr) => idi && arr.indexOf(idi) === i)

         switch(idiomas.length) {
            case 0:
               return null;
               break;
            case 1:
               return idiomas[0];
               break;
            default:
               return "multi";
         }
      });

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


         // Devuelve blanco o negro dependiendo de cuál contraste mejor con el
         // color RGB suministrado como argumento
         function blancoNegro(rgb) {
            var y = 2.2;

            return (0.2126*Math.pow(rgb[0]/255, y) + 0.7152*Math.pow(rgb[1]/255, y) + 0.0722*Math.pow(rgb[2]/255, y) > Math.pow(0.5, y))?"#000":"#fff";
         }

         // Convierte un array de tres enteros (RGB) en notación hexadecimal.
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
               if(o.tipo === "normal") {
                  if(e) defs.appendChild(e);
               }
               else {
                  if(!e) {
                     e = defs.querySelector(".tipo");
                     content.appendChild(e);
                  }
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
            css:  this._path + "/maps/adjofer/icons/piolin.css",
            html: html,
            converter: converterCSS,
            updater: updaterCSS
         }),
         chupachups: L.utils.createMutableIconClass("chupachups", {
            iconSize: [25, 34],
            iconAnchor: [12.5, 34],
            css:  this._path + "/maps/adjofer/icons/chupachups.css",
            html: html,
            converter: converterCSS,
            updater: updaterCSS
         }),
         solicitud: L.utils.createMutableIconClass("solicitud", {
            iconSize: [40, 40],
            iconAnchor: [19.556, 35.69],
            url:  this._path + "/maps/adjofer/icons/solicitud.svg",
            converter: converterSol,
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
            url:  this._path + "/maps/adjofer/icons/boliche.svg",
            converter: converterBol,
            updater: updaterBoliche,
         }),
      }
   }

   return MapaAdjOfer;
})();
