(function() {
   "use strict";

   L.utils = {};

   /**
    * Realiza peticiones AJAX. Uso:
    *
    *    load({
    *       url: 'image/centro.svg',
    *       params: {
    *          a: 1,
    *          b: 2
    *       },
    *       method: "GET",
    *       context: objeto,
    *       callback: funcion(xhr) { console.log("Éxito"); },
    *       failback: function(xhr) { console.log("Error"); },
    *    });
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
    * @returns {boolean]
    */
   function equals(o,p) {
      if(typeof o !== typeof p) return false;
      if(typeof o !== "object") return o == p;  // Comparación laxa.

      const oprop = Object.getOwnPropertyNames(o);
      const pprop = Object.getOwnPropertyNames(p);

      if(oprop.length !== pprop.length) return false;

      for(let i=0; i<oprop.length; i++) {
         const name = oprop[i];
         if(!equals(o[name], p[name])) return false;
      }
      return true;
   }

   // Issue #2
   /**
    * Facilita la construcción de clases de iconos.
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
    *    TODO:: Crear una opción semejante a fast para esta función que
    *       permita recrear siempre desde cero.
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

         return createDivIcon.call(this, arguments);
      },
      /**
       * Refresca el icono, en caso de que hayan cambiado las opciones de dibujo.
       * El método modifica directamente el HTML sobre el documento.
       */
      refresh: function() {
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


   const MarkerInitialize = L.Marker.prototype.initialize;
   const MarkerSetIcon = L.Marker.prototype.setIcon;

   /**
    * Métodos modificados o adicionales que tendrán los derivados de Marker que al
    * crearse con extend incluyan la opción mutable=true.
    */
   const prototypeExtra = {
      refresh: function() {
         if(!this.getElement()) return false;  // La marca no está en el mapa.
         this.options.icon.refresh();
      },
      initialize: function() {
         MarkerInitialize.apply(this, arguments);
         this.constructor.store.push(this);
         if(this.options.icon) this.options.icon._marker = this;
         // Issue #22: Convierte la propiedad a la que se conectan los datos
         // en un descriptor de acceso.
         const firstDot = this.options.mutable.indexOf(".");
         const feature = firstDot === -1?this.options.mutable:
                                         this.options.mutable.substring(0, firstDot);
         Object.defineProperty(this, "_" + feature, {
            value: undefined,
            writable: true,
            configurable: false,
            enumerable: false
         });
         Object.defineProperty(this, feature, {
            get: function() { return this["_" + feature]; },
            set: function(value) {
               this["_" + feature] = value;
               this._prepare();
            },
            configurable: false,
            enumerable: false
         });
         // Fin #Issue 22

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
      apply: function(name, params) {
         const property = this.options.corr.getProp(name),
               sc       = this.options.corr[property],
               func     = sc[name].bind(this);
         let   arr;

         func.prop = Object.assign({}, sc[name].prop);
         if(func.prop.add) func.prop.context = this;

         // La resolución de issue #22, hace que esto ocurra sólo
         // si se registra la corrección después de haber añadido la marca.
         if(!(arr = this.options.corr.isCorrectable(property, this))) {
            this.options.corr._prepare(this.getData(), property);
            arr = getProperty(this.getData(), property);
         }

         if(!arr.apply(func, params)) return false;

         // Cambia las opciones de dibujo en función de los datos corregidos
         const icon = this.options.icon;
         const data = icon.options.fast?{[property]: arr}:this.getData();
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

         const icon = this.options.icon;
         if(icon.options.params) icon.options.params.change(icon.options.converter.run({[property]: arr}));
         return true;
      }
   }


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
             * Devuelve el valor del elemento idx
             *
             * @method get
             *
             * @param {int} idx: Índice del elemento que se quiere consultar.
             * @returns {} El valor del elemento o null si alguna correción lo eliminó.
             */
            get: function(idx) {
               return this.filters(idx).length>0?null:this[i];
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
             * @returns {boolean}  Verdadero si se aplicó la correción y
             *    falso si no se hizo porque ya estaba aplicada.
             */
            apply: function(func, params) {
               const name = func.prop.name,
                     add  = func.prop.add,
                     marker = func.prop.context;

               // Si la correción ya está aplicada, sólo no se aplica en
               // caso de que se aplicara con las mismas opciones.
               if(this.corr.hasOwnProperty(name)) {
                  if(equals(this.corr[name].params, params)) return false;
                  else this.unapply(name);  // Hay que eliminar antes la corrección
               }

               if(add) {
                  const values = func(null, this, params);
                  let num = values.length;
                  this.push.apply(this, values);

                  this.corr[name] = new Array(this.length);
                  for(let i=this.length-num; i<this.length; i++) this.corr[name][i] = null;
                  if(num>0) this._count = undefined;

                  // Las correcciones que eliminan valores,
                  // pueden eliminar los valores añadidos.
                  for(const n in this.corr) {
                     this.corr[n].length = this.length;
                     if(this._sc[n].prop.add) continue;  // Es una corrección que añade valores.

                     const func = this._sc[n];
                     const params = this.corr[n].params;
                     for(let i=this.length-num; i<this.length; i++) this.corr[n][i] = func.call(marker, this[i], this, params);
                  }

               }
               else {
                  this.corr[name] = this.map((e, i) => func(i, this, params));
                  // Si la corrección ha filtrado algún valor:
                  //this.corr[name] = new Array(this.length);
                  //for(let i=0; i<this.length; i++) this.corr[name][i] = func(this.length[i], params);
                  if(this.corr[name].some(e => e)) this._count = undefined;
               }

               this.corr[name].params = params;
               return true;
            },
            /**
             * Deshace una determinada corrección hecha previamente.
             *
             * @param {string} name: Nombre de la corrección.
             *
             * @returns {boolean}  Verdadero si se desaplicó u false si no se hizo
             *    porque no estaba aplicada.
             */
            unapply: function(name) {
               if(!this.corr.hasOwnProperty(name)) return false; // No se había aplicado.

               if(this._sc[name].prop.add) {
                  const arr = this.corr[name];
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
                  if(a === undefined) return true;
                  if(b === undefined) b = arr.length;
                  this._count = undefined;
                  delete this.corr[name];
                  // Eliminamos los valores al array añadidos por esta corrección
                  this.splice(a, b-a);
                  for(const name in this.corr) this.corr[name].splice(a, b-a);
               }
               else {
                  if(this.corr[name].some(e => e)) this._count = undefined;
                  delete this.corr[name];
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
               for(const name in this.corr) {
                  if(this.corr.hasOwnProperty(name)) delete this.corr[name];
               }
            }
         }

         // Total de elementos excluyendo los eliminados por correcciones.
         const total = {
            get: function() {
               if(this._count !== undefined) return this._count;
               this._count = 0;
               for(let i=0; i<this.length; i++) {
                  if(this.filters(i).length === 0) this._count++;
               }
               return this._count;
            },
            enumerable: false,
            configurable: false
         }

         function Correctable(arr, sc) {
            if(!(arr instanceof Array)) throw new TypeError("El objeto no es un array");
            Object.assign(arr, Prototype);  // Evitamos hacer una subclase de array porque es menos eficiente.
            /**
             * Parte del sistema de correcciones que se aplica sobre el array.
             */
            Object.defineProperty(arr, "_sc", {
               value: sc,
               writable: false,
               enumerable: false,
               configurable: false
            });
            /**
             * Objeto que almacena las correcciones del array.
             * Cada clave es el nombre de la corrección y cada valor
             * un array 
             */
            Object.defineProperty(arr, "corr", {
               value: {},
               writable: false,
               enumerable: false,
               configurable: false,
            });
            // Pre-almacena el número de elementos para mejorar el rendimiento.
            Object.defineProperty(arr, "_count", {
               value: arr.length,
               writable: true,
               configurable: false,
               enumerable: false
            });
            Object.defineProperty(arr, "total", total);

            return arr;
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
       *   function corrigeOferta(value, oferta, opts) {
       *      return opts.inv ^ (value.tur === opts.turno || value.tur === "ambos");
       *   }
       *
       * O sea, recibe como primer argumento uno de los elementos del array, como segundo
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
       *   function agregaVt(value, adjudicaciones, opts) {
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
            const sc = this[obj.attr] = this[obj.attr] || {};
            if(sc.hasOwnProperty(name)) return false; // La corrección ya se ha registrado.
            // Apuntamos en una propiedad de la función, el nombre de la corrección y si es aditiva.
            obj.func.prop = {
               name: name,
               add: obj.add
            }
            sc[name] = obj.func;
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
          * @param {string} attr  Nombre de la propiedad.
          *
          * @returns {?Object}  Un objeto en que cada atributo es el nombre
          * de las corrección y cada valor la función que aplica tal corrección.
          */
         CorrSys.prototype.getCorrections = function(attr) {
            return this[attr] || null;
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

         return CorrSys;
      })();

      return CorrSys;
   })();

})();
