(function() {
   "use strict";

   /** @namespace */
   L.utils = {};

   /**
    * Realiza peticiones AJAX.
    * @memberof L.utils
    *
    * La petición será siempree asíncrona a menos que no se proporcionen
    * funciones de *callback* y *failback*.
    * 
    * @param {Object} params Objeto que contiene los parámetros para realizar
    *    la petición.
    * @param {String} params.url URL de la petición.
    * @param {String} params.method  Método HTTP de petición. Por defecto, será
    *    ``GET``, si no se envía parámetros y ``POST``, si sí se hace.
    * @param {Object} params.params Parámetros que se envían en la petición
    * @param {Function} params.callback   Función que se ejecutará si la
    *    petición tiene éxito. La función tendrá como único argumento el objeto
    *    {@link https://developer.mozilla.org/es/docs/Web/API/XMLHttpRequest XMLHttpRequest}
    * @param {Function} params.failback   Función que se ejecutará cuando
    *    la petición falle. También admite como argumento un objeto
    *    ``XMLHttpRequest``.
    * @param {Object} context Objeto que usará como contexto las funciones
    *    de *callback* y *failback*.
    *
    * @example
    *
    * load({
    *    url: 'image/centro.svg',
    *    callback: funcion(xhr) { console.log("Éxito"); },
    *    failback: function(xhr) { console.log("Error"); },
    * });
    *
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
    * Facilita la construcción de clases de iconos. Cada clase está asociada
    * a un estilo de icono distinto.
    * @memberof L.utils
    *
    * @param {string} name          Nombre identificativo para la clase de icono.
    * @param {Object} options       Opciones de construcción de la clase.
    * @param {string} options.css   Para un icono creado con CSS, el archivo .css.
    *    que define el aspecto.
    * @param {string|DocumentFragment|Document} options.html  HTML que define la
    *    plantilla del icono. Se puede pasar como:
    *    <ul>
    *    <li>Una cadena que contenga directamente el código HTML.
    *    <li>Un <code>DocumentFragment</code>, que sería lo que se obtiene como
    *        contenido de un <code>&lt;template&gt;</code>.
    *    <li>Un <code>Document</code>, que sería lo que se obtiene de haber hecho
    *    una petición AJAX y quedarse cn la respuesta XML.
    *    </ul>
    *
    * @param {string} options.url   Alternativamente a la opción anterior,
    *    la URL de un archivo donde está definido el icono (p.e. un SVG).
    *
    * @param {L.utils.Converter} options.converter  Objeto {@link
    *    L.utils.Converter} para la conversión de los datos en opciones de dibujo.
    *    
    * @param {Function} updater  Función que actualiza el aspecto del icono
    *    a partir de los nuevos valores que tengan las opciones de dibujo.
    *    Toma las opciones de dibujo (o una parte de ellas) y modifica el
    *    elemento DIV (o SVG. etc.) del icono para que adquiera un aspecto
    *    adecuado. Debe escribirse teniendo presente que pueden no pasarse todas
    *    las opciones de dibujo, sino sólo las que se modificaron desde
    *    la última vez que se dibujó el icono. Por tanto, debe escribirse la
    *    función para realizar modificaciones sobre el aspecto preexistente
    *    del icono, en vez de escribirse para recrear el icono desde la plantilla
    *
    * @retuns {Icon} La clase de icono que se desea crear.
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

   // Issue #5
   /**
    * Pone en escala de grises un icono filtrado o elimina
    * tal escala si ya no lo está.
    *
    * @this El elemento HTML del documento dentro del cual se encuentra
    * definida la marca 
    *
    * @param {boolean} filtered  Si el icono está filtrado o no.
    */
   L.utils.grayFilter = function(filtered) {
      if(filtered) this.style.filter = "grayscale(100%)";
      else this.style.removeProperty("filter");
   }
   
   /**
    * Redefine ``iconCreateFunction`` basándose en la definición original de
    * {@link https://github.com/Leaflet/Leaflet.markercluster
    * L.MarkerClusterGroup} para que el número del clúster sólo cuente los
    * centros no filtrados.
    *
    * @param {L.MarkerCluster} El cluster sobre el que se aplica la función.
    */
   L.utils.noFilteredIconCluster = function(cluster) {
		const childCount = cluster.getChildCount(),
            noFilteredChildCount = cluster.getAllChildMarkers().filter(e => !e.filtered).length;

		let c = ' marker-cluster-';
		if (childCount < 10) {
			c += 'small';
		} else if (childCount < 100) {
			c += 'medium';
		} else {
			c += 'large';
		}

		return new L.DivIcon({ html: '<div><span>' + noFilteredChildCount + '</span></div>', className: 'marker-cluster' + c, iconSize: new L.Point(40, 40) });
   }
   // Fin issue #5


   // Issue #21
   /**
    * Construye conversores entre objetos de distinto tipo.
    *
    * @class
    * @param {Array.<String>} params Enumera las nombres de las propiedades que tiene
    *    el objeto de destino.
    *
    * @classdesc Permite definir cómo un objeto se obtiene
    *    a partir de las propiedades de otro.
    *
    * @example
    *
    *    const converter = L.utils.Converter(["numadj", "tipo"])
    *                             .define("numadj", "adj", a => a.total)
    *                             .define("tipo");
    */
   L.utils.Converter = (function() {

      /**
       * Calcula la intersección entre dos *arrays*.
       * @function
       *
       * @param {Array} a1  Un ``Array``.
       * @param {Array} a2 El otro ``Array``.
       *
       * @return {Array}  Un array con los elementos que se encuentra en ambos *arrays*.
       */
      const intersection = (a1, a2) => a1.filter(e => a2.indexOf(e) !== -1);

      /**
       * Obtiene los nombres de las propiedades de un objeto,
       * así como los nombres de las propiedades anidadas.
       *
       * Sólo se extraen propiedades de objetos cuyo constructor
       * sea directamente ``Object``; y, opcionalmente, los índices
       * de los arrays.
       *
       * @param {Object}  o     El objeto a inspeccionar.
       * @param {Number}  depth Profundidad hasta la que se desea inspeccionar.
       *                         Para no definir ninguna, use ``null``.
       * @param {Boolean} arr   ``true``, si se desea inspeccionar las propiedades
       *                        que son ``arrays``.
       * @param {String}  attr  Nombre parcial de la propiedad. En principio,
       *                        sólo debería usarse este parámetro en las llamadas
       *                        recursivas que se hacen dentro de la propia función.
       *
       * @example
       *
       * o = {a: 1, arr: [2, 3], b: {c: 4}}
       * getNestedKeys(o)  // ["a", "arr", "b", "b.c"]
       * getNestedKeys(o, true)  // ["a", "arr", "arr.0", "arr.1", ,"b", "b.c"]
       *
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

      /**
       * Cuenta el número de veces que aparece un carácter en una cadena.
       *
       * @param {String}  La cadena donde se realiza la busqueda
       * @param {String}  El carácter que se desea contar (carácter, no subcadena).
       *
       * @returns {Number} El número de ocurrencias.
       */
      function countChar(string, ch) {
         let res = 0;
         for(const c of string) if(c===ch) res++;
         return res;
      }

      function Converter(params) {
         /**
          * Almacena los nombres de cada propiedad del objeto resultante,
          * de qué propiedades del objeto de partida dependen y cuál es
          * la función conversora entre estas últimas y la primera.
          * @type {Array}
          * @private
          */
         this._params = {}
         for(const p of params) this._params[p] = {
            enabled: true,
            depends: [],
            converter: null
         }
         /**
          * Guarda la profundidad máxima a la que se encuentran las propiedades
          * del objeto de partidad que influyen en las propiedades del objeto
          * resultado. Su valor calculándolo a partir de las dependencias que
          * se van declarando para cada propiedad al usar {@link L.utils.Converter#define}
          * @name L.utils.Converter#__depth
          * @private
          * @type {Number}
          *
          */
         Object.defineProperty(this, "__depth", {
            value: 1,
            writable: true,
            configurable: false,
            enumerable: false
         });
      }

      Object.defineProperties(Converter.prototype, {
         /**
          * Deshabilita una propiedad del objeto resultante. Esto significa
          * que cuando se obre la conversión del objeto, nunca se intentará
          * obtener el valor de esta propiedad.
          * @method L.utils.Converter#disable
          *
          * @param {string} param  Nombre de la propiedad.
          *
          * @returns {L.utils.Converter} El propio objeto.
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
          * Habilita una propiedad del objeto resultante.
          * @method L.utils.Converter#enable
          *
          * @param {string} param  Nombre de la propiedad.
          *
          * @returns {L.utils.Converter} El propio objeto.
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
          * Las propiedades definidas para el objeto resultante.
          * @name L.utils.Converter#params
          * @type Array.<String>
          */
         "params": {
            get: function() {
               return Object.keys(this._params);
            },
            configurable: false
         },
         /**
          * Las propiedades habilitadas para el objeto resultante.
          * @name L.utils.Converter#enabled
          * @type Array.<String>
          */
         "enabled": {
            get: function() {
               return this.params.filter(p => this._params[p].enabled);
            },
            configurable: false
         },
         /**
          * Informa de si todas las propiedades habilitadas tienen definida una conversión
          * @name L.utils.Converter#defined
          * @tyoe {Boolean}
          */
         "defined": {
            get: function() {
               return this.params.every(p => !this._params[p].enabled || this.isDefined(p));
            },
            configurable: false
         },
         /**
          * Define cómo obtener una propiedad del objeto resultante.
          * @method L.utils.Converter#define
          *
          * @param {String} param     El nombre de la propiedad.
          * @param {(Array.<String>|String)} properties Los nombres de las propiedades del objeto
          *       original que contribuyen a formar el valor de la propiedad del objeto
          *       resultante. Si la propiedad es una sola, puede evitarse el uso del
          *       *array* y escribir directamente el nombre. Si se omite este argumento,
          *       se sobreentiende que el nombre de la propiedad en el objeto original
          *       y el resultante es el mismo.
          * @param {Function} func    La función conversora. Debe definirse de modo
          *       que reciba como argumentos los valores de las
          *       propiedades que se enumeran en ``properties``, conservando el orden.
          *
          * @returns {?L.utils.Converter} El propio objeto de conversión o null, si
          *       la propiedad que se intenta definir, no se registró al crear
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
          * @method L.utils.Converter#isDefined
          *
          * @param {String} param  El nombre de la propiedad.
          *
          * @returns {Boolean}
          */
         "isDefined": {
            value: function(param) {
               return this._params[param].converter !== null;
            },
            writable: false,
            configurable: false
         },
         /**
          * Lleva a cabo la conversión del objeto suministrado. Sólo se
          * obtienen las propiedades que estén habilitadas y para las que
          * se pueda realizar la conversión, porque exista toda la
          * información requerida en el objeto.
          * @method L.utils.Converter#run
          *
          * @param {Object} o El objeto original
          *
          * @returns {Object} El objeto resultante.
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
          * @method L.utils.Converter#_getParams 
          * @private
          *
          * @param {Array.<String>} properties Lista con nombres de propiedades
          *
          * @returns {Boolean}
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
    * Devuelve el valor de la propiedad "anidada" de un objeto,
    * aunque comprueba que la no propiedad no sea realmente anidada.
    * @function
    *
    * @param {Object}  obj  El objeto del que se busca la propiedad.
    * @param {String}  name El nombre de la propiedad anidada.
    *
    * @example
    *
    * o = {a:1, b: {c:2, d:3}}
    * geProperty(o, "b.c") === o.b.c  // true
    * o = {a:1, "b.c": 2, "b.d": 3}
    * geProperty(o, "b.c") === o["b.c"]  // true
    */
   const getProperty = (obj, name) => obj.hasOwnProperty(name)?obj[name]:name.split(".").reduce((o, k) => o && o.hasOwnProperty(k)?o[k]:undefined, obj);

   /**
    * Comprueba si dos objetos son iguales a efectos de lo requerido
    * en este código.
    *
    * @param {Object} o  Un objeto.
    * @param {Object} p  El otro.
    *
    * @returns {Boolean}
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
    * Contruye el objeto. Una vez creado, pueden modificarse los valores de
    * los atributos; pero no añadir nuevos o eliminar alguno de los existentes.
    * @name Options
    * @class
    *
    * @param {Object} Objeto que contiene las propiedades y sus valores iniciales.
    *
    * @classdesc Clase que permite saber si el objeto ha cambiado algunos de
    * sus propiedades desde la última vez que se reseteó (con el método 
    * {@link Options#reset}.
    *
    * @example
    *
    *    const o = new Options({a: 1, b: 2, c: 3});
    *    o.updated  // false, ya que se fijaron valores nuevos.
    *    o.a = 0    // Fijamos un valor para a
    *    o.d = 7    // No tiene efecto. Con strict provocará un error.
    *    o.modified // {a: 1}. Sólo devuelve los valores actualizados.
    *    o.reset()
    *    o.updated  // true. Resetear marca el objeto como actualizado.
    *
    */
   const Options = (function() {

      /**
       * Nombres prohibidos para las propiedades
       * @private
       * @type {Array.<String>}
       */
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

      /**
       * Setter para las propiedades. Básicamente se encarga
       * de fijar el valor y apuntar en la propiedad como actualizada.
       * @memberof Options
       * @private
       *
       * @param {String} attr Nombre de la propiedad.
       * @param {*} value  Valor de la propiedad.
       */
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
       * Cambia varios valores a la vez.
       * @method Options#change
       *
       * @param {Obj} obj  Objeto que contien los nombres y los nuevos valores
       *    de las propiedades.
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
       * @name Options#updated
       * @type {Boolean}
       */
      Object.defineProperty(Options.prototype, "updated", {
         get: function() { return this._updated.size === 0; },
         enumerable: false,
         configurable: false
      });

      /**
       * Marca las opciones como actualizadas.
       * @method Options#reset
       */
      Object.defineProperty(Options.prototype, "reset", {
         value: function() { this._updated.clear(); },
         writable: false,
         enumerable: false,
         configurable: false
      })

      /**
       * Devuelve sólo las opciones modificadas
       * @name Options#modified
       * @type {Array.<String>}
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
    * Genera un ``HTMLElement`` a partir del parámetro que se le proporciona.
    * 
    * @param {(HTMLElement|Document|DocumentFragment|String)} Definición del elemento.
    *
    * @returns {HTMLElement} El elemento generado.
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

   /**
    * @name Icon
    * @extends L.DivIcon
    * @classdesc Extensión de <code>L.DivIcon</code> a fin de crear iconos
    *    definidos por una plantilla a la que se aplican cambios en sus detalles
    *    según sean cambien los valores de sus opciones de dibujo. Consulte
    *    {@link Icon#options} para conocer cuales son las opciones
    *    adicionales que debe proporcionar para que la clase sea capaz de
    *    manejar iconos mutables.
    * @class
    * @hideconstructor
    *
    * @example
    *
    * function updater(o) {
    *    const content = this.querySelector(".content");
    *    if(o.hasOwnProperty(tipo) content.className = "content " + o.tipo;
    *    if(o.hasOwnProperty(numadj) content.textContent = o.numadj;
    *    return this;
    * }
    *
    * const Icon = L.divIcon.extend({
    *    options: {
    *       className: "icon",
    *       iconSize: [25, 34],
    *       iconAnchor: [12.5, 34],
    *       url: "images/boliche.svg",
    *       updater: updater,
    *       converter: new L.utils.Converter(["numadj", "tipo"])
    *                             .define("numadj", "adj", a => a.total)
    *                             .define("tipo")
    *    }
    * });
    *
    *    const icon = new Icon();
    */
   L.DivIcon.extend = function(obj) {
      const Icon = DivIconExtend.call(this, obj);
      const options = Icon.prototype.options;
      if(options.updater && options.converter) {
         // Issue #2
         if(options.html) options.html = getElement(options.html);
         else if(!options.url) throw new Error("Falta definir las opciones html o url");
         /**
          * Informa de si la clase de icono se encuentra lista para utilizarse.
          * @name Icon.ready
          * @type {Boolean}
          */
         Object.defineProperty(Icon, "ready", {
            get: () => Icon.prototype.options.html,
            configurable: false,
            enumerable: false
         });
         /**
          * Define qué hacer cuando la clase de icono esté lista para usarse.
          * @memberof Icon
          * @async
          *
          * @param {Function} func_success  Define la acción que se realizará en caso
          *    de que la creación de la clase de icono haya tenido éxito.
          * @param {Function} func_fail Define la acción a realizar en caso de que
          * la creación del icono haya fallado.
          */
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

   /**
    * Opciones para la {@link Icono}. A las que reconoce la clase
    * {@link https://leafletjs.com/reference-1.4.0.html#icon  L.DivIcon de Leaflet},
    * añade algunas más.
    * @namespace Icon.prototype.options
    *
    * @property {Options} params Define cuáles son las opciones de dibujo del icono.
    *    El valor de esta opción, sin embargo, se calcula a partir de la información
    *    proporcionada en el objeto {@link L.utils.Converter} por lo que
    *    <strong>no</strong> debe facilitarse.
    * @property {HTMLElement|String|DocumentFragment|Document} html Plantilla
    *    para el dibujo del icono.
    * @property {String} url URL donde se escuentra la plantilla para el dibujo. Es
    *    una opción alternativa a la anteior.
    * @property {Converter} converter  Objeto que define la conversión entre los
    *    datos asociados a la marca y las opciones de dibujo.
    * @property {Function} updater  Función que actualiza el dibujo usando los nuevos
    *    valores de las opciones de dibujo. Debe construirse de forma que se tenga
    *    en cuenta que se pasarán sólo las opciones que cambiaron desde el último
    *    dibujado y que, por tanto, sólo deben cambiarse los detalles del dibujo que
    *    dependen de las opciones pasadas y dejar inalterados el resto de detalles.
    *    El contexto de la función es el elemento HTML que representa al icono.
    */

   const IconPrototype = {
      /**
       * Wrapper para el método homónimo de <code>L.DivIcon</code>. Su funcion
       * es preparar el valor <code>options.html</code> usando la plantilla y 
       * las opciones de dibujo antes de que el método original actúe.
       * @memberof Icon.prototype
       *
       * @returns {HTMLElement}
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
         if(filter && this._marker.filtered && !filter.hideable) {
            filter.transform.call(div, true);
         }
         // Fin issue #5
         return div
      },
      /**
       * Refresca el icono, en caso de que hayan cambiado las opciones de dibujo.
       * El método modifica directamente el HTML sobre el documento.
       * @memberof Icon.prototype
       *
       * @return {Boolean} <code>true</code> si se redibujó realmente el icono.
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

   /**
    * Opciones para {@link Marker}. A las generales que permite
    * {@link https://leafletjs.com/reference-1.4.0.html#marker L.Marker de Leaflet}
    * añade algunas más
    * @namespace Marker.prototype.options
    *
    * @property {String} mutable  Nombre de la propiedad a la que se conectan los datos de
    *    las marcas. Si es una propiedad anidada puede usarse la notación de punto.
    *    Por ejemplo, <code>feature.properties</code>.
    * @property {(L.LayerGroup|String|Function)} filter Habliita un {@link CorrSys sistema de filtros}
    *    para la clase de marca. Puede adoptar tres valores distintos:
    *    <ul>
    *    <li>La capa a la que se agregan las marcas de esta clase. En este caso, el efecto
    *       del filtro será eliminar del mapa las marcas filtradas.
    *    <li>Un nombre que se tomara como el nombre de la clase CSS a la que se quiere que
    *    pertenezcan las marcas filtradas.
    *    <li>Una función de transformación que se aplicará al elemento HTML que
    *    representa en el mapa cada marca filtrada. El contexto de esta función será el propio
    *    elemento HTML.
    *    </ul>
    */

   /**
    * @name Marker
    * @extends L.Marker
    * @classdesc  Extiende la clase {@link https://leafletjs.com/reference-1.4.0.html#marker L.Marker},
    *    a fin de permitir que los iconos sean variables y mutables a partir de los datos definidos.
    *    Consulte cuáles son las {@link Marker#options opciones que lo habiliten}.
    * @class
    * @hideconstructor
    *
    * @example
    *
    * const Marker = L.Marker.extend({
    *    options: {
    *       mutable: "feature.properties",
    *       filter: L.utils.grayFilter
    *    }
    * });
    */
   L.Marker.extend = function() {
      const Marker = MarkerExtend.apply(this, arguments);
      const options = Marker.prototype.options;
      if(options.mutable) {
         options.corr = new CorrSys();
         Object.assign(Marker.prototype, prototypeExtra);
         /**
          * Almacena todas las marcas creadas de este tipo
          * @name Marker.store
          * @type {Array.<Marker>}
          */
         Object.defineProperty(Marker, "store", {
            value: [],
            configurable: false,
            enumerable: false,
            writable: false
         }); 
         /**
          * Vacía {@link Marker.store} de marcas.
          * @memberof Marker
          */
         Marker.reset = function() { this.store.length = 0; }
         Marker.remove = removeMarker;
         Marker.invoke = invokeMarker;
         Marker.register = registerCorrMarker;
         Marker.correct = doCorrMarker;
         Marker.uncorrect = undoCorrMarker;
         // Issue #5
         if(options.filter) options.filter = new FilterSys(options.filter);
         // No puede definirse en prototypeExtra:
         // https://stackoverflow.com/questions/40211725/object-assign-getters-and-setters-in-constructor
         Object.defineProperty(Marker.prototype, "filtered", {
            get: function() { 
               if(!this.options.filter) throw new Error("No se ha definido filtro. ¿Se ha olvidado de incluir la opción filter al crear la clase de marca?");
               return this._filtered.length > 0; 
            },
            configurable: false,
            enumerable: false
         });
         Marker.registerF = registerFilterMarker;
         Marker.filter = filterMarker;
         Marker.unfilter = unfilterMarker;
         Marker.setFilterStyle = setFilterStyleMarker;
         // Fin issue #5
      }
      return Marker;
   }

   /**
    * Elimina una marca del almacén donde se guardan
    * todos los objetos marca de una misma clase.
    * @method Marker.remove
    *
    * @param {Marker} marker  La marca que se desea eliminar.
    *
    * @returns {Boolean}  El éxito en la eliminación.
    */
   function removeMarker(marker) {
      const idx = this.store.indexOf(marker);
      if(idx === -1) return false;
      this.store.splice(idx, 1);
      return true;
   }

   /**
    * Ejecuta un método para todas las marcas almacenadas en store.
    * @method Marker.invoke
    *
    * @param {String} method  Nombre del métodos
    * @param {...*} param Parámetros que se pasan al método
    */
   function invokeMarker(method) {
      for(const marker of this.store) {
         const args = Array.prototype.slice.call(arguments, 1);
         this.prototype[method].apply(marker, args);
      }
   }

   /**
    * Registra una corrección en el sistema de correcciones de la marca.
    * @method Marker.register
    *
    * @param {String} name        Nombre que identifica a la corrección.
    * @param {Object} obj         Objeto que define la corrección
    * @param {String} obj.attr    Propiedad sobre el que opera la corrección.
    *    Puede usarse la notación de punto para propiedades anidadas.
    * @param {Function} obj.func  Función que determina si se hace corrección o no.
    *    Cuando la función corrige el array actúa eliminado valores y para
    *    ello se ejecuta repetidamente sobre todos los elementos del *array*. Usa
    *    como contexto la marca a la que pertenece el objeto
    *    que contiene el *array*, y recibe tres parámetros: el primero es
    *    el índice del elemento que se comprueba, el segundo el array mismo
    *    y el tercero un objeto con las opciones aplicables de corrección.
    *    Debe devolver <code>true</code> (el elemento debe eliminarse) o
    *    <code>false</code> (no debe hacerlo). La función también puede añadir
    *    nuevos elementos, en vez de eliminar los existentes. Vea la información
    *    sobre el argumento <code>add</code> para saber más sobre ello.
    * @param {Boolean} obj.add    <code>true</code> si la corrección añade
    *    elementos al array, y cualquier otro valor asimilable a <code>false</code>
    *    si su intención es eliminar elementos. Si los añade, la función deberá
    *    devolver un *array* con los elementos a añadir y sólo se ejecuta una vez,
    *    por lo que su primer argumento que representa el índice del elemento vale
    *    <code>null</code>.
    *
    * @example
    * Centro.register("adjpue", {
    *                   attr: "adj",
    *                   func: function(idx, adj, opts) {
    *                      return !!(opts.inv ^ (opts.puesto.indexOf(adj[idx].pue) !== -1));
    *                   },
    *                })
    *       .register("vt+", {
    *                   attr: "adj",
    *                   func: function(idx, adj, opts) {
    *                      const data = this.getData();
    *                      //Se deberían obtener las vacantes telefónicas de estos datos...
    *                      return ["Interino", "Interino"];
    *                   },
    *                   add: true
    *                });
    */
   function registerCorrMarker() {
      return CorrSys.prototype.register.apply(this.prototype.options.corr, arguments) && this;
   }


   // Issue #23
   /**
    * Aplica una corrección a las marcas de una clase.
    * @method Marker.correct
    *
    * @params {String} name   Nombre de la corrección.
    * @prams {Object} params  Opciones de aplicacion de la corrección.
    *
    * @example
    * Centro.correct("adjpue", {puesto: ["11590107", "00590059"]})
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
      return this;
   }

   /**
    * Elimina una correccón de las marcas de una clase.
    * @method Marker.uncorrect
    *
    * @params {String} name   Nombre de la corrección.
    *
    * @example
    * marca.uncorrect("adjpue");
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
      return this;
   }
   // Fin issue #23

   // Issue #5
   /**
    * Registra para una clase de marcas un filtro.
    * @method Marker.registerF
    *
    * @param {String}         name  Nombre del filtro.
    * @param {Array.<String>}  attrs Nombre de las propiedades de los datos
    *    cuyos valores afectan al filtro.
    * @param {Function}       func  Función que filtra. Debe devolver
    *     <code>true</code> (sí filtra) o <code>false</code>.
    */
   function registerFilterMarker() {
      const filter = this.prototype.options.filter;
      if(!filter) throw new Error("No se ha definido filtro. ¿Se ha olvidado de incluir la opción filter al crear la clase de marca?");

      return FilterSys.prototype.register.apply(this.prototype.options.filter, arguments) && this;
   }

   /**
    * Habilita un filtro para las marcas de una clase
    * @method Marker.filter
    *
    * @param {string} name    Nombre del filtro.
    * @param {Object} params  Opciones para el filtrado.
    */
   function filterMarker(name, params) {
      const filter = this.prototype.options.filter;
      if(!filter) throw new Error("No se ha definido filtro. ¿Se ha olvidado de incluir la opción filter al crear la clase de marca?");

      if(!filter.setParams(name, params, true)) return false;  //El filtro no existe o ya estaba habilitado con los mismo parámetros.
      for(const marker of this.store) marker.applyF(name);
      return this;
   }

   /**
    * Deshabilita un filtro para las marcas de una clase
    * @method Marker.unfilter
    *
    * @param {string} name    Nombre del filtro.
    */
   function unfilterMarker(name) {
      const filter = this.prototype.options.filter;
      if(!filter) throw new Error("No se ha definido filtro. ¿Se ha olvidado de incluir la opción filter al crear la clase de marca?");

      if(!filter.disable(name)) return false;  // El filtro no existe o está deshabilitado.
      for(const marker of this.store) marker.unapplyF(name);
      return this;
   }

   /**
    * Cambia el estilo de filtro.
    * @method Marker.setFilter
    *
    * @param {Function|String|L.LayerGroup}  style     Estilo del filtro.
    *    Consulte el valor de la {@link Marker#options opción filter} para
    *    saber qué valor de estilo suministrar.
    */
   function setFilterStyleMarker(style) {
      const filter = this.prototype.options.filter;
      if(!filter) throw new Error("No se ha definido filtro. ¿Se ha olvidado de incluir la opción filter al crear la clase de marca?");

      filter.setStyle(style, this);
   }
   // Fin issue #5

   const MarkerInitialize = L.Marker.prototype.initialize;
   const MarkerSetIcon = L.Marker.prototype.setIcon;

   // Métodos modificados o adicionales que tendrán los derivados de Marker que al
   // crearse con extend incluyan la opción mutable=true.
   /** @lends Marker.prototype */
   const prototypeExtra = {
      /**
       * Refresca el dibujo de la marca.
       *
       * @param {L.LayerGroup} force   Si se pasa la capa y la marca, aunque
       *    no filtrada, no se encuentra en el mapa, fuerza su adición a la
       *    misma.
       */
      refresh: function(force) {
         let div = this.getElement();
         // Issue #5
         const filter = this.options.filter;
         if(filter) {
            if(filter.hideable) {
               if(this.filtered) {
                  // Puede estar en la capa, aunque no se encuentre en el map,
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
            else {
               if(div) filter.transform.call(div, this.filtered);
               else if(force) {
                  force.addLayer(this);
                  div = this.getElement();
               }
            }
         }
         // Fin issue #5
         if(!div) return false;  // La marca no está en el mapa.
         this.options.icon.refresh();
      },
      /**
       * Wrapper para el método homónimo original. Se encarga de de
       * convertir en un descriptor de acceso la propiedad a la que
       * se conectan los datos, de almacenar en {@link Marker.store}
       * la nueva marca, de algunos aspectos menores más.
       */
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
      /**
       * Wrapper para el método homónimo original. Se encarga de conectar
       * al icono la marca.
       */
      setIcon: function(icon) {
         icon._marker = this;
         MarkerSetIcon.apply(this, arguments);
      },
      /**
       * Prepara los datos recién conectado a la marca. Es un método interno
       * del que hace uso, el descriptor de acceso al que se fijan los datos.
       * @private
       */
      _prepare: function() {  // Convierte Arrays en Correctables.
         //TODO:: Usar getData();
         const data = getProperty(this, this.options.mutable);
         if(data === undefined) return false;  // La marca no posee los datos.
         this.options.corr.prepare(data);
         return true;
      },
      /**
       * Devuelve los datos asociados a la marca.
       */
      getData: function() {  // Devuelve los datos asociados a la marca.
         return getProperty(this, this.options.mutable);
      },
      /**
       *  Aplica una corrección a la marca. No debería usarse directamente, 
       *  ya que las correcciones deben aplicarse a través de {@link Marker.correct}.
       *  @private
       *
       *  @param {String} name   Nombre de la corrección
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
       * Elimina una corrección de la marca. No debería usarse directamente, 
       * ya que las correcciones deben eliminarse a través de {@link Marker.uncorrect}.
       * @private
       *
       * @param {String} name    Nombre de la corrección.
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
      },
      // Issue #5
      /**
       * Aplica un filtro a la marca. No debería usarse directamente, 
       * ya que los filtros deben aplicarse a través de {@link Marker.filter}.
       * @private
       *
       * @param {String} El nombre del filtro.
       */
      applyF: function(name) {
         const filter = this.options.filter;
         if(!filter) throw new Error("No se ha definido filtro. ¿Se ha olvidado de incluir la opción filtro al crear la clase de marca?");
         const res = filter[name].call(this, filter.getParams(name));
         if(res) {
           if(this._filtered.indexOf(name) === -1) this._filtered.push(name) 
         }
         else this.unapplyF(name);
         return res;
      },
      /**
       * Elimina un filtro de la marca.No debería usarse directamente, 
       * ya que los filtros deben eliminarse a través de {@link Marker.unfilter}.
       * @private
       *
       * @param {String} El nombre del filtro.
       */
      unapplyF: function(name) {
         const filter = this.options.filter;
         if(!filter) throw new Error("No se ha definido filtro. ¿Se ha olvidado de incluir la opción filtro al crear la clase de marca?");
         const idx = this._filtered.indexOf(name)
         if(idx !== -1) this._filtered.splice(idx, 1);
         return idx !== 1;
      }
      // Fin issue #5
   }


   const CorrSys = (function() {

      /*
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

      /**
       * Construye el <code>Correctable</code>.
       * @name Correctable
       * @class
       * @classdesc La clase permite apuntar sobre el array qué elementos han sido filtrados
       *    por cuáles correcciones y qué nuevos elementos han sido añadidos y por cuál corrección.
       * @param {Array} arr El array original.
       * @param {Object} sc Parte del {@link CorrSys sistema de correcciones} definido para la
       *    marca en la que está el array que se aplica exclusivamente al array.
       */
      const Correctable = (function() {
         /** @lends Correctable.prototype */
         const Prototype = {
            /**
             * Devuelve las correcciones que han eliminado el elemento idx del array.
             *
             * @param {int} idx Índice del elemento que se quiere consultar.
             * @returns {Array} Array con los nombres
             */
            filters: function(idx) {
               return Object.keys(this.corr).filter(n => this.corr[n][idx]);
            },
            /**
             * @typedef {Object} Correctable.CorrValue
             * @property {?*} value   El valor del elemento o null, si alguna corrección lo eliminó.
             * @property {Array.<String>} filters  Los nombres de las correcciones que eliminan el elemento.
             */

            /**
             * Generador que recorre el array y devuelve información sobre el valor
             * de los elementos y cuáles son las correcciones que los eliminan.
             * @generator
             *
             * @yields {Correctable.CorrValue}
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
             * @param {Marker} marker  Marca a la que pertenece el {@link Correctable}
             * @param {String} name    El nombre de la corrección.
             *
             * @returns {boolean}  <code>true</code> Si la correción
             *    provocó algún cambio en el array.
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
             * @param {String} name: Nombre de la corrección.
             *
             * @returns {Boolean}  <code>true</code> si eliminar la corrección
             *    provocó cambios en el *array*.
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

         // ¿Cómo narices se incluye esto en la documentación.
         /**
          * Iterador que excluye los valores anulados.
          * @generator
          */
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
                * @name Correctable#total
                * @type {Number}
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
       * @name CorrSys
       * @class
       * @hideconstructor
       * @classdesc Implemeta un sistema para realizar correcciones sobre los atributos
       * *array* de un objeto. Las correcciones consisten bien en filtrar sus elementos,
       * bien en añadir nuevos.
       *
       * El sistema de correcciones estará constituido por varias correcciones, cada
       * una de las cuales afectará a un atributo del objeto. Varias correcciones
       * podrán afectar a un mismo atributo, pero una corrección no podrá afectar a
       * varios atributos.
       *
       * Las {@link Marker marcas definidas como mutables} definen
       * automáticamente una opción <code>corr</code> que es un objeto de este tipo:
       *
       */
      const CorrSys = (function() {

         function CorrSys() {}

         /**
          * Registra una corrección.
          * @method CorrSys#register
          *
          * @param {String} name Nombre de la corrección
          * @param {Object} obj  Objeto que define la corrección. Consulte {@link Marker.register}
          *    para saber cómo es este objeto.
          *
          * @returns {CorrSys} El propio objeto
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
          * @method CorrSys.prototype.isCorrectable
          *
          * @param {String} attr     Nombre de la propiedad que se quiere investigar. Es admisible
          *    la notación de punto para propiedades anidadas.
          * @param {Marker} marker Marca donde se encuentra la propiedad
          * @returns {?Correctable}   La propia propiedad si es corregible, o nulo.
          */
         CorrSys.prototype.isCorrectable = function(attr, marker) {
            const arr = getProperty(marker.getData(), attr);
            if(arr && arr.corr) return arr;
            else null;
         }


         /**
          * Devuelve las correcciones aplicables a una propiedad.
          * @method CorrSys#getCorrections
          *
          * @param {?String} attr  Nombre de la propiedad. Si es <code>null</code>, devolverá
          *    los nombres de todas las correcciones.
          *
          * @returns {?Object.<String, Function>}  Un objeto en que cada atributo es el nombre
          * de las corrección y cada valor la función que la define.
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
          * @method CorrSys#list
          *
          * @returns {Array.<String>}
          */
         CorrSys.prototype.list = function() {
            return Object.keys(this);
         } 

         /**
          * Prepara un objeto convirtiendo los arrays en Correctables.
          * @method CorrSys#prepare
          *
          * @param {Object} obj  El objeto que sufrirá el cambio.
          * @param {String} prop Un array concreto del objeto que se quiere convertir
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
          * @method CorrSys#getProp
          *
          * @param {string} name  Nombre de la corrección
          *
          * @returns {string} El nombre de la propiedad en notación de punto.
          */
         CorrSys.prototype.getProp = function(name) {
            for(const prop in this) {
               if(this[prop].hasOwnProperty(name)) return prop;
            }
         }

         /**
          * @typedef  {Object} OptionsCorr
          * @property {String}  name          Nombre de la corrección.
          * @property {Boolean} add           true, si la corrección agrega valores.
          * @property {Object}  params        Opciones con que se ha aplicado la corrección.
          */

         // Issue #23
         /**
          * Devuelve las características de una corrección
          * (nombre, si es adictiva, y con qué opciones se aplicó).
          * @method CorrSys#getOptions
          *
          * @param {String} name  Nombre de la corrección.
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
          * @method CorrSys#setParams
          *
          * @params {String} name   Nombre de la corrección.
          * @params {Object} opts   Opciones de aplicación de la corrección.
          *
          * @returns {CorrSys}   El propio objeto.
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
    * Construye un sistema de filtros
    * @name FilterSys
    * @class
    * @param {Function|L.LayerGroup|string} style  Estilo de filtrado.
    *    Consulte el significado del {@link Marker#options valor de
    *    la opción filter para Marker.prototype.options}.
    * @classdesc Implementa un sistema de filtros para las marcas.
    */
   const FilterSys = (function() {
      
      function FilterSys(style) {
         Object.defineProperties(this, {
            transform: {
               get: function() { return this._transform; },
               set: function(value) { 
                  if(this.hideable) this.transform.off("layeradd", this.ejectFiltered);
                  if(typeof value === "string") {
                     this._transform = function(filtered) {
                        if(filtered) this.classList.add(value);
                        else this.classList.remove(value);
                     }
                  }
                  else {
                     this._transform = value; 
                     if(this.hideable) this.transform.on("layeradd", this.ejectFiltered);
                  }
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
         this.transform = style;
      }

      /**
       * Informa de si la marca debe ocultarse.
       * @name FilterSys#hideable
       * @type {Boolean}
       */
      Object.defineProperty(FilterSys.prototype, "hideable", {
         get: function() { return this.transform instanceof L.LayerGroup; },
         configurable: false,
         enumerable: false
      });

      /**
       * Expulsa automáticamente de la capa las marcas filtradas.
       * @method FilterSys#ejectFiltered
       */
      FilterSys.prototype.ejectFiltered = e => e.layer.refresh();

      /**
       * Registra una corrección
       * @memberof FilterSys
       *
       * @param {String}         name  Nombre del filtro.
       * @param {Array.<String>}  attrs Nombre de las propiedades de los datos
       *    cuyos valores afecta al filtro.
       * @param {Function}       func  Función que filtra. Debe devolver
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
       * Devuelve los filtros habilitados cuyo resultados dependen de
       * la propiedad cuyo nombre se suministra
       * @memberof FilterSys
       *
       * @param {?String} attr Nombre de la propiedad. Si no se facilita, devuelve
       *    todos los filtros habilitados.
       *
       * @retuns  {Array.<string>}   Los nombres de los filtros.
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
       * @memberof FilterSys
       *
       * @param {String} name  El nombre del filtro que se quiere habilitar.
       */
      FilterSys.prototype.enable = function(name) {
         if(!this.hasOwnProperty(name) || this[name].prop.enabled) return false;
         this[name].prop.enabled = true;
         return this;
      }

      /**
       * Deshabilita un filtro
       * @memberof FilterSys
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
       * @memberof FilterSys
       *
       * @params {String} name   Nombre del filtro.
       * @params {Object} opts   Opciones de aplicación del filtro.
       * @params {Boolean} enable   Fuerza a habilitar el filtro.
       *
       * @returns {(Boolean|FilterSys)} <code>false</code> en caso de que el filtro
       *    no exista, esté deshabilitado, o estuviera habilitado, pero con
       *    las mismas opciones.
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
       * @memberof FilterSys
       *
       * @param {string} name    El nombre del filtro.
       *
       * @return {Object}
       */
      FilterSys.prototype.getParams = function(name) {
         if(!this.hasOwnProperty(name)) throw new Error(`${name}: filtro no registrado`);
         return this[name].prop.params;
      }

      /**
       * Modifica el estilo de filtrado.
       * @memberof FilterSys
       *
       * @param {Function|L.LayerGroup|String} style  Estilo de filtrado. Consulte el
       * {@link Marker#options valor de la opción filter para Marker.prototype.options}
       * @param {Marker} markerClass    Clase de marca a la que pertenecen
       *    todas las marcas que usan este objeto de filtrado.
       */
      FilterSys.prototype.setStyle = function(style, markerClass) {
         const old = this.transform,
               exhideable = old instanceof L.LayerGroup;
         this.transform = style;

         // Si el estilo anterior ocultaba las marcas y el nuevo no lo hace,
         // las marcas filtradas deben añadirse a la capa y ésta debe pasarse
         // a refresh como parámetro.
         markerClass.invoke("refresh", exhideable && !this.hideable && old);
      }

      return FilterSys;
   })();
   // Fin issue #5

})();
