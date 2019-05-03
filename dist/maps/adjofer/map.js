/**
 * Constructor del mapa
 * @name MapAAdjOfer
 * @class
 * @param {String} id  Identificador del elemento HTML
 * donde se incrustará el mapa.
 * @param {Obj} opts Opciones de configuración.
 * @param {String} opts.path Ruta relativa desde el directorio en que
 * se encuentra la página web al directorio ``dist``.
 * @param {Boolean} opts.light Si ``true``, define el comportamiento del evento
 * *click* como "seleccionar el centro pulsado" y el evento *contextmenu* muestra
 * un menú contextual que permite generar crear rutas e isocronas. Esto libera de
 * tener que realizar en la interfaz la definición de cómo seleccionar centro y cómo
 * ordenar que se creen rutas e isocronas.
 * @param {String} opts.ors  La clave para el uso de los servios de OpenRouteService.
 * @param {Function} opts.chunkProgress   Función que se ejecuta periódicamente
 * si se demora demasiado la creación de las isoronas.
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

   // Issue #27
   /**
    * Crea una propiedad a la que se asocia un tipo de evento,
    * de manera que cuando se le da valor a la propiedad se lanzan
    * las acciones asociadas al evento *on*, y cuando se da valor null
    * se lanzan las acciones asociadas al evento *off*.
    *
    * @this El objeto al que se asocia el atributo.
    * @param {String} attr  El nombre del atributo que se creará.
    * @param {String} tipo_on  Nombre del tipo *on* del evento.
    * @param {String} tipo_off  Nombre del tipo *off* del evento.
    */
   function crearAttrEvent(attr, tipo) {
      if(this.fire === undefined) throw new Error("El objeto no puede lanzar eventos");
      Object.defineProperties(this, {
         [attr]: {
            get: function() { return this["_" + attr]; },
            set: function(value) {
               const old = this[attr];
               this["_" + attr] = value;
               this.fire(tipo, {oldval: old, newval: value});
            },
            configurable: false,
            enumerable: true
         },
         ["_" + attr]: {
            value: null,
            writable: true,
            configurable: false,
            enumerable: false
         }
      });
   }
   // Fin issue #27;

   function MapaAdjOfer(id, opts) {
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
            value: opts.path,
            writable: false,
            enumerable: false,
            configurable: false
         },
         // Issue #41
         /**
          * Interfaz visual ligera.
          * @type {Boolean}
          */
         light: {
            value: opts.light,
            wirtable: false,
            enumerable: true,
            configurable: false
         },
         // Fin issue #41
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
         },
         // Issue #42
         ors: {
            value: opts.ors,
            writable: true,
            enumerable: false,
            configurable: false
         }
         // Fin issue #42
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
            pointToLayer: (f, p) => {
               const centro = new this.Centro(p, {
                  icon: new Icon(),
                  title: f.properties.id.nom
               });

               // Issue #33
               // Para cada centro que creemos hay que añadir a los datos
               // la propiedad que indica si la marca está o no seleccionada.
               centro.on("dataset", e => e.target.changeData({sel: false}));

               // Issue #41
               if(this.light) centro.once("dataset", e => {
                  centro.on("click", e => {
                     this.cluster.seleccionado = this.cluster.seleccionado === e.target?null:e.target
                  });
               });
               // Fin issue #41, #33

               return centro;
            }
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
      const options = {
         center: [37.07, -6.27],
         zoom: 9
      }

      if(this.light) Object.assign(options, contextMenuMap.call(this));

      this.map = L.map(this._idmap, options);

      this.map.zoomControl.setPosition('topright');

      this.map.addControl(new L.Control.Fullscreen({position: "topright"}));
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
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


      // Issue #27
      crearAttrEvent.call(this.map, "origen", "originset");
      crearAttrEvent.call(this.cluster, "seleccionado", "markerselect");
      // Fin issue #27

      // Aplicación de issue #33: Cambiamos la marca
      // al seleccionarla o deseleccionarla.
      this.cluster.on("markerselect", function(e) {
         if(e.oldval) {
            e.oldval.changeData({sel: false});
            e.oldval.refresh();
         }
         if(e.newval) {
            e.newval.changeData({sel: true});
            e.newval.refresh();
         }
      });

      // Fijar un origen, implica crear una marca sobre
      // el mapa y destruir la antigua.
      this.map.on("originset", function(e) {
         if(e.oldval) e.oldval.removeFrom(this);
         if(e.newval) e.newval.addTo(this);
      });

      if(this.ors) {
         this.ors = new ORS(this, this.ors);
         Object.defineProperties(this, {
            _isocronas: {
               value: undefined,
               writable: true,
               enumerable: false,
               configurable: false
            },
            _ruta: {
               value: undefined,
               writable: true,
               enumerable: false,
               configurable: false
            }
         });
         crearAttrEvent.call(this.map, "isocronas", "isochroneset");
         crearAttrEvent.call(this.map, "ruta", "routeset");

         this.map.on("isochroneset", e => {
            if(e.newval) this.ors.contador++;
            else {
               // Elimina las isocronas dibujadas al poner a null el valor.
               if(e.oldval) this._isocronas.remove();
            }
            
            const origen = this.map.origen;
            if(origen) {
               origen.unbindContextMenu();
               origen.bindContextMenu(contextMenuMarker.call(this));
            }
         });
      }
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
            mutable: "feature.properties",
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
      const self = this;
      // Elimina enseñanzas que no son bilingües
      this.Centro.register("bilingue", {
         attr: "oferta",
         // opts= { bil: ["Inglés", "Francés"] } => Filtra enseñanzas que no sean bilingues de francés o inglés.
         func: function(idx, oferta, opts) {
            if(!opts.bil || opts.bil.length === 0) return false;
            return opts.bil.indexOf(oferta[idx].idi) === -1
         },
         // Sólo son pertinentes los puestos bilingües.
         chain: [{
            corr: "adjpue",
            func: function(opts) {
               const map = {  // TODO: Esto debería sacarse de la base de datos y estar en el geoJSON
                  "Francés": 10,
                  "Inglés": 11,
                  "Alemán": 12
               };
               const cod = Object.keys(map)
                                 .filter(idi => opts.bil.indexOf(idi) !== -1)
                                 .map(e => map[e]);
               //Puestos a eliminar.
               const puestos = Object.keys(self.general.puestos)
                                     .filter(pue => !cod.some(c => pue.startsWith(c)));
               return puestos.length>0?{puesto: puestos}:false;
            }
         }]
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
         // opts= {puesto: ["00590059", "11590107"], inv: false}
         func: function(idx, adj, opts) {
            return !!(opts.inv ^ (opts.puesto.indexOf(adj[idx].pue) !== -1));
         }
      });

      // Elimina las enseñanzas suministradas
      this.Centro.register("ofens", {
         attr: "oferta",
         // opts= {ens: ["23GMSMR168", "23GSASI820"], inv: false}
         func: function(idx, oferta, opts) {
            return !!(opts.inv ^ (opts.ens.indexOf(oferta[idx].ens) !== -1));
         },
         chain: [{
            corr: "adjpue",
            // Si alguna de las enseñanzas eliminadas, es la única
            // que puede impartir un puesto, entonces debe eliminarse tal puesto.
            func: function(opts) {
               const ens = self.general.ens;
               // Interesan las enseñanzas que no se eliminan.
               if(!opts.inv) opts = {ens: Object.keys(ens).filter(e => opts.ens.indexOf(e) === -1)};

               // Puestos impartidos exclusivamente por las enseñanzas eliminadas.
               const pue = [];
               for(let p of self.general.puestos) {
                  let impartido = false;
                  for(let e of opts.ens) {
                     if(ens[e].puestos.indexOf(p) !== -1) {
                        impartido = true;
                        break;
                     }
                  }
                  if(!impartido) pue.push(p);
               }

               return pue.length?{puesto: pue}:false;
            }
         }]
      });

      // Elimina adjudicaciones no telefónicas.
      this.Centro.register("vt", {
         attr: "adj",
         // Las peticiones telefónicas son las que tiene pet=null
         func: (idx, adj, opts) => adj[idx].pet !== null
      });

      // Elimina adjudicaciones que no responden a vacantes iniciales.
      this.Centro.register("vi", {
         attr: "adj",
         // opts= {}
         func: function(idx, adj, opts) {
            const puesto = adj[idx].pue,
                  vi = this.getData().pla[puesto].vi;
            let i, num = 0;
            for(i=0; i<=idx; i++) {
               if(adj[i].pue === puesto) num++;
            }
            return i>vi;
         }
      });

      // Elimina las enseñanzas no deseables.
      /*
      this.Centro.register("deseable", {
         attr: "oferta",
         func: (idx, oferta, opts) => !oferta[idx].mar
      });
      */
      // Esta implementación alternativa tiene la ventaja
      // de que está expresada en términos de enseñanzas (ofens).
      this.Centro.register("deseable", {
         attr: "oferta",
         autochain: true,
         func: opts => false,
         chain: [{
            corr: "ofens",
            func: function(opts) {
               // Hay que montar este cirio, porque la característica mar (deseable)
               // aparece en las enseñanzas de centro, pero no en la relación general
               // de enseñanzas. Debería corregirse el geojson.
               const indeseables = [];
               for(const ens in self.general.ens) {
                  for(const c of this.store) {
                     let found = false;
                     for(const o of c.getData().oferta) {
                        if(o.ens === ens) {
                           found = true;
                           if(!o.mar) indeseables.push(ens);
                           break;
                        }
                     }
                     if(found) break;
                  }
               }
               return indeseables.length?{ens: indeseables}:false;
            }
         }]
      });

      // Elimina las enseñanzas que no sean del turno indicado.
      this.Centro.register("turno", {
         attr: "oferta",
         // opts= {turno: 1, inv: true}  => 1: mañana, 2: tarde: 3, ambos.
         func: function(idx, oferta, opts) {
            if(oferta[idx].tur === null) return false; // Semipresenciales
            const map = {
               "matutino": 1,
               "vespertino": 2,
               "ambos": 3
            }
            // ESO y BAC noo tiene turno,
            // pero si es enseñanza de adultos es por la tarde.
            const turno = map[oferta[idx].tur || (oferta[idx].adu?"vespertino":"matutino")];

            return !!(opts.inv ^ !(turno & opts.turno));
         }
      });

      // Función para comprobar el adjudicatario de referencia.
      function adjref(idx, adj, opts) {
         // Pasa el tiempo de servicio a un pseudoescalafon:
         // Debe cumplir que a mayor tiempo de servicio, menor escalafón.
         function ts2esc(ts) {
            const hoy = new Date();

            return hoy.getFullYear() +
                   String(hoy.getMonth()).padStart(2, "0") +
                   String(hoy.getDate()).padStart(2, "0") -
                   ts.map(e => String(e).padStart(2, "0")).join("");
         }

         // Calcula un escalafón intercolectivo. Está constituido por la
         // concatenación de:
         // - Una primera parte que identifica la prioridad del colectivo.
         //   (1, el más prioritario; 2 el segundo, etc.)
         // - Un escalafón que se calcula del siguiente modo:
         //     + El propio escalafón, si es un func. de carrera que no ha
         //       cogido nunca excedencia.
         //     + Para interinos, funcionarios sin escalafón o funcionarios
         //       que en algún momento cogieron excedencia, un
         //       escalafón obtenido con ts2esc().
         function escEquiv(opts) {
            let esc = opts.esc,
                ts = opts.ts,
                col = String(self.general.colectivos[opts.col].o);

            // TODO: En el geojson los interinos deberían tener su ts
            // en la propiedad ts; y los funcionarios tener un esc y un ts.
            if(opts.col === "J") {
               if(esc && esc.length) {  // Precaución: los interinos tiene ts en esc.
                  ts = esc;
                  esc = undefined;
               }
            }
            else if(ts !== undefined) {  // Func. de carrera con dato de ts.
               const aa = (new Date()).getFullYear() - esc.substring(0, 4) - 1;
               // Esto significa que nunca ha cogido excendencia
               if(aa === ts[0]) ts = undefined;
            }

            if(ts !== undefined) esc = ts2esc(ts);

            return Number(col + esc);
         }

         if(!opts.hasOwnProperty("_ref")) opts._ref = escEquiv(opts);
         return escEquiv(adj[idx]) > opts._ref;
      }

      // Elimina las adjudicaciones que sean más prioritarias
      // que el adjudicatario de referencia que se defina.
      this.Centro.register("adjref", {
         attr: "adj",
         // opts= {ts: [10, 3, 22], esc: 20104120, col: "DB"}
         // ts=tiempo-servicio (aa-mm-dd), esc=escalafon, col=colectivo
         func: adjref
      });

      // Elimina enseñanzas que no sean nuevas
      this.Centro.register("nueva", {
         attr: "oferta",
         func: function(idx, oferta, opts) {
            return oferta[idx].nue === 0;
         }
      });

   }

   /**
    * Registra los filtros definidos para este tipo de mapa.
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

      // Elimina los tipos facilitados
      this.Centro.registerF("tipo", {
         attrs: "mod.dif",
         // opts= {tipo: 1, inv: false}  //tipo: 1=compensatoria, 2=difícil desempeño, 3=ambos.
         func: function(opts) {
            const map  = { "compensatoria": 1, "dificil": 2 },
                  tipo = map[this.getData().mod.dif] || 0;

            return !!(opts.inv ^ !!(tipo & opts.tipo));
         }
      });

      // Elimina las marcas que se hallen fuera del área
      this.Centro.registerF("lejos", {
         attrs: "no.existe",
         // opts={area: geojson}
         func: function(opts) {
            const latlng = this.getLatLng(),
                  point = {
                     type: "Feature",
                     geometry: {
                        type: "Point",
                        coordinates: [latlng.lng, latlng.lat]
                     }
                  }

            return !turf.booleanPointInPolygon(point, opts.area);
         }
      });

      this.map.on("isochroneset", e => {
         if(!e.newval && this.Centro.hasFilter("lejos")) {
            this.Centro.unfilter("lejos");
            this.Centro.invoke("refresh");
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
      const converterBol = new L.utils.Converter(["numvac", "tipo", "numofer", "bil", "ofervar", "sel"])
                                 .define("tipo", "mod.dif", t => t || "normal")
                                 .define("numvac", "adj", a => a.total)
                                 .define("ofervar", "mod.cam", c => c || 0)
                                 .define("sel");

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

         // Devuelve blanco o negro dependiendo de cuál contraste mejor con el
         // color RGB suministrado como argumento
         function blancoNegro(rgb) {
            var y = 2.2;

            return (0.2126*Math.pow(rgb[0]/255, y) + 0.7152*Math.pow(rgb[1]/255, y) + 0.0722*Math.pow(rgb[2]/255, y) > Math.pow(0.5, y))?"#000":"#fff";
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

            if(o.sel !== undefined) {
               e = content.querySelector(".selected");
               if(!o.sel) {
                  if(e) defs.appendChild(e);
               }
               else if(!e) {
                  e = defs.querySelector(".selected");
                  content.prepend(e);
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

   function contextMenuMap() {
      return {
         contextmenu: true,
         contextmenuItems: [
            {
               text: "Fijar origen de viaje",
               callback: e => {
                  this.map.origen = new L.Marker(e.latlng, {
                     title: `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`
                  });
                  this.map.origen.bindContextMenu(contextMenuMarker.call(this));
               }
            },
            {
               text: "Centrar el mapa aquí",
               callback: function(e) { this.panTo(e.latlng); }
            },
            "-",
            {
               text: "Ampliar escala",
               icon: this._path + "/maps/adjofer/images/zoom-in.png",
               callback: function(e) { this.zoomIn(); }
            },
            {
               text: "Reducir escala",
               icon: this._path + "/maps/adjofer/images/zoom-out.png",
               callback: function(e) { this.zoomOut(); }
            }
         ]
      }
   }

   function contextMenuMarker(espera) {
      const items = [
         {
            text: "Geolocalizar este origen",
            disabled: true,
            callback: e => console.log("TODO")
         },
         {
            text: "Eliminar este origen",
            callback: e => this.map.origen = null
         }
      ];

      if(espera) {
         items.push({
            text: "Generar isocronas",
            disabled: true
         });
      }
      else if(this.map.isocronas) {
         items.push({
            text: "Eliminar isocronas",
            callback: e => this.map.isocronas = null
         });
      }
      else {
         items.push({
            text: "Generar isocronas",
            callback: e => {
               this._isocronas = this._isocronas || new this.ors.Isocronas();
               this._isocronas.create(i => this.map.isocronas = i);
               this.map.origen.unbindContextMenu();
               this.map.origen.bindContextMenu(contextMenuMarker.call(this, true));
            }
         });
      }

      return {
         contextmenu: true,
         contextmenuInheritItems: false,
         contextmenuItems: items
      }
   }

   // Servicios de OpenRouteService
   const ORS = (function (adjofer, ors) {

      const URLBase = "https://api.openrouteservice.org";

      function failback(xhr) {
         const response = JSON.parse(xhr.responseText);
         console.error("Error " + response.error.code + ": " + response.error.message);
      }

      const Isocronas = (function() {
         /** @lends MadAdjOfer.prototype */

         const url = URLBase + "/isochrones";

         const defaults = {
            profile: "driving-car",
            range_type: "time",
            interval: 600,
            range: 3600,
            location_type: "start",
            intersections: false,
         }

         const isocronas = {
            interval: 200,
            delay: 50
         }

         function Isocronas(opts) {
            try {
               turf
            }
            catch(e) {
               throw new ReferenceError("No se encuentra cargado turf. ¿Ha olvidado cargar la librería en el HTML?");
            }

            this.setOptions(opts);
            this.layer = L.geoJSON(undefined, {
               style: f => new Object({
                              color: rgb2hex(HSLtoRGB(f.properties.ratio, .75, .30)),
                              opacity: 0.6
                           }),
               onEachFeature: (f, l) => {
                  //l.bindPopup(`Hasta ${f.properties.value/60} min`);
                  l.bindContextMenu(contextMenuArea.call(adjofer, l, this.layer));
               }
            });

            Object.defineProperty(this, "_done", {
               value: false,
               writable: true,
               enumerable: false,
               configurable: false
            });

            // Elimina la isocrona al fijar un nuevo origen.
            adjofer.map.on("originset", e => { adjofer.map.isocronas = null });
         }

         function contextMenuArea(area, layer) {
            // area que se usa para filtrar.
            let farea = layer.getLayers().filter(a => a.feature.properties.filtrante)[0];

            const items = [
               {
                  text: "Fijar origen de viaje",
                  callback: e => {
                     this.map.origen = new L.Marker(e.latlng, {
                        title: `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`
                     });
                     this.map.origen.bindContextMenu(contextMenuMarker.call(this));
                  }
               },
               {
                  text: "Eliminar isocronas",
                  callback: e => adjofer.map.isocronas = null
               },
               {
                  text: `Filtrar centros alejados más de ${area.feature.properties.value/60} min`,
                  disabled: area === farea,
                  callback: e => {
                     this.Centro.filter("lejos", {area: area.feature.properties.area});
                     this.Centro.invoke("refresh");
                     if(farea) farea.feature.properties.filtrante = false;
                     area.feature.properties.filtrante = true;
                     for(const a of layer.getLayers()) {
                        a.unbindContextMenu();
                        a.bindContextMenu(contextMenuArea.call(this, a, layer));
                     }
                  }
               },
               {
                  text: `Mostrar centros alejados más de ${(farea || area).feature.properties.value/60} min`,
                  disabled: !farea,
                  callback: e => {
                     this.Centro.unfilter("lejos");
                     this.Centro.invoke("refresh");
                     farea.feature.properties.filtrante = false;
                     for(const area of layer.getLayers()) {
                        a.unbindContextMenu();
                        a.bindContextMenu(contextMenuArea.call(this, a, layer));
                     }
                  }
               }
            ]

            return {
               contextmenu: true,
               contextmenuInheritItems: false,
               contextmenuItems: items
            }
         }

         Isocronas.prototype.setOptions = function(opts) {
            this.options = Object.assign({api_key: ors.key}, defaults, opts);
            return this;
         }

         /**
          * Crea las isocronas, en principio tomando como referencia la marca de origen.
          *
          * @param {Function} callback  Función que se ejecutará al generarse las
          * isocronas sobre el mapa.
          * @param {Boolean} force  Si  ``true``, borra las isocronas anteriores;
          * en caso contrario, generará un error.
          * @param {L.LatLng} point Punto alternativo al de origen.
          */
         Isocronas.prototype.create = function(callback, force, point) {
            if(this._done) {
               if(force) this.remove();
               else throw new Error("Imposible crear la isocrona: hay ya una.");
            }

            if(!point) point = adjofer.map.origen.getLatLng();

            if(ors.loading) ors.loading();
            L.utils.load({
               url: url,
               method: "GET",
               params: Object.assign({locations: [point.lng, point.lat].join(",")},
                                     this.options),
               callback: crearIsocronas.bind(this, callback),
               failback: failback
            });

            return this;
         }

         /**
          * Elimina las isocronas.
          */
         Isocronas.prototype.remove = function() {
            if(!this._done) return false;
            this.layer.clearLayers();
            this.layer.removeFrom(adjofer.map);
            this._done = false;
            return this;
         }

         function crearIsocronas(callback, xhr) {
            if(ors.loading) ors.loading();

            const started = (new Date()).getTime();
            // Estos polígonos son completamente macizos, es decir,
            // el referido a la isocrona de 30 minutos, contiene
            // también las áreas de 10 y 20 minutos.
            const data = JSON.parse(xhr.responseText);
            this.layer.addTo(adjofer.map);

            // La ejecución a intervalos se ha tomado del codigo de Leaflet.markercluster
            let i=0;
            const process = () => {
               const start = (new Date()).getTime();
               for(; i<data.features.length; i++) {
                  const lapso = (new Date()).getTime() - start;

                  // Al superar el intervalo, rompemos el bucle y
                  // liberamos la ejecución por un breve periodo.
                  if(ors.chunkProgress && lapso > isocronas.interval) break;

                  const anillo = i>0?turf.difference(data.features[i], data.features[i-1]):
                                 data.features[0];

                  Object.assign(anillo.properties, {
                     ratio:  1 - i/data.features.length,
                     area: data.features[i]  // Las área macizas sirven para filtrado.
                  });

                  this.layer.addData(anillo);
               }

               if(ors.chunkProgress) ors.chunkProgress(i, data.features.length,
                                                       (new Date().getTime() - started));

               if(i === data.features.length) {
                  this._done = true;
                  if(callback) callback(this);
               }
               else setTimeout(process, isocronas.delay);
            }
            process();
         }

         return Isocronas;
      })();

      const ret = {
         Isocronas: Isocronas,
         contador: 0,
      }

      return ret;

   });

   // Algunas funciones relacionadas con el color

   // Obtiene una gama de colores RGB distinguibles entre sí.
   // En principio, si se desea obtener 4 colores, habrá que pasar:
   // como ratio 1/4, 2/4, 3/4 y 4/4.
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

   // Convierte un array de tres enteros (RGB) en notación hexadecimal.
   function rgb2hex(rgb) {
      return "#" + rgb.map(dec => ("0" + dec.toString(16)).slice(-2)).join("");
   }

   return MapaAdjOfer;
})();
