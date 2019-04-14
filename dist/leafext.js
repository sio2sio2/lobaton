(function() {
   "use strict";

   L.utils = {};

   /**
    * Realiza peticiones AJAX.
    * @example
    *
    * load({
    *    url: 'image/centro.svg',
    *    params: {
    *       a: 1,
    *       b: 2
    *    },
    *    method: "GET",
    *    context: objeto,
    *    callback: funcion(xhr) { console.log("Éxito"); },
    *    failback: function(xhr) { console.log("Error"); },
    * });
    *
    * Si no se especifica el método, se usará GET cuando no haya parámetros
    * y POST cuando sí los haya.
    *
    * La petición será asíncrona cuando se proporcionen funciones callback o
    * failback, y síncrona en caso contrario.
    * 
    * context permite indicar qué objeto se usará de contexto (this) para la
    * ejecución de callback y failback.
    */
   function load(params) {
      const xhr = new XMLHttpRequest();
      let qs = '', method = "GET"; 

      if(params.params) {
         qs = Object.keys(params.params).map(k => k + "=" + encodeURIComponent(params.params[k])).join('&');
         method = "POST";
      }

      method = (params.method || method).toUpperCase();

      if(method === "GET" && params.params) {
         params.url = params.url + "?" + qs;
         qs = "";
      }

      xhr.open(method, params.url, !!params.callback);
      if(params.callback || params.failback) {
         xhr.onreadystatechange = function() {
             if(xhr.readyState === 4) {
               if (xhr.status === 200) {
                  if(params.callback) {
                     if(params.context) params.callback.call(params.context, xhr);
                     else params.callback(xhr);
                  }
               }
               else if(params.failback) {
                  if(params.context) params.failback.call(params.context, xhr);
                  else params.failback(xhr);
               }
             }
         };
         if(params.url.endsWith(".html")) { // Permite para las respuestas HTML, obtener un responseXML
            xhr.responseType = "document";
         }
      }

      if(method === 'POST') xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
      xhr.send(qs);

      // Sólo es útil cuando la petición es síncrona.
      return xhr;
   }
   L.utils.load = load;

   /**
    * Devuelve el valor de la propiedad "anidada" de un objeto.
    *
    * @example
    *
    * o = {a:1, b: {c:2, d:3}}
    * geProperty(o, "b.c") === o.b.c  // true
    *
    * No obstante, comprueba antes que la propiedad no sea "anidada".
    *
    * @example
    *
    * o = {a:1, "b.c": 2, "b.d": 3}
    * geProperty(o, "b.c") === o["b.c"]  // true
    *
    * @param {Object}  obj  El objeto del que se busca la propiedad.
    * @param {string}  name El nombre de la propiedad anidada.
    */
   const getProperty = (obj, name) => obj.hasOwnProperty(name)?obj[name]:name.split(".").reduce((o, k) => o && o.hasOwnProperty(k)?o[k]:undefined, obj);


   /**
    * Comprueba si dos objetos son iguales a efectos de lo requerido
    * en este código.
    *
    * @param {Object} o  Un objeto.
    * @param {Object} p  El otro.
    *
    * @returns {boolean}
    */
   function equals(o,p) {
      if(typeof o !== typeof p) return false;
      if(typeof o !== "object" || o === null) return o == p;  // Comparación laxa.

      const oprop = Object.getOwnPropertyNames(o);
      const pprop = Object.getOwnPropertyNames(p);

      if(oprop.length !== pprop.length) return false;

      for(let i=0; i<oprop.length; i++) {
         const name = oprop[i];
         if(!equals(o[name], p[name])) return false;
      }
      return true;
   }

   /**
    * Facilita la construcción de clases de iconos. Cada clase está asociada
    * a un estilo de icono distinto.
    *
    * @param {string} name          Nombre identificativo para la clase de icono.
    * @param {Object} optiones      Opciones de construcción de la clase.
    * @param {string} options.css   Para un icono creado con CSS, el archivo .css.
    * @param {string|DocumentFragment|Document} options.html  HTML que define el
    *    icono. Se puede pasar como:
    *
    *    + Una cadena que contenga directamente el código HTML.
    *    + Un DocumentFragment, que sería lo que se obtiene como contenido de
    *       un template:
    *
    *          var fragmento = document.querySelector("template").content;
    *
    *    + Un Document, que sería lo que se obtiene de haber hecho una petición
    *      AJAX:
    *
    *          var doc = xhr.responseXML;
    *
    * @param {string} options.url   Alternativamente a la opción anterior,
    *    la URL de un archivo donde está definido el icono (p.e. un SVG).
    *
    * @param {function} options.converter  Función que convierte en opciones
    *     de dibujo los datos asociados a la entidad que representa la marca.
    *     Recibe como único argumento los datos a convertir. Es conveniente que
    *     se escriba permitiendo el paso de datos parciales, de manera que sólo
    *     genere las opciones de dibujo asociadas a esos datos parciales y no
    *     todas. Por ejemplo, supongamos que tenemos dos datos:
    *
    *     + gente: Array con personas de un mismo sexo.
    *     + sexo: Valor que puede ser hombre o mujer.
    *
    *     y que estos datos se convierten en las opciones de dibujo num (número
    *     de personas) y sexo (el sexo):
    *
    *     function converter(data) {
    *          const opts= {};
    *          if(data.hasOwnProperty("gente") opts["num"] = data.gente.length;
    *          if(data.hasOwnProperty("sexo") opts["sexo"] = data.sexo;
    *          return opts;
    *     }
    *
    *     La función anterior sólo devuelve la opción de dibujo "num", si se le
    *     pasó la propiedad "gente"; y sólo "sexo", si la propiedad "sexo".
    *     Si se escribe de este modo (admitiendo datos parciales), puede
    *     añadirse la opción "fast: true" para que el programa tome ventaja de
    *     este hecho.
    *    
    * @param {function} updater  Función que actualiza el aspecto del icono
    *    a partir de los nuevos valores que tengan las opciones de dibujo.
    *    Toma las opciones de dibujo (o una parte de ellas) y modifica el
    *    elemento DIV (o SVG. etc.) del icono para que adquiera un aspecto
    *    adecuado. Debe escribirse teniendo presente que no se pasan todas
    *    las opciones de dibujo, sino sólo las que se modificaron desde
    *    la última vez que se dibujó el icono. Por tanto, debe escribirse la
    *    función para realizar modificaciones sobre el aspecto preexistente
    *    del icono, en vez de escribirse para recrear el icono desde cero.
    *
    */
   L.utils.createMutableIconClass = function(name, options) {

      if(!options.updater) console.warn("Falta opción updater: el icono no será mutable");

      if(options.css) {
         const link = document.createElement("link");
         link.rel = "stylesheet";
         link.href = options.css;
         link.id = "leafext-css-" + name;
         document.querySelector("head").appendChild(link);
         delete options.css
      }

      options.className = options.className || name;

      return L.DivIcon.extend({options: options});
   }
   // Fin issue #2

   // Issue #21
   /**
    * Clase que permite definir cómo un objeto se obtiene a partir de otro.
    */
   L.utils.Converter = (function() {

      // Calcula la intersección entre dos arrays.
      const intersection = (a1, a2) => a1.filter(e => a2.indexOf(e) !== -1);

      /**
       * Obtiene los nombres de las propiedades de un objeto,
       * así como los nombres de las propiedades anidadas.
       *
       * Sólo se extraen propiedades de objetos cuyo constructor
       * sea directamente ``Object``, y opcionalmente los índices
       * de los arrays.
       *
       * @example
       *
       * o = {a: 1, arr: [2, 3], b: {c: 4}}
       * getNestedKeys(o)  // ["a", "arr", "b", "b.c"]
       * getNestedKeys(o, true)  // ["a", "arr", "arr.0", "arr.1", ,"b", "b.c"]
       *
       * @param {Object}  o     El objeto a inspeccionar.
       * @param {boolean} arr   true, si se desea inspeccionar las propiedades
       *                        que son arrays.
       * @param {string}  attr  Nombre parcial de la propiedad. En principio,
       *                        sólo se usa el parámetro en las llamadas recursivas.
       */
      function getNestedKeys(o, depth, arr, attr) {
         let res = [],
             attrs;
         if(depth === undefined) depth = null;
         if(attr) res.push(attr);
         if(o === null || typeof o !== "object" || depth !== null && depth < 1) return res;
         if(o.constructor === Array) {
            if(arr) attrs = o.keys();
            else return res;
         }
         else attrs = Object.keys(o);
         if(depth !== null) depth--;
         for(const p of attrs) res.push.apply(res, getNestedKeys(o[p], depth, arr, attr?attr + "." + p:p));
         return res;
      }

      function countChar(string, ch) {
         let res = 0;
         for(const c of string) if(c===ch) res++;
         return res;
      }

      /**
       * Constructor de la clase.
       *
       * @param {Array} params Enumera las nombres de las propiedades que tiene
       *                       el objeto destino.
       */
      function Converter(params) {
         this._params = {}
         for(const p of params) this._params[p] = {
            enabled: true,
            depends: [],
            converter: null
         }
         // Profundidad máxima en la que se encuentra
         // una propiedad del objeto original que influye
         // en el valor de alguna propiedad del objeto destino.
         Object.defineProperty(this, "__depth", {
            value: 1,
            writable: true,
            configurable: false,
            enumerable: false
         });
      }

      Object.defineProperties(Converter.prototype, {
         /**
          * Deshabilita una propiedad del objeto destino. Esto significa
          * que cuando se obre la conversión del objeto, nunca se intentará
          * obtener el valor de esta propiedad.
          *
          * @method disable
          *
          * @param {string} param  Nombre de la propiedad.
          *
          * @returns {Converter} El propio objeto.
          */
         "disable": {
            value: function(param) {
               this._params[param].enabled = false;
               return this;
            },
            writable: false,
            configurable: false
         },
         /**
          * Habilita una propiedad del objeto destino.
          *
          * @method enable
          *
          * @param {string} param  Nombre de la propiedad.
          *
          * @returns {Converter} El propio objeto.
          */
         "enable": {
            value: function(param) {
               this._params[param].enabled = true;
               return this;
            },
            writable: false,
            configurable: false
         },
         /**
          * Las propiedades definidas para el objeto de destino.
          */
         "params": {
            get: function() {
               return Object.keys(this._params);
            },
            configurable: false
         },
         /**
          * Las propiedades habilitadas para el objeto de destino.
          */
         "enabled": {
            get: function() {
               return this.params.filter(p => this._params[p].enabled);
            },
            configurable: false
         },
         /**
          * true, si todas las propiedades habilitadas tienen definida una conversión.
          */
         "defined": {
            get: function() {
               return this.params.every(p => !this._params[p].enabled || this.isDefined(p));
            },
            configurable: false
         },
         /**
          * Define cómo obtener una propiedad del objeto de destino.
          * 
          * @method define
          *
          * @param {string} param     El nombre de la propiedad.
          * @param {Array|string} properties Los nombres de las propiedades del objeto
          *       original que contribuyen a formar el valor de la propiedad del objeto
          *       de destino. Si la propiedad es una sola, puede evitarse el uso del
          *       array y escribir directamente el nombre. Si se omite este argumento,
          *       se sobreentiende que el nombre de la propiedad en el objeto original
          *       y el de destino es el mismo.
          * @param {function} func    La función conversora. Debe construirse de modo
          *       que, conservando el orden, reciba como argumentos los valores de las
          *       propiedades que se enumeran en ``properties``.
          *
          * @returns {?Converter} El propio objeto de conversión o null, si
          *       la propiedad que se intenta definir, no se registro al crear
          *       el objeto.
          */
         "define": {
            value: function(param, properties, func) {
               if(!(properties instanceof Array)) properties = [properties || param];
               if(!this._params.hasOwnProperty(param)) {
                  console.warn(`Opción ${param} inexistente. No se hace ninguna definición`);
                  return null;
               }
               this._params[param].depends = properties;
               this._params[param].converter = func || (x => x);
               const depth = Math.max(properties.map(p => countChar(p, ".") + 1));
               if(depth > this.__depth) this.__depth = depth;
               return this;
            },
            writable: false,
            configurable: false
         },
         /**
          * Informa de si la propiedad tiene definida la conversión.
          *
          * @method isDefined
          *
          * @param {string} param  El nombre de la propiedad.
          *
          * @returns {boolean}
          */
         "isDefined": {
            value: function(param) {
               return this._params[param].converter !== null;
            },
            writable: false,
            configurable: false
         },
         /**
          * Lleva a cabo la conversión de un objeto suministrado. Sólo se
          * obtienen las propiedades que estén habilitadas y para las que
          * se pueda realizar la conversión, porque exista toda la
          * información requerida en el objeto.
          *
          * @param {Object} o El objeto con los datos originales.
          *
          * @returns {Object} El objeto de conversión.
          */
         "run": {
            value: function(o) {
               const res = {};
               for(const p of this._getParams(getNestedKeys(o, this.__depth))) {
                  if(!this.isDefined(p)) throw new Error(`${p}: su conversión no está definida`);
                  const converter = this._params[p].converter,
                        depends = this._params[p].depends;
                  res[p] = converter.apply(null, depends.map(d => getProperty(o, d)));
               }
               return res;
            },
            writable: false,
            configurable: false
         },
         /**
          * Devuelve las propiedades habilitadas cuyas dependecias
          * se encuentran por completo en la lista de propiedades
          * que se suministra.
          *
          * @param {Array} properties Lista con nombres de propiedades
          *
          * @returns {boolean}
          */
         "_getParams": {
            value: function(properties) {
               return this.params.filter(p => this._params[p].enabled
                                           && this._params[p].depends.length == intersection(this._params[p].depends, properties).length);
            },
            writable: false,
            configurable: false
         }
      });

      return Converter;
   })();
   // Fin issue #21

   /**
    * Clase que permite saber si el objeto ha cambiado algunos de sus atributos
    * desde la última vez que se reseteó (con el método reset).
    *
    * Uso:
    *
    *    const o = new Options({a: 1, b: 2, c: 3});
    *    o.updated  // false, ya que se fijaron valores nuevos.
    *    o.a = 0    // Fijamos un valor para a
    *    o.d = 7    // No tiene efecto. Con strict provocará un error.
    *    o.modified // {a: 1}. Sólo devuelve los valores actualizados.
    *    o.reset()
    *    o.updated  // true. Resetear marca el objeto como actualizado.
    *
    * Una vez creado el objeto, pueden modificarse los valores de los atributos
    * (a, b y c, en el ejemplo); pero no añadir nuevos o eliminar alguno de los
    * existentes.
    *
    */
   const Options = (function() {

      const banned = ["updated"];

      function Options(opts) {
         Object.defineProperty(this, "_updated", {
            value: new Set(Object.keys(opts)),
            writable: true,
            enumerable: false,
            configurable: false
         });

         for(const attr in opts) {
            if(banned.indexOf(attr) !== -1) throw new Error(attr + ": opción prohibida");
            defineOption.call(this, attr);
            if(opts[attr] !== undefined) this[attr] = opts[attr];
         }
         Object.seal(this);
      }

      function setter(attr, value) {
         if(this["_" + attr] === value) return;
         this["_" + attr] = value;
         this._updated.add(attr);
      }

      function getter(attr) {
         return this["_" + attr];
      }

      // Define la propiedad que representa una opción.
      function defineOption(name) {
         Object.defineProperty(this, "_" + name, {
            value: undefined,
            writable: true,
            configurable: false,
            enumerable: false
         });
         Object.defineProperty(this, name, {
            get: () => getter.call(this, name),
            set: (value) => setter.call(this, name, value),
            configurable: false,
            enumerable: true
         });
      }

      /**
       * Cambia de una tacada varios valores.
       */
      Object.defineProperty(Options.prototype, "change", {
         value: function(obj) {
            for(const name in obj) {
               if(Object.keys(this).indexOf(name) === -1) continue;
               this[name] = obj[name];
            }
         },
         writable: false,
         configurable: false,
         enumerable: false
      });

      /**
       * Informa de si se han modificado las opciones. Cuando una opción cambia,
       * se modifica automáticamente el valor de esta propiedad a verdadera.
       */
      Object.defineProperty(Options.prototype, "updated", {
         get: function() { return this._updated.size === 0; },
         enumerable: false,
         configurable: false
      });

      /**
       * Marca las opciones como actualizadas.
       */
      Object.defineProperty(Options.prototype, "reset", {
         value: function() { this._updated.clear(); },
         writable: false,
         enumerable: false,
         configurable: false
      })

      /**
       * Devuelve sólo las opciones modificadas
       */
      Object.defineProperty(Options.prototype, "modified", {
         get: function() {
            const res = {};
            this._updated.forEach(e => res[e] = this[e]);
            return res;
         },
         enumerable: false,
         configurable: false
      });

      return Options;
   })();

   /**
    *
    * Extendemos DivIcon a fin de poder crear iconos que cambien
    * su aspecto al cambiar una o varias de sus propiedades.
    *
    * Uso:
    *
    *    // this es el elemento HTML que
    *    // en el mapa dibuja el icono.
    *    function updater(o) {
    *       const content = this.querySelector(".content");
    *       if(o.tipo !== undefined) content.className = "content " + o.tipo;
    *       if(o.numvac !== undefined) content.textContent = o.numvac;
    *       return this;
    *    }
    *
    *    // o es el objeto con los datos en crudo a partir de los cuales
    *    // se obtienen los valores de los parámetros. En este ejemplo,
    *    // el conversor consiste en no no hacer conversión.
    *    function converter(o) {
    *       return Object.assign({}, o); 
    *    }
    *
    *    const Icon = L.divIcon.extend({
    *       options: {
    *          updater: updater,
    *          converter: converter,
    *          fast: false,
    *          className: "icon",
    *          iconSize: [25, 34],
    *          iconAnchor: [12.5, 34],
    *          html: elemento_html
    *       }
    *    });
    *
    *    const icon = new Icon();
    *
    * Los parámetros que se pasan son:
    *
    * + updater:
    *     Función que se encarga de modificar el elemento HTML que define
    *     el icono según los valores de sus propiedades (numvac y tipo en el ejemplo).
    *
    * + converter:
    *     Función que a partir de los datos en crudo, genera los valores de
    *     las propiedades que permiten definir el icono.
    *
    * + fast:
    *     true implica que converter se definió de forma que si el objeto "o" que
    *     se le pasa no contiene todos lo datos, sólo devuelve valor para
    *     aquellas propiedades del icono que pueden calcularse. Por ejemplo,
    *     si en el objeto o hay información sobre el número de adjucudicaciones,
    *     pero no sobre el tipo, se deulverá algo de la forma: { numvac: 5 }.
    *     Esto es útil al aplicar una corrección que sólo modifica una parte
    *     de los datos, ya que se le pasará a converter exclusivamente esa parte
    *     y la conversión se ahorrará cálculos.
    *
    * + html:
    *     El elemento HTML que se desea usar como icono. Se acepta:
    *
    *     - Una cadena (tal como describe la documentación de Leaflet):
    *
    *       '<div class="content">5</div><div class="arrow"></div>'
    *
    *     - Un HTMLElement.
    *
    *     - Un Document (como lo que devuelve xhr.responseXML) o
    *       DocumentFragment (que es el contenido de un elemento "template").
    *
    * + iconSize:
    *     Si definimos el tamaño exacto a través de CSS (lo cual no es recomentable),
    *     debe ser null.
    *
    */

   function getElement(e) {
      if(typeof e === "string" || e instanceof String) {
         e = new DomParser().parseFromString("<div>" + e + "</div>", 'text/html');
         e.container = true;
      }
      else if(e instanceof Document || e instanceof DocumentFragment) {
         if(e.children.length === 1) {
            e = e.firstElementChild.cloneNode(true);
            e.container = false;
         }
         else {
            const container = document.createElement("div");
            for(const x of e.children) container.appendChild(x.cloneNode(true));
            e = container;
            e.container = true;
         }
      }
      else if(e instanceof HTMLElement) {
         e = e.cloneNode(true);
         e.container = false;
      }
      else throw new TypeError("Tipo de elemento no soportado");
      return e;
   }

   const DivIconExtend = L.DivIcon.extend

   L.DivIcon.extend = function(obj) {
      const Icon = DivIconExtend.call(this, obj);
      const options = Icon.prototype.options;
      if(options.updater && options.converter) {
         // Issue #2
         if(options.html) options.html = getElement(options.html);
         else if(!options.url) throw new Error("Falta definir las opciones html o url");
         Object.defineProperty(Icon, "ready", {
            get: () => Icon.prototype.options.html,
            configurable: false,
            enumerable: false
         });
         Icon.onready = async function(func_success, func_fail) {
            if(!this.ready) {
               new Promise(function(resolve, reject) {
                  if(Icon.ready) resolve();
                  load({
                     url: Icon.prototype.options.url,
                     callback: function(xhr) {
                        Icon.prototype.options.html = getElement(xhr.responseXML);
                        resolve();
                     },
                     failback: xhr => reject(new Error(xhr.statusText))
                  });
               }).then(func_success, func_fail);
            }
            else func_success();
         }
         // Fin Issue #2
         Object.assign(Icon.prototype, IconPrototype);
      }
      return Icon;
   }

   const createDivIcon = L.DivIcon.prototype.createIcon;

   const IconPrototype = {
      /**
       * Wrapper para el método homónimo de DivIcon.
       *
       * Detecta si cambiaron las opciones de dibujo, mientras el icono no
       * estaba dibujado, y, en ese caso, regenera options.html a partir de la
       * plantilla HTML.
       *
       */
      createIcon: function() {
         this.options.params = this.options.params || new Options(this.options.converter.run(this._marker.getData()));

         // Las opciones de dibujo cambiaron mientras el icono no estaba presente en el mapa.
         if(!this.options.params.updated) delete this.options.html;

         if(!this.options.hasOwnProperty("html")) {
            const html = this.options.html.cloneNode(true);
            html.container = this.options.html.container;
            this.options.updater.call(html, this.options.params);
            if(html.container !== undefined) this.options.html = html.container?html.innerHTML:html.outerHTML;
            this.options.params.reset();
         }

         const div = createDivIcon.call(this, arguments);
         // Issue #5
         const filter = this._marker.options.filter;
         if(filter && this._marker.filtered) {
            if(filter.hideable) console.error("Si está filtrado y es ocultable, no debería estar aquí");
            else filter.transform.call(div, true);
         }
         // Fin issue #5
         return div
      },
      /**
       * Refresca el icono, en caso de que hayan cambiado las opciones de dibujo.
       * El método modifica directamente el HTML sobre el documento.
       */
      refresh: function() {
         // TODO: Filtrado
         if(!this.options.params || this.options.params.updated) return false;
         this.options.updater.call(this._marker.getElement(), this.options.params.modified);
         this.options.params.reset();

         // Si se cambia el icono dibujado, el options.html guardado ya no vale.
         delete this.options.html;
         return true;
      },
   }

   const MarkerExtend = L.Marker.extend;

   L.Marker.extend = function() {
      const Marker = MarkerExtend.apply(this, arguments);
      const options = Marker.prototype.options;
      if(options.mutable) {
         options.corr = new CorrSys();
         Object.assign(Marker.prototype, prototypeExtra);
         Object.defineProperty(Marker, "store", {
            value: [],
            configurable: false,
            enumerable: false,
            writable: false
         }); 
         Marker.remove = removeMarker;
         Marker.invoke = invokeMarker;
         Marker.register = registerCorrMarker;
         Marker.do = doCorrMarker;
         Marker.undo = undoCorrMarker;
         // Issue #5
         if(options.filter) {
            Object.assign(Marker.prototype, prototypeExtraFilter);
            // No puede definirse en prototypeExtraFilter:
            // https://stackoverflow.com/questions/40211725/object-assign-getters-and-setters-in-constructor
            Object.defineProperty(Marker.prototype, "filtered", {
               get: function() { return this._filtered.length > 0; },
               configurable: false,
               enumerable: false
            });
            options.filter = new FilterSys(options.filter);
            Marker.registerF = registerFilterMarker;
            Marker.filter = filterMarker;
            Marker.unfilter = unfilterMarker;
         }
         // Fin issue #5
      }
      return Marker;
   }

   /**
    * Elimina una marca del almacén donde se guardan
    * todos los objetos marca de una misma clase.
    *
    * @param {L.Marker} marker  La marca que se desea eliminar.
    *
    * @returns {boolean}  El éxito en la eliminación.
    */
   function removeMarker(marker) {
      const idx = this.store.indexOf(marker);
      if(idx === -1) return false;
      this.store.splice(idx, 1);
      return true;
   }

   /**
    * Ejecuta un método para todas las marcas almacenadas en store.
    *
    * @param {string} method  Nombre del métodos
    * @param {...*} param Parámetro que se pasa al método
    */
   function invokeMarker(method) {
      for(const marker of this.store) {
         const args = Array.prototype.slice.call(arguments, 1);
         this.prototype[method].apply(marker, args);
      }
   }

   /**
    * Registra una corrección en el sistema de correcciones de la marca.
    *
    * @seealso {@link CorrSys.prototype.register} para saber cuáles son sus parámetros.
    */
   function registerCorrMarker() {
      return CorrSys.prototype.register.apply(this.prototype.options.corr, arguments);
   }


   // Issue #23
   /**
    * Aplica una corrección a las marcas de una clase.
    *
    * @params {string} name   Nombre de la corrección.
    * @prams {Object} params  Opciones de aplicacion de la corrección.
    */
   function doCorrMarker(name, params) {
      const corr = this.prototype.options.corr;
      try {
         // Si la correción ya está aplicada, sólo no se aplica en
         // caso de que se aplicara con las mismas opciones.
         if(equals(corr.getOptions(name).params, params)) return false;
      }
      catch(err) {  // La corrección no está registrada.
         return false;
      }

      corr.setParams(name, params);
      for(const marker of this.store) marker.apply(name);
   }

   /**
    * Elimina una correccón de las marcas de una clase.
    *
    * @params {string} name   Nombre de la corrección.
    */
   function undoCorrMarker(name) {
      const corr = this.prototype.options.corr;
      try {
         // La corrección no está aplicada.
         if(!corr.getOptions(name).params) return false;
      }
      catch(err) {
         return false;  // La corrección no está registrada.
      }

      for(const marker of this.store) marker.unapply(name);
      corr.setParams(name, null);
   }
   // Fin issue #23

   // Issue #5
   /**
    * Registra para una clase de marcas un filtro.
    *
    * @seealso {@link FilterSys.prototype.register} para saber cuáles son sus parámetros.
    */
   function registerFilterMarker() {
      return FilterSys.prototype.register.apply(this.prototype.options.filter, arguments) && this;
   }

   /**
    * Habilita un filtro para las marcas de una clase
    *
    * @param {string} name    Nombre del filtro.
    * @param {Object} params  Opciones para el filtrado.
    */
   function filterMarker(name, params) {
      const filter = this.prototype.options.filter.setParams(name, params, true);
      if(!filter) return false;  //El filtro no existe o ya estaba habilitado con los mismo parámetros.
      for(const marker of this.store) marker.applyF(name);
      return this;
   }

   /**
    * Deshabilita un filtro para las marcas de una clase
    *
    * @param {string} name    Nombre del filtro.
    */
   function unfilterMarker(name) {
      const filter = this.prototype.options.filter.disable(name);
      if(!filter) return false;  // El filtro no existe o está deshabilitado.
      for(const marker of this.store) marker.unapplyF(name);
      return this;
   }
   // Fin issue #5

   const MarkerInitialize = L.Marker.prototype.initialize;
   const MarkerSetIcon = L.Marker.prototype.setIcon;

   /**
    * Métodos modificados o adicionales que tendrán los derivados de Marker que al
    * crearse con extend incluyan la opción mutable=true.
    */
   const prototypeExtra = {
      refresh: function() {
         let div = this.getElement();
         // Issue #5
         const filter = this.options.filter;
         if(filter) {
            if(filter.hideable) {
               if(this.filtered) {
                  // Puede estar en la capa, aunque no se encuentre en el map
                  // si la capa es MarkerClusterGroup.
                  filter.transform.removeLayer(this);
                  div = undefined;
               }
               else {
                  if(!div) {
                     filter.transform.addLayer(this);
                     div = this.getElement();
                  }
               }
            }
            else if(div) filter.transform.call(div, this.filtered);
         }
         // Fin issue #5
         if(!div) return false;  // La marca no está en el mapa.
         this.options.icon.refresh();
      },
      initialize: function() {
         MarkerInitialize.apply(this, arguments);
         this.constructor.store.push(this);
         if(this.options.icon) this.options.icon._marker = this;
         // Issue #22
         const firstDot = this.options.mutable.indexOf(".");
         const feature = firstDot === -1?this.options.mutable:
                                         this.options.mutable.substring(0, firstDot);
         Object.defineProperty(this, "_" + feature, {
            value: undefined,
            writable: true,
            configurable: false,
            enumerable: false
         });

         function setFeature(value) {
            this["_" + feature] = value;
            this._prepare();
            // Issue #5
            // Aplicamos a los nuevos datos los filtros ya aplicadas
            // a los datos de las restantes marcas de la misma clase.
            const filter = this.options.filter;
            if(filter) for(const name of filter.getFilters()) this.applyF(name);
            // Fin issue #5
            // Y los mismo con las correcciones
            const corr = this.options.corr;
            for(const name in corr.getCorrections()) {
               if(corr.getOptions(name).params) this.apply(name);
            }
         }

         Object.defineProperty(this, feature, {
            get: function() { return this["_" + feature]; },
            set: setFeature,
            configurable: false,
            enumerable: false
         });
         // Fin issue #22

         // Issue #5
         Object.defineProperty(this, "_filtered", {
            value: [],
            writable: true,
            configurable: false,
            enumerable: false
         });
         // Fin Issue #5
      },
      setIcon: function(icon) {
         icon._marker = this;
         MarkerSetIcon.apply(this, arguments);
      },
      _prepare: function() {  // Convierte Arrays en Correctables.
         const data = getProperty(this, this.options.mutable);
         if(data === undefined) return false;  // La marca no posee los datos.
         this.options.corr.prepare(data);
         return true;
      },
      getData: function() {  // Devuelve los datos asociados a la marca.
         return getProperty(this, this.options.mutable);
      },
      /**
       *  Aplica una corrección a la marca.
       *
       *  @method apply
       *
       *  @param {string} name   Nombre de la corrección
       *  @param {Object} params Opciones que emplea la función de corrección
       *    para realizar su tarea.
       */
      apply: function(name) {
         const property = this.options.corr.getProp(name),
               sc       = this.options.corr[property],
               func     = sc[name],
               params   = func.prop.params;
         let   arr;

         // La resolución de issue #22, hace que esto ocurra sólo
         // si se registra la corrección después de haber añadido la marca.
         if(!(arr = this.options.corr.isCorrectable(property, this))) {
            this.options.corr._prepare(this.getData(), property);
            arr = getProperty(this.getData(), property);
         }

         if(!arr.apply(this, name)) return false;

         // Issue #5
         const filter = this.options.filter;
         if(filter) for(const f of filter.getFilters(property)) this.applyF(f);
         // Fin issue #5

         // Cambia las opciones de dibujo en función de los datos corregidos
         const icon = this.options.icon;
         const data = {[property]: arr};
         if(icon.options.params) icon.options.params.change(icon.options.converter.run(data));
         return true;
      },
      /**
       * Elimina una corrección de la marca.
       *
       * @method unapply
       *
       * @param {string} name    Nombre de la corrección.
       */
      unapply: function(name) {  // Elimina la corrección.
         const property = this.options.corr.getProp(name),
               sc       = this.options.corr[property],
               func     = sc[name],
               arr      = getProperty(this.getData(), property);

         if(!arr.unapply(name)) return false;

         // Issue #5
         const filter = this.options.filter;
         if(filter) for(const f of filter.getFilters(property)) this.unapplyF(f);
         // Fin issue #5

         const icon = this.options.icon;
         if(icon.options.params) icon.options.params.change(icon.options.converter.run({[property]: arr}));
         return true;
      }
   }

   // Issue #5
   const prototypeExtraFilter = {
      /**
       * Aplica un filtro a la marca.
       */
      applyF: function(name) {
         const filter = this.options.filter;
         const res = filter[name].call(this, filter.getParams(name));
         if(res) {
           if(this._filtered.indexOf(name) === -1) this._filtered.push(name) 
         }
         else this.unapplyF(name);
         return res;
      },
      /**
       * Lo elimina.
       */
      unapplyF: function(name) {
         const filter = this.options.filter;
         const idx = this._filtered.indexOf(name)
         if(idx !== -1) this._filtered.splice(idx, 1);
         return idx !== 1;
      }
   }
   // Fin issue #5


   // Sistema de correcciones
   const CorrSys = (function() {

      /**
       * Convierte un array en un array con esteroides. Básicamente, el array
       * (llamémoslo A) pasa a tener un atributo "corr", que es un objeto cuyas
       * claves son las correcciones aplicadas sobre A y cuyos valores son arrays de
       * longitud idéntica a A. Cada elemento de estos arrays represente el efecto
       * que ha tenido la corrección sobre el elemento correspondiente de A:
       *
       * - true:  la correción filtró el elemento.
       * - false: la corrección no filtró el elemento.
       * - undefined: la corrección no se aplicó sobre ese elemento.
       * - null: la corrección creó el elemento.
       *
       * Un ejemplo esquemático:
       *
       *            [ valor1   , valor2    , valor3]
       *  {
       *    corr1:  [ true     , true      , false ]
       *    corr2:  [ undefined, undefined ,  null ]
       *  }
       *
       * En este caso, el valor1 lo eliminan ambas correcciones. el valor2 sólo corr1, y
       * el valor3 lo añade corr2 y no lo elimina corr1.
       *
       */
      const Correctable = (function() {
         /**
          * Métodos y propiedas añadidas al objeto array cuyos valores
          * son susceptibles de corrección.
          *
          * @mixin
          */
         const Prototype = {
            /**
             * Devuelve las correcciones que han eliminado el elemento idx del array.
             *
             * @method filters
             *
             * @param {int} idx: Índice del elemento que se quiere consultar.
             * @returns {Array} Array con los nombres
             */
            filters: function(idx) {
               return Object.keys(this.corr).filter(n => this.corr[n][idx]);
            },
            /**
             * @typedef {Object} CorrValue
             * @property {} value   El valor del elemento o null, si alguna corrección lo eliminó.
             * @property {string[]} filters  Los nombres de las correcciones que eliminan el elemento.
             */

            /**
             * Generador que recorre el array y devuelve información sobre el valor
             * de los elementos y cuáles son las correcciones que los eliminan.
             *
             * @generator
             * @method walk
             *
             * @yields {CorrValue}
             */
            walk: function* () {
               for(let i=0; i<this.length; i++) {
                  const filters = this.filters(i);
                  yield {
                     value: filters.length>0?null:this[i],
                     filters: filters
                  }
               }
            },
            /**
             * Aplica una determinada corrección sobre el array.
             *
             * @method apply
             *
             * @param {function} func  Función que opera la corrección.
             *    Al invocarse este método debe haberse usado .bind() para
             *    que el contexto de esta función sea el objeto Marker
             *    en el que se encuentra el array.
             *
             * @param {Object} params  Objeto que se pasa a la función
             *    con valores que ésta usa en su funcionamiento.
             *
             * @returns {boolean}  Verdadero si provocó correcciones
             *    falso si no se hizo porque ya estaba aplicada.
             */
            apply: function(marker, name) {
               const func = this._sc[name],
                     add  = func.prop.add,
                     params = func.prop.params;

               // La corrección ya estaba aplicada: la desaplicamos.
               if(this.corr.hasOwnProperty(name)) this.unapply(name);

               if(add) {
                  const values = func.call(marker, null, this, params);
                  let num = values.length;
                  if(num === 0) return false;
                  this.push.apply(this, values);

                  this.corr[name] = new Array(this.length);
                  for(let i=this.length-num; i<this.length; i++) this.corr[name][i] = null;
                  this._count = undefined;

                  // Las correcciones que eliminan valores,
                  // pueden eliminar los valores añadidos.
                  for(const n in this.corr) {
                     this.corr[n].length = this.length;
                     if(this._sc[n].prop.add) continue;  // Es una corrección que añade valores.

                     const func = this._sc[n];
                     const params = marker.options.corr.getOptions(n).params;
                     for(let i=this.length-num; i<this.length; i++) this.corr[n][i] = func.call(marker, i, this, params);
                  }

               }
               else {
                  this.corr[name] = this.map((e, i) => func.call(marker, i, this, params));
                  //this.corr[name] = new Array(this.length);
                  //for(let i=0; i<this.length; i++) this.corr[name][i] = func.call(marker, this.length[i], params);
                  // Si la corrección ha filtrado algún valor:
                  if(this.corr[name].some(e => e)) this._count = undefined;
                  else return false;
               }

               return true;
            },
            /**
             * Deshace una determinada corrección hecha previamente.
             *
             * @param {string} name: Nombre de la corrección.
             *
             * @returns {boolean}  Verdadero si se desaplicó y provocó cambios, y
             *    false si no se hizo porque no estaba aplicada.
             */
            unapply: function(name) {
               if(!this.corr.hasOwnProperty(name)) return false; // No se había aplicado.

               if(this._sc[name].prop.add) {
                  const arr = this.corr[name];
                  delete this.corr[name];
                  let a, b;
                  for(let i=0; i<arr.length; i++) {
                     if(arr[i] === null) {
                        if(a === undefined) a=i;
                     }
                     else if(a !== undefined) {
                        b=i;
                        break;
                     }
                  }
                  if(a === undefined) return false;
                  if(b === undefined) b = arr.length;
                  this._count = undefined;
                  // Eliminamos los valores al array añadidos por esta corrección
                  this.splice(a, b-a);
                  for(const name in this.corr) this.corr[name].splice(a, b-a);
               }
               else {
                  const arr = this.corr[name];
                  delete this.corr[name];
                  if(arr.some(e => e)) this._count = undefined;
                  else return false;
               }

               return true;
            },
            /**
             * Limpia el array de todas las correcciones.
             */
            clear: function() {
               // Primer elemento que tiene un null (o sea, no formaba parte del array original.
               const idx = Math.min.apply(null, Object.keys(this.corr).map(k => this.corr[k].indexOf(null)).filter(e => e >= 0));
               this.length = idx;
               for(const name in Object.getOwnPropertyNames(this.corr)) delete this.corr[name];
            }
         }

         // Total de elementos excluyendo los eliminados por correcciones.
         function total() {
            if(this._count !== undefined) return this._count;
            this._count = 0;
            for(let i=0; i<this.length; i++) {
               if(this.filters(i).length === 0) this._count++;
            }
            return this._count;
         }

         // El iterador excluye los valores eliminados por las correcciones.
         function* iterator() {
            for(const e of this.walk()) {
               if(e.value !== null) yield e.value;
            }
         }

         function Correctable(arr, sc) {
            if(!(arr instanceof Array)) throw new TypeError("El objeto no es un array");
            const obj = Object.assign(Object.create(arr), Prototype);
            Object.defineProperties(obj, {
               // Sistema parcial de correcciones (sólo las correcciones que se aplican sobre el array).,
               "_sc": {
                  value: sc,
                  writable: false,
                  enumerable: false,
                  configurable: false
               },
               /**
                * Objeto que almacena las correcciones del array.
                * Cada clave es el nombre de la corrección y cada valor
                * un array 
                */
               "corr": {
                  value: {},
                  writable: false,
                  enumerable: false,
                  configurable: false,
               },
               // Pre-almacena el número de elementos para mejorar el rendimiento.
               "_count": {
                  value: arr.length,
                  writable: true,
                  configurable: false,
                  enumerable: false
               },
               /**
                * Longitud del array corregido, descontados los valores anulados.
                */
               "total": {
                  get: total,
                  enumerable: false,
                  configurable: false
               },
            });

            obj[Symbol.iterator] = iterator;

            return obj;
         }

         return Correctable;
      })();


      /**
       * Implementa un sistema para realizar correcciones sobre los atributos Array
       * de un objeto. Las correcciones consisten bien en filtrar sus elementos, bien
       * en añadir nuevos.
       *
       * El sistema de correcciones estará constituido por varias correcciones, cada
       * una de las cuales afectará a un atributo del objeto. Varias correcciones
       * podrán afectar a un mismo atributo, pero una corrección no podrá afectar a
       * varios atributos.
       *
       * Las marcas definidas como mutables definen automáticamente una opción "corr"
       * que es un objeto de este tipo:
       *
       *   const Centro = L.Marker.extend({ 
       *      options: {mutable: "feature.properties.data"}
       *   });
       *
       * La opción mutable, además de informar de que la marca contendrá datos mutables,
       * indica cuál es el atributo dónode se guardan esos datos.
       *
       * En este objeto es necesario registrar las correcciones que se quieren
       * realizar sobre los datos de las marcas. Por ejemplo:
       *
       *   Centro.prototype.options.corr.register("turno", {
       *      attr: "oferta",
       *      func: corrigeOferta,
       *      add: false
       *   });
       *
       * En este caso se registra para las marcas de tipo "Centro", la corrección "turno",
       * que actúa sobre el array "oferta" de los datos de la marca. En consecuencia, el
       * array será la propiedad "feature.properties.data.oferta" de la marca. Al ser "add"
       * false, la corrección elimina valores de oferta; y se podría haber obviado su
       * expresión, ya que sólo es obligatoria cuando es true. Por último, la corrección está
       * definida por la función corrigeOferta cuya definición podría ser esta:
       *
       *   function corrigeOferta(idx, oferta, opts) {
       *      return opts.inv ^ (oferta[idx].tur === opts.turno || oferta[idx].tur === "ambos");
       *   }
       *
       * O sea, recibe como primer argumento un índice del array, como segundo
       * argumento el array mismo y como tercero las opciones que dependen de
       * cómo haya configurado la corrección el usuario interactuando con la
       * interfaz.
       *
       * Para aplicar una corrección registrada sobre una marca:
       *
       *   marca.apply("turno", opts);
       *
       * donde el objeto opts se obtendrá a partir de algún formulario que sobre la corrección
       * haya rellenado el usuario. Para eliminar la corrección:
       *
       *   marca.unapply("turno");
       *
       * Otro tipo de correcciones son las que añaden valores:
       *
       *   Centro.prototype.options.corr.register("vt", {
       *      attr: "adjudicaciones",
       *      func: agregaVt,
       *      add: true
       *   });
       *
       *   function agregaVt(idx, adjudicaciones, opts) {
       *       const res = [];
       *       // Se añaden a res las vacantes telefónicas que se han dado al centro
       *       // y que se encontrarán entre los datos de la marca (accesible con this).
       *       return res;
       *   }
       *
       */
      const CorrSys = (function() {

         function CorrSys() {}

         /**
          * Registra una corrección,
          *
          * @method register
          *
          * @param {string} name        Nombre que identifica a la corrección.
          * @param {object} obj         Objeto que define la corrección
          * @param {string} obj.attr    Atributo sobre el que opera la corrección.
          *    Puede usarse la notación attrA.subattrB si es un atributo de un atributo.
          * @param {function} obj.func  Función que determina si se hace corrección o no.
          *    La función usa como contexto la marca a la que pertenece el objeto
          *    que contiene el array y recibirá tres parámetros: el primero será el
          *    un elemento individual del array, el segundo el array mismo y el tercero
          *    un objeto con valores necesarios para que se pueda ejecutar la función.
          * @param {boolean} obj.add    true si la corrección añade elementos al array,
          *    y cualquier otro valor asimilable a false si su intención es filtrar sus
          *    elementos. En el primer caso, la función deberá devolver un array con
          *    los elementos añadir, mientras que en el segundo caso deberá devolver
          *    true (el elemento se filtra) o false (el elemnento no se filtra).
          */
         CorrSys.prototype.register = function(name, obj) {
            // Internamente el objeto tiene la forma
            // {
            //   prop1: {
            //             corr1: func1,
            //             corr2: func2
            //          },
            //   prop2: {
            //             corr3: func3
            //          }
            // }
            //
            // propX son los nombres de las propiedades de los datos. Si la propiedad
            // está anidada se usa la notación del punto.
            // corrX es el nombre de la corrección.
            // funcX: Es la función de corrección a la que se le añaden algunas características.
            //       - nombre.
            //       - si es aditiva.
            //       - con qué parámetros se ha aplicado.
            const sc = this[obj.attr] = this[obj.attr] || {};
            if(sc.hasOwnProperty(name)) {
               console.warn(`${name}: La corrección ya está registrada`);
               return false;
            }
            // Apuntamos en una propiedad de la función, el nombre de la corrección,
            // si es aditiva, y con qué opciones se ha aplicado.
            obj.func.prop = {
               name: name,
               add: obj.add,
               params: null  // Issue #23.
            }
            sc[name] = obj.func;
            return this;
         }

         /**
          * Informa de si la propiedad de una marca es corregible.
          *
          * @param {string} attr     Nombre de la propiedad que se quiere investigar.
          * @param {L.Marker} marker Marca donde se encuentra la propiedad
          * @return {?Correctable}   La propia propiedad si es corregible, o nulo.
          */
         CorrSys.prototype.isCorrectable = function(attr, marker) {
            const arr = getProperty(marker.getData(), attr);
            if(arr && arr.corr) return arr;
            else null;
         }


         /**
          * Devuelve las correcciones aplicables a una propiedad.
          *
          * @param {?string} attr  Nombre de la propiedad. Si es null, devolverá
          *    los nombres de todas las correcciones.
          *
          * @returns {?Object}  Un objeto en que cada atributo es el nombre
          * de las corrección y cada valor la función que aplica tal corrección.
          */
         CorrSys.prototype.getCorrections = function(attr) {
            if(attr) return this[attr] || null;
            else {
               const res = {};
               for(const attr in this) Object.assign(res, this[attr]);
               return res;
            }
         }


         /**
          * Devuelve las propiedades corregibles.
          *
          * @returns {string[]}
          */
         CorrSys.prototype.list = function() {
            return Object.keys(this);
         } 

         /**
          * Prepara un objeto convirtiendo los arrays en Correctables.
          *
          * @param {Object} obj  El objeto que sufrirá el cambio.
          * @param {string} prop Un array concreto del objeto que se quiere convertir
          *    en Correctable. Si no se especifica, se buscan todos para los
          *    que se hayan definido al menos una corrección.
          */
         CorrSys.prototype.prepare = function(obj, prop) {
            const attrs = (prop === undefined)?this.list():[prop];
            for(let attr of attrs) {
               let o, name;
               const idx = attr.lastIndexOf(".");

               if(idx === -1) {
                  o = obj;
                  name = attr;
               }
               else {
                  o = getProperty(obj, attr.substring(0, idx));
                  if(o === undefined) {
                     console.error("El objeto carece de la propiedad " + attr.substring(0, idx));
                     continue
                  }
                  name = attr.substring(idx+1);
               }
               // Consideraremos que si falta el atributo, es un array vacío)
               if(o[name] === undefined) o[name] = [];
               if(!(o[name] instanceof Array)) {
                  console.error("La propiedad no es un Array");
                  continue
               }
               o[name] = new Correctable(o[name], this[attr]);
            }
         }

         /**
          * Devuelve la propiedad de los datos que corrige la corrección.
          *
          * @param {string} name  Nombre de la corrección
          *
          * @returns {string}
          */
         CorrSys.prototype.getProp = function(name) {
            for(const prop in this) {
               if(this[prop].hasOwnProperty(name)) return prop;
            }
         }

         /**
          * @typedef  {Object} OptionsCorr
          * @property {string}  name          Nombre de la corrección.
          * @property {boolean} add           true, si la corrección agrega valores.
          * @property {Object}  params        Opciones con que se ha aplicado la corrección.
          */

         // Issue #23
         /**
          * Devuelve las características de una corrección
          * (nombre, si es adictiva, y con qué opciones se aplicó).
          *
          * @param {string} name  Nombre de la corrección.
          *
          * @returns {OptionsCorr}
          */
         CorrSys.prototype.getOptions = function(name) {
            const sc = this[this.getProp(name)];
            if(!sc) throw new Error(`${name}: corrección no registrada`);
            return sc[name].prop;
         }

         /**
          * Establece unas nuevas opciones de aplicación de una determinada corrección.
          *
          * @params {string} name   Nombre de la corrección.
          * @params {Object} opts   Opciones de aplicación de la corrección.
          */
         CorrSys.prototype.setParams = function(name, opts) {
            const sc = this[this.getProp(name)];
            if(!sc) throw new Error(`${name}: corrección no registrada`);
            sc[name].prop.params = opts;
            return this;
         }
         // Fin issue #23

         return CorrSys;
      })();

      return CorrSys;
   })();

   
   // Issue #5
   /**
    * Sistema de filtros
    */
   const FilterSys = (function() {
      
      function ejectFiltered() {
      }

      /**
       * Constructor de la clase
       *
       * @param {function|L.LayerGroup} func  Función que define cómo se ve la marca filtrada.
       *    Si es una capa, la acción es hacerla desaperecer de esa capa.
       */
      function FilterSys(func) {
         Object.defineProperties(this, {
            transform: {
               get: function() { return this._transform; },
               set: function(value) { 
                  if(this.transform && this.hideable) this.transform.off("layeradd", this.ejectFiltered);
                  this._transform = value; 
                  if(this.hideable) this.transform.on("layeradd", this.ejectFiltered);
               },
               configurable: false,
               enumerable: false
            },
            _transform: {
               writable: true,
               enumerable: false,
               configurable: false
            }
         });
         this.transform = func;
      }

      Object.defineProperty(FilterSys.prototype, "hideable", {
         get: function() { return typeof this.transform !== "function"; },
         configurable: false,
         enumerable: false
      });

      /**
       * Expulsa automáticamente de la capa las marcas filtradas.
       */
      FilterSys.prototype.ejectFiltered = e => e.layer.refresh();

      /**
       * Registra una corrección
       *
       * @method register
       *
       * @param {string}         name  Nombre del filtro.
       * @param {Array<string>}  attrs Nombre de las propiedades de los datos
       *    cuyos valores afecta al filtro.
       * @param {function}       func  Función que filtra. Debe devolver
       *    true (sí filtra) o false.
       */
      FilterSys.prototype.register = function(name, obj) {
         if(this[name]) {
            console.warn(`${name}: El filtro ya está registrado`);
            return false;
         }
         if(!(obj.attrs instanceof Array)) obj.attrs = [obj.attrs];
         obj.func.prop = {
            depends: obj.attrs,
            enabled: false,
            params: undefined
         }
         this[name] = obj.func;
         return this;
      }

      /**
       * Devuelve los filtros habilitados cuyo resultados depende de
       * la propiedad cuyo nombre se suministra
       *
       * @method getFilters
       *
       * @param {string} attr Nombre del propiedad. Si no se facilita, devuelve
       *    todos los filtros habilitados.
       *
       * @retuns  {Array<string>}   Los nombres de los filtros.
       */
      FilterSys.prototype.getFilters = function(attr) {
         return Object.keys(this).filter(filter => 
            this[filter].prop.enabled
         && (
               !attr
               || this[filter].prop.depends.indexOf(attr) !== -1
            )
         );
      }

      /**
       * Habilita un filtro
       *
       * @param {string} name  El nombre del filtro que se quiere habilitar.
       */
      FilterSys.prototype.enable = function(name) {
         if(!this.hasOwnProperty(name) || this[name].prop.enabled) return false;
         this[name].prop.enabled = true;
         return this;
      }

      /**
       * Deshabilita un filtro
       *
       * @param {string} name  El nombre del filtro que se quiere deshabilitar.
       */
      FilterSys.prototype.disable = function(name) {
         if(!this.hasOwnProperty(name) || !this[name].prop.enabled) return false;
         this[name].prop.enabled = false;
         this[name].prop.params = undefined;
         return this;
      }

      /**
       * Establece unas nuevas opciones de aplicación para el filtro.
       *
       * @params {string} name   Nombre del filtro.
       * @params {Object} opts   Opciones de aplicación del filtro.
       * @params {boolean} enable   Fuerza a habilitar el filtro.
       *
       * @returns {boolean|FilterSys} false en caso de que el filtro no exista,
       *    esté deshabilitado, o estuviera habilitado, pero con las mismas opciones.
       */
      FilterSys.prototype.setParams = function(name, opts, enable) {
         if(!this.hasOwnProperty(name)) return false;
         if(!enable && !this[name].prop.enabled) return false;  // No se fuerza la habilitación y no está habilitado.
         else this[name].prop.enabled = true;
         if(equals(this[name].prop.params, opts)) return false;
         this[name].prop.params = opts;
         return this;
      }

      /**
       * Obtiene las opción de filrado de un determinado filtro.
       *
       * @param {string} name    El nombre del filtro.
       */
      FilterSys.prototype.getParams = function(name) {
         if(!this.hasOwnProperty(name)) throw new Error(`${name}: filtro no registrado`);
         return this[name].prop.params;
      }

      return FilterSys;
   })();
   // Fin issue #5

})();
