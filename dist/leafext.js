(function() {
   "use strict";

   /** @namespace */
   L.utils = {};

   /**
    * Realiza peticiones `AJAX
    * <https://developer.mozilla.org/es/docs/Web/Guide/AJAX>`_. Las peticiones
    * serán asíncronas, a menos que no se proporcionen función de *callback* ni
    * *failback*.
    * @memberof L.utils
    *
    * @param {Object} params Objeto que contiene los parámetros para realizar
    *    la petición.
    * @param {String} params.url URL de la petición.
    * @param {String} params.method  Método HTTP de petición. Por defecto, será
    * ``GET``, si no se envía parámetros y ``POST``, si sí se hace.
    * @param {Object} params.params Parámetros que se envían en la petición
    * @param {Function} params.callback   Función que se ejecutará si la
    * petición tiene éxito. La función tendrá como único argumento el objeto
    * `XMLHttpRequest <https://developer.mozilla.org/es/docs/Web/API/XMLHttpRequest>`_.
    * @param {Function} params.failback   Función que se ejecutará cuando
    * la petición falle. También admite como argumento un objeto
    * ``XMLHttpRequest``.
    * @param {Object} params.context Objeto que usará como contexto las funciones
    * de *callback* y *failback*.
    *
    * @example
    *
    * load({
    *    url: 'image/centro.svg',
    *    callback: function(xhr) { console.log("Éxito"); },
    *    failback: function(xhr) { console.log("Error"); },
    * });
    *
    */
   function load(params) {
      const xhr = new XMLHttpRequest();
      let qs = '', 
          method = (params.method || (params.params?"POST":"GET")).toUpperCase(),
          contentType = params.contentType ||  "application/x-www-form-urlencoded";

      if(params.params) {
         if(method === "GET" || params.contentType === "application/x-www-form-urlencoded") {
            qs = Object.keys(params.params).map(k => k + "=" + encodeURIComponent(params.params[k])).join('&');
         }
         else if(params.contentType.indexOf("application/json") !== -1) {
            qs = JSON.stringify(params.params);
         }
         else throw new Error(`${params.contentType}: Tipo de contenido no soportando`);

         if(method === "GET") {
            params.url = params.url + "?" + qs;
            qs = "";
         }
      }

      xhr.open(method, params.url, !!params.callback);
      for(const header in params.headers || {}) {
         xhr.setRequestHeader(header, params.headers[header]);
      }
      if(method === "POST") xhr.setRequestHeader("Content-Type", params.contentType);

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
    * plantilla del icono. Se puede pasar como:
    *    
    * * Una cadena que contenga directamente el código HTML.
    * * Un ``DocumentFragment``, que sería lo que se obtiene como
    *   contenido de un ``<template>``.
    * * Un ``Document``, que sería lo que se obtiene de haber hecho
    *   una petición AJAX y quedarse cn la respuesta XML.
    *
    * @param {string} options.url   Alternativamente a la opción anterior,
    * la URL de un archivo donde está definido el icono (p.e. un SVG).
    *
    * @param {L.utils.Converter} options.converter  Objeto :class:`L.utils.Converter`
    * para la conversión de los datos en opciones de dibujo.
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
    *
    * @example
    * function updater(o) {
    *    const content = this.querySelector(".content");
    *    if(o.hasOwnProperty(tipo) content.className = "content " + o.tipo;
    *    if(o.hasOwnProperty(numadj) content.textContent = o.numadj;
    *    return this;
    * }
    *
    * const Icon = L.utils.createMutableIconClass("chupachups", {
    *    iconSize: [25, 34],
    *    iconAnchor: [12.5, 34],
    *    css: "styles/chupachups.css",
    *    html: '<div class="content"><span></span></div><div class="arrow"></div>',
    *    converter: new L.utils.Converter(["numadj", "tipo"])
    *                          .define("numadj", "adj", a => a.total)
    *                          .define("tipo")
    *    updater: updater
    * });
    */
   L.utils.createMutableIconClass = function(name, options) {

      const mutable = options.updater && options.converter

      if(options.css) {
         const link = document.createElement("link");
         link.rel = "stylesheet";
         link.href = options.css;
         link.id = "leafext-css-" + name;
         document.querySelector("head").appendChild(link);
         delete options.css
      }

      options.className = options.className || name;

      // Además de devolver el icono, lo precargamos en caso
      // de que hubiera que ir a buscarlo en uin fichero externo
      if(mutable) return L.MutableIcon.extend({options: options}).onready(() => true);
      else {
         console.warn("Falta updater o converter: el icono no será mutable");
         return L.DivIcon.extend({options: options});
      }
      
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
    * `L.MarkerClusterGroup <https://github.com/Leaflet/Leaflet.markercluster>`_
    * para que el número del clúster sólo cuente los centros no filtrados.
    *
    * @param {L.MarkerCluster} cluster El cluster sobre el que se aplica la función.
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
    * el objeto de destino.
    *
    * @classdesc Permite definir cómo un objeto se obtiene
    * a partir de las propiedades de otro.
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
          * se van declarando para cada propiedad al usar :meth:`L.utils.Converter#define`
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
    * Construye el objeto modificable. Una vez construido, pueden modificarse los
    * valores de los atributos; pero no añadir nuevos o eliminar alguno de los
    * existentes.
    * @name Options
    * @class
    *
    * @param {Object} Objeto que contiene las propiedades y sus valores iniciales.
    *
    * @classdesc Clase que permite saber si el objeto ha cambiado algunos de
    * sus propiedades desde la última vez que se reseteó (con el método 
    * :meth:`Options#reset`).
    *
    * @example
    *
    * const o = new Options({a: 1, b: 2, c: 3});
    * o.updated  // false, ya que se fijaron valores nuevos.
    * o.a = 0    // Fijamos un valor para a
    * o.d = 7    // No tiene efecto. Con strict provocará un error.
    * o.modified // {a: 1}. Sólo devuelve los valores actualizados.
    * o.reset()
    * o.updated  // true. Resetear marca el objeto como actualizado.
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
    * Genera un `HTMLElement
    * <https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement>`_ a partir del
    * parámetro que se le proporciona.
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


   /**
    * @name L.MutableIcon
    * @extends L.DivIcon
    * @classdesc Extensión de `L.DivIcon <https://leafletjs.com/reference-1.4.0.html#divicon>`_
    * a fin de crear iconos definidos por una plantilla a la que se aplican
    * cambios en sus detalles según sean cambien los valores de sus opciones de
    * dibujo. Consulte :js:attr:`Icon.options` para conocer cuales son las
    * opciones adicionales que debe proporcionar para que la clase sea capaz de
    * manejar iconos mutables.
    *
    * .. warning:: Para crear el icono, use preferente la función :js:func:`L.utils.createMutableIconClass`.
    *
    * @class
    * @hideconstructor
    *
    * @example
    * function updater(o) {
    *    const content = this.querySelector(".content");
    *    if(o.hasOwnProperty(tipo) content.className = "content " + o.tipo;
    *    if(o.hasOwnProperty(numadj) content.textContent = o.numadj;
    *    return this;
    * }
    *
    * const Icon = L.MutableIcon.extend({
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
    * const icon = new Icon();
    */
   L.MutableIcon = L.DivIcon.extend({
      /** @lends L.MutableIcon.prototype */
      // Issue #2
      statics: {
         /** @lends L.MutableIcon */

         /**
          * Informa si la clase de icono se encuentra lista para utilizarse.
          * @type {Boolean}
          */
         isready() {
            return !!this.prototype.options.html;
         },
         /**
          * Define qué hacer cuando la clase de icono esté lista para usarse.
          * @async
          *
          * @param {Function} success  Define la acción que se realizará en caso
          * de que la creación de la clase de icono haya tenido éxito.
          * @param {Function} fail Define la acción a realizar en caso de que
          * la creación del icono haya fallado.
          */
         onready: function(func_success, func_fail) {
            if(!this.isready()) {
               if(this._onprocess) {  // Ya está pedido el fichero, así que esperamos.
                  const id = setInterval(() => {
                     if(this.isready()) {
                        clearInterval(id);
                        delete this._onprocess;
                        func_success();
                     }
                  }, 20);
               }
               else {
                  this._onprocess = true;
                  load({
                     url: this.prototype.options.url,
                     callback: xhr => {
                        this.prototype.options.html = getElement(xhr.responseXML);
                        delete this._onprocess;
                        func_success();
                     },
                     failback: xhr => {
                        delete this._onprocess;
                        func_fail(xhr.statusText);
                     }
                  });
               }
            }
            else func_success();
            return this;
         },
         // Para comprobar que se incluyeron updater y converter
         extend: function(obj) {
            const MutableIcon = L.Icon.extend.call(this, obj);
            const options = MutableIcon.prototype.options;
            if(options.updater && options.converter) {
               if(options.html) options.html = getElement(options.html);
               else if(!options.url) throw new Error("Falta definir las opciones html o url");
            }
            else throw new Error("Un icono mutable requiere funciones updater y converter");
            return MutableIcon;
         }
      },
      // Fin issue #2
      /**
       * Wrapper para el método homónimo de `L.DivIcon
       * <https://leafletjs.com/reference-1.4.0.html#divicon>`_. Su función
       * es preparar el valor ``options.html`` usando la plantilla y 
       * las opciones de dibujo antes de que el método original actúe.
       * 
       *
       * @returns {HTMLElement}
       */
      createIcon: function() {
         this.options.params = this.options.params || new Options(this.options.converter.run(this._marker.getData()));

         // Las opciones de dibujo cambiaron mientras el icono no estaba presente en el mapa.
         if(!this.options.params.updated) {
            delete this.options.html;
            this._marker.fire("iconchange", {reason: "draw", opts: this.options.params._updated});  // Issue #86
         }

         if(!this.options.hasOwnProperty("html")) {
            const html = this.options.html.cloneNode(true);
            html.container = this.options.html.container;
            this.options.updater.call(html, this.options.params);
            if(html.container !== undefined) this.options.html = html.container?html.innerHTML:html.outerHTML;
            this.options.params.reset();
         }

         const div = L.DivIcon.prototype.createIcon.call(this, arguments);
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
       * @return {Boolean} ``true`` si se redibujó realmente el icono.
       */
      refresh: function() {
         if(!this.options.params || this.options.params.updated) return false;
         this.options.updater.call(this._marker.getElement(), this.options.params.modified);
         this._marker.fire("iconchange", {reason: "redraw", opts: this.options.params._updated});  // Issue #86
         this.options.params.reset();

         // Si se cambia el icono dibujado, el options.html guardado ya no vale.
         delete this.options.html;
         return true;
      },
   });


   // Issue #67
   /**
    * Devuelve un array con todas las correcciones aplicadas de modo que
    * cada elemento es un objeto que contiene el nombre de la corrección,
    * las opciones con las que se aplicó y si se hizo manual o automáticamente.
    *
    * @param {String} name  Nombre de una corrección aplicada manualmente. Si
    * se proporciona se devuelve esta misma corrección y todas las que desencadenó
    * automáticamente. Si no se proprociona, se devielven todas las correcciones
    * manuales y automáticas.
    */
   function getCorrs(name) {
      const corr = this.prototype.options.corr;

      if(name) name = [name];
      else name = Object.keys(corr.getAppliedCorrections());

      const ret = [];
      for(const n of name) {
         const opts = corr.getAutoCorrs(n),
               auto2 = corr.getOptions(n).auto;
         for(const x in opts) {
            ret.push({
               name: x,
               opts: opts[x],
               auto: x === n?false:auto2
            })
         }
      }
      // Ordenamos por nombre de corrección y para una misma
      // corrección, colocamos primero la manual.
      return ret.sort((a,b) => -1*(b.name + Number(b.auto) > a.name + Number(a.auto)));
   }
   // Fin issue #67


   /**
    * Opciones para :js:class:`MutableMarker`. A las generales que permite `L.Marker
    * <https://leafletjs.com/reference-1.4.0.html#marker>`_ de Leaflet
    * añade algunas más
    * @name Marker.prototype.options
    * @type {Marker.Options}
    */

   /**
    * Optiones adicionales de la clase :js:class:`Marker`.
    * @typedef {Object} Marker~Options
    * @property {String} opts.mutable  Nombre de la propiedad a la que se conectan los datos de
    * las marcas. Si es una propiedad anidada puede usarse la notación de punto.
    * Por ejemplo, ``feature.properties``.
    * @property {(L.LayerGroup|String|Function)} opts.filter Habilita un :class:`sistema de filtros
    * <CorrSys>` para la clase de marca. Puede adoptar tres valores distintos:
    *    
    * * La capa a la que se agregan las marcas de esta clase. En este caso, el efecto
    *   del filtro será eliminar del mapa las marcas filtradas.
    * * Un nombre que se tomara como el nombre de la clase CSS a la que se quiere que
    *   pertenezcan las marcas filtradas.
    * * Una función de transformación que se aplicará al elemento HTML que
    *   representa en el mapa cada marca filtrada. El contexto de esta función será el propio
    *   elemento HTML.
    */

   /**
    * @name L.MutableMarker
    * @extends L.Marker
    * @classdesc  Extiende la clase `L.Marker <https://leafletjs.com/reference-1.4.0.html#marker>`_
    * a fin de permitir que los iconos sean variables y mutables a partir de los datos definidos.
    * Consulte cuáles son las :attr:`Marker#options` opciones que lo habiliten}.
    * @class
    * @hideconstructor
    *
    * @example
    *
    * const Marker = L.MutableMarker.extend({
    *    options: {
    *       mutable: "feature.properties",
    *       filter: L.utils.grayFilter
    *    }
    * });
    *
    * const marca = new Marker([37.07,-5.98], {icon: new Icon()});
    */
   L.MutableMarker = L.Marker.extend({
      /** @lends L.MutableMarker.prototype */
      statics: {
         /** @lends L.MutableMarker */
         extend: function() {
            const MutableMarker = L.Marker.extend.apply(this, arguments),
                  options = MutableMarker.prototype.options;

            if(!options.mutable) throw new Error("La opción 'mutable' es obligatoria");

            Object.assign(MutableMarker, L.Evented.prototype); // Issue #54
            options.corr = new CorrSys();
            /**
             * Almacena todas las marcas creadas de este tipo
             * @type {Array.<L.MutableMarker>}
             */
            Object.defineProperty(MutableMarker, "store", {
               value: [],
               configurable: false,
               enumerable: false,
               writable: false
            });

            // Issue #5
            if(options.filter) options.filter = new FilterSys(options.filter);
            Object.defineProperty(MutableMarker.prototype, "filtered", {
               get: function() { 
                  if(!this.options.filter) throw new Error("No se ha definido filtro. ¿Se ha olvidado de incluir la opción filter al crear la clase de marca?");
                  return this._filtered.length > 0; 
               }
            });
            // Fin issue #5

            return MutableMarker;
         },
         /**
          * Vacía :js:attr:`L.MutableMarker.store` de marcas y marca como desaplicadas las correcciones.
          * @param {Boolean} deep  Si ``true``, también desaplica los filtros.
          */
         reset: function(deep) { 
            this.store.length = 0;
            const corrs = getCorrs.call(this);    // Issue #67
            this.prototype.options.corr.reset();  // Issue #33
            // Issue #67
            for(const c of corrs) {
               this.fire("uncorrect:*", c);
               this.fire(`uncorrect:${c.name}`, c);
            }
            // Fin issue #67
            if(deep) {
               const filters = this.getFilterStatus();  // Issue #67
               this.prototype.options.filter.reset();  // Issue #40
               // Issue #67
               for(const name in filters) {
                  this.fire("unfilter:*", {name: name, opts: filters[name]});
                  this.fire(`unfilter:${name}`, {name: name, opts: filters[name]});
               }
               // Fin issue #67
            }
         },
         /**
          * Elimina una marca del almacén donde se guardan
          * todos los objetos marca de una misma clase.
          *
          * @param {Marker} marker  La marca que se desea eliminar.
          * @returns {Boolean}  El éxito en la eliminación.
          */
         remove: function(marker) {
            const idx = this.store.indexOf(marker);
            if(idx === -1) return false;
            this.store.splice(idx, 1);
            return true;
         },
         /**
          * Ejecuta un método para todas las marcas almacenadas en store.
          * Si se proporciona una función progress, entonces la ejecución se interrumpe
          * cada 200ms, durante 50ms a fin de que no sienta el usuario bloqueda la interfaz.
          * Además esa función permite conocer dibujar el progreso (por ejemplo, mediante barra).
          *
          * @param {String} method  Nombre del métodoo
          * @param {Function} progress Función que dibuja el progreso de la opración. Recibe
          * 	como argumentos, el ordinal de la operación, el total de operaciones y el tiempo
          * 	que lkleva ejecutámndose el invoque.
          * @param {...*} param Parámetros que se pasan al método
          */
         invoke: function (method, progress) {
            const args = Array.prototype.slice.call(arguments, 2);
            if(!progress) {
               for(const marker of this.store) {
                  this.prototype[method].apply(marker, args);
               }
               return;
            }

            const started = (new Date()).getTime(),
                  total = this.store.length,
                  noprogress = 1000,  // Para menos de 1 segundo, no se muestra nada.
                  check = 150,     // Cada 150 marcas que comprueba si se hace la suspensión.
                  interval = 200,  // Tiempo de ejecución.
                  delay = 50;      // Tiempo de suspensión de la ejecución.
            let   i = 0;

            const process = () => {
               const start = (new Date()).getTime();
               console.log("DEBUG", i, total, start - started);
               for(; i<total; i++) {
                  if((i+1)%check === 0) {
                     const lapso = (new Date()).getTime() - start;
                     if(lapso > interval) break;
                  }
                  this.prototype[method].apply(this.store[i], args);
               }

               const lapsoTotal = (new Date()).getTime() - started;
               if(lapsoTotal > noprogress) progress(i, total, lapsoTotal);
               if(i < total) setTimeout(process, delay);
            }

            process();

         },
         /**
          * Registra una corrección en el sistema de correcciones de la marca.
          * @method Marker.register
          *
          * @param {String} name        Nombre que identifica a la corrección.
          * @param {Object} obj         Objeto que define la corrección
          * @param {String} obj.attr    Propiedad sobre el que opera la corrección.
          * Puede usarse la notación de punto para propiedades anidadas.
          * @param {Function} obj.func  Función que determina si se hace corrección o no.
          * Cuando la función corrige el array actúa eliminado valores y para
          * ello se ejecuta repetidamente sobre todos los elementos del *array*. Usa
          * como contexto la marca a la que pertenece el objeto
          * que contiene el *array*, y recibe tres parámetros: el primero es
          * el índice del elemento que se comprueba, el segundo el array mismo
          * y el tercero un objeto con las opciones aplicables de corrección.
          * Debe devolver ``true`` (el elemento debe eliminarse) o
          * ``false`` (no debe hacerlo). La función también puede añadir
          * nuevos elementos, en vez de eliminar los existentes. Vea la información
          * sobre el argumento *add* para saber más sobre ello.
          * @param {Boolean} obj.add    ``true`` si la corrección añade
          * elementos al array, y cualquier otro valor asimilable a ``false``
          * si su intención es eliminar elementos. Si los añade, la función deberá
          * devolver un *array* con los elementos a añadir y sólo se ejecuta una vez,
          * por lo que su primer argumento (que representa el índice del elemento) vale
          * ``null``.
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
         register: function() {
            return CorrSys.prototype.register.apply(this.prototype.options.corr, arguments) && this;
         },
         // Issue #23
         /**
          * Aplica una corrección a las marcas de una clase.
          * @method Marker.correct
          *
          * @params {String} name   Nombre de la corrección.
          * @params {Object} params Opciones de aplicacion de la corrección.
          * @params {Boolean} auto  Si ``true``, aplica las correcciones
          * en cadena, si estas se han definino.
          *
          * @example
          * Centro.correct("adjpue", {puesto: ["11590107", "00590059"]})
          */
         correct: function(name, params, auto) {
            const corr = this.prototype.options.corr;
            try {
               // Si la correción ya está aplicada, sólo no se aplica en
               // caso de que se aplicara con las mismas opciones.
               if(equals(corr.getOptions(name).params, params)) return false;
            }
            catch(err) {  // La corrección no está registrada.
               return false;
            }

            corr.initialize(name, params, auto);
            for(const marker of this.store) marker.apply(name);

            // Issue #54
            const corrs = getCorrs.call(this, name);
            for(const c of corrs) {
               this.fire(`correct:*`, c);
               this.fire(`correct:${c.name}`, c);
            }
            // Fin issue #54
            return this;
         },
         /**
          * Elimina una correccón de las marcas de una clase.
          * @method Marker.uncorrect
          *
          * @params {String} name   Nombre de la corrección.
          * @params {Array.<String>} prev  Si se encadenan correcciones, las
          * correcciones previas en la cadena. Este parámetro sólo debe usarlo
          * internamente la libreria.
          *
          * @example
          * marca.uncorrect("adjpue");
          */
         uncorrect: function(name) {
            const corr = this.prototype.options.corr;
            try {
               // La corrección no está aplicada.
               if(!corr.getOptions(name).params) return false;
            }
            catch(err) {
               return false;  // La corrección no está registrada.
            }

            for(const marker of this.store) marker.unapply(name);
            // Issue #54
            const corrs = getCorrs.call(this, name);
            corr.setParams(name, null);
            for(const c of corrs) {
               this.fire(`uncorrect:*`, c);
               this.fire(`uncorrect:${c.name}`, c);
            }
            // Fin issue #54
            return this;
         },
         // Fin issue #23
         // Issue #58
         /**
          * Comprueba si ya se ha aplicado una corrección con unas determinadas opciones
          * @param {String} name  El nombre de la corrección.
          * @param {Object} opts  Las nuevas opciones de aplicación.
          * @param {String} type  El tipo de comprobación que se quiere hacer: si "manual",
          * sólo se pretende comprobar si las opciones son equivalentes a la que se aplicaran
          * con anterioridad manualmente; si "auto", si la aplicación manual ya la incluyen
          * aplicaciones automáticas anteriores de la corrección. Cualquier otro valor prueba
          * con la manual y las automáticas.
          */
         appliedCorrection: function(name, opts, type) {
            const corr = this.prototype.options.corr;
            return corr.isApplied(name, opts, type);
         },
         // Fin issue #58
         /**
          * Devuelve el estado actual de las correcciones aplicadas sobre las marcas
          * de un tipo.
          * @method Marker.getCorrectStatus
          *
          * @params {String} name   El nombre de una corrección.
          *
          * @returns {Object} Un objeto con dos objetos a su vez. El objeto *manual*, cuyas
          * claves son los nombres de las correcciones aplicadas manualmente y cuyos valores son
          * las opciones de corrección; y el objeto *auto* cuyas claves son los nombres de
          * las correcciones que se han aplicado automáticamente y cuyo valor es un objeto
          * en que las claves son los nombres de la correcciones que al aplicarse
          * manualmente la desencadenaron y cuyos valores son las opciones de aplicación
          * de la corrección automática.
          */
         getCorrectStatus: function(name) {
            const corr = this.prototype.options.corr,
                  ret = {
                     manual: {},
                     auto: {}
                  }

            let corrs = corr.getAppliedCorrections();
            for(const name in corrs) ret.manual[name] = corrs[name];

            for(const name in corr.getCorrections()) {
               const auto = corr.getAutoParams(name);
               if(Object.keys(auto).length>0) ret.auto[name] = auto;
            }
            return ret;
         },
         // Issue #5
         /**
          * Registra para una clase de marcas un filtro.
          * @method Marker.registerF
          *
          * @param {String}         name  Nombre del filtro.
          * @param {Array.<String>}  attrs Nombre de las propiedades de los datos
          * cuyos valores afectan al filtro.
          * @param {Function}       func  Función que filtra. Debe devolver
          * ``true`` (sí filtra) o ``false``.
          */
         registerF: function() {
            const filter = this.prototype.options.filter;
            if(!filter) throw new Error("No se ha definido filtro. ¿Se ha olvidado de incluir la opción filter al crear la clase de marca?");

            return FilterSys.prototype.register.apply(this.prototype.options.filter, arguments) && this;
         },
         /**
          * Habilita un filtro para las marcas de una clase
          * @method Marker.filter
          *
          * @param {string} name    Nombre del filtro.
          * @param {Object} params  Opciones para el filtrado.
          */
         filter: function(name, params) {
            const filter = this.prototype.options.filter;
            if(!filter) throw new Error("No se ha definido filtro. ¿Se ha olvidado de incluir la opción filter al crear la clase de marca?");

            // El filtro no existe o ya estaba habilitado con los mismo parámetros.
            if(!filter.setParams(name, params, true)) return false;
            for(const marker of this.store) marker.applyF(name);

            this.fire("filter:*", {name: name, opts: params});  // Issue #54
            this.fire(`filter:${name}`, {name: name, opts: params});  // Issue #54
            
            return this;
         },
         /**
          * Deshabilita un filtro para las marcas de una clase
          * @method Marker.unfilter
          *
          * @param {string} name    Nombre del filtro.
          */
         unfilter: function(name) {
            const filter = this.prototype.options.filter;
            if(!filter) throw new Error("No se ha definido filtro. ¿Se ha olvidado de incluir la opción filter al crear la clase de marca?");

            const params = filter.getParams(name);  // Issue #54

            if(!filter.disable(name)) return false;  // El filtro no existe o está deshabilitado.
            for(const marker of this.store) marker.unapplyF(name);

            // #Issue #54
            this.fire("unfilter:*", {name: name, opts: params});  // Issue #54
            this.fire(`unfilter:${name}`, {name: name, opts: params});  // Issue #54
            // Fin #issue 54

            return this;
         },
         /**
          * Cambia el estilo de filtro.
          * @method Marker.setFilter
          *
          * @param {Function|String|L.LayerGroup}  style     Estilo del filtro.
          * Consulte los valores posibles de la opción :attr:`filter <Marker#options>` para
          * saber qué valor de estilo suministrar.
          */
         setFilterStyle: function(style) {
            const filter = this.prototype.options.filter;
            if(!filter) throw new Error("No se ha definido filtro. ¿Se ha olvidado de incluir la opción filter al crear la clase de marca?");

            filter.setStyle(style, this);
         },
         /**
          * Comprueba si ls marcas tienen aplicado un filtro.
          * @method Marker.hasFilter
          *
          * @param {String} name    Nombre del filtro.
          *
          * @return {Boolean}
          */
         hasFilter: function(name) {
            const filter = this.prototype.options.filter;
            if(!filter) throw new Error("No se ha definido filtro. ¿Se ha olvidado de incluir la opción filter al crear la clase de marca?");

            return filter.getFilters().indexOf(name) !== -1
         },
         /**
          * Devuelve el estado actual de los filtros aplicados sobre las marcas del tipo
          * @method Marker.getFilterStatus
          *
          * @param {String} name  Nombre de filtro. Si se especifica uno, sólo se devuelven
          * las opciones de aplicación de ese filtro en concreto.
          *
          * @returns {Object} Un objeto en que las claves son los nombres de los filtros y
          * los correspondientes valores sus opciones de aplicación; o bien, si se proporcionó
          * un nombre de filtro, las opciones de aplicación de ese filtro.
          */
         getFilterStatus: function(name) {
            const filter = this.prototype.options.filter;
            if(!filter) throw new Error("No se ha definido filtro. ¿Se ha olvidado de incluir la opción filter al crear la clase de marca?");

            if(name) return filter.getParams(name);

            const ret = {};
            for(const name of filter.getFilters()) {
               ret[name] =  filter.getParams(name);
            }
            return ret;
         }
         // Fin issue #5
      },
      /**
       * Informa de si la marca se encuentra en el ``store``
       * del tipo de marca con la que se creó.
       */
      _belongsTo: function() {
         const store = Object.getPrototypeOf(this).constructor.store;
         return store.indexOf(this) !== -1;
      },
      /**
       * Refresca el dibujo de la marca.
       *
       * @param {L.LayerGroup} force   Capa a la que se añade la marca
       * a la fuerza. Esto es útil cuando se pasa de un estilo de filtro
       * en que las marcas filtradas se ocultan a otro en que no se hace,
       * ya la ocultación se implementa expulsando la marca de la capa.
       * Véase :meth:`FilterSys.setStyle`.
       */
      refresh: function(force) {
         let div = this.getElement();
         // Issue #5
         const filter = this.options.filter;
         if(filter) {
            if(filter.hideable) {
               if(this.filtered) {
                  // Si la capa es MarkerClusterGroup. la marca puede estar
		  // en la capa, aunque no se esté en el mapa.
                  filter.transform.removeLayer(this);
                  div = undefined;
               }
               else {
                  // Debe comprobarse si la marca sigue estando
                  // en el ``store``, para evitar que el refresco añada
                  // a la capa una marca que ya se desechó con un .reset().
                  if(!div && this._belongsTo()) {
                     filter.transform.addLayer(this);
                     div = this.getElement();
                  }
               }
            }
            else {
               if(div) filter.transform.call(div, this.filtered);
               else if(force && this._belongsTo()) {
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
       * Wrapper para el método homónimo original. Se encarga de
       * convertir en un descriptor de acceso la propiedad a la que
       * se conectan los datos, de almacenar en :attr:`Marker.store`
       * la nueva marca, y de algunos aspectos menores más.
       */
      initialize: function() {
         L.Marker.prototype.initialize.apply(this, arguments);
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

         Object.defineProperty(this, feature, {
            get: function() { return this["_" + feature]; },
            set: function(value) {
               this["_" + feature] = value;
               // Creamos este tipo de evento que se lanza
               // al asociar la marca a los datos.
               this.fire("dataset");
            },
            configurable: false,
            enumerable: false
         });

         // Se pasan los arrays de los datos a correctables
         // y se aplican a la nueva marca filtros y correcciones aplicados.
         this.on("dataset", function(e) {
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
       * la marca al icono.
       */
      setIcon: function(icon) {
         icon._marker = this;
         L.Marker.prototype.setIcon.apply(this, arguments);
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
       * Actualiza el icono asociado a la marca con los datos suministrados.
       * @private
       * @param {Object] data  Los datos con los que se quiere actualizar el icono.
       */
      _updateIcon: function(data) {
         const icon = this.options.icon;
         if(icon.options.params) icon.options.params.change(icon.options.converter.run(data));
      },
      // Issue #33
      /**
       * Modifica arbitrariamente los datos asociados a la marca.
       * @param {Object} data  Datos que se quieren añadir a los datos preexistentes.
       *
       * @return {Object} El resultado de haber realizado la fusión.
       */
      changeData: function(data) {
         this._updateIcon(data);
         return Object.assign(this.getData(), data);
      },
      // Fin issue #33
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
         const corr     = this.options.corr,
               opts     = corr.getOptions(name),
               params   = opts.params;
         let   arr, ret;
         
         // La resolución de issue #22, hace que esto ocurra sólo
         // si se registra la corrección después de haber añadido la marca.
         if(!(arr = corr.isCorrectable(opts.attr, this))) {
            corr._prepare(this.getData(), opts.attr);
            arr = getProperty(this.getData(), opts.attr);
         }

         if(ret = arr.apply(this, name)) {
            // Issue #5
            const filter = this.options.filter;
            if(filter) for(const f of filter.getFilters(opts.attr)) this.applyF(f);
            // Fin issue #5

            this._updateIcon({[opts.attr]: arr});
         }

         // Issue #37
         if(!opts.auto) return ret;
         for(const chain of opts.chain) {
            const newname = name + " " + chain.corr,
                  opts = corr.getOptions(newname);
            // Es la primera vez que se aplica la corrección
            // sobre alguna de las marcas, por lo que no están calculados los parámetros
            if(opts.params === undefined) {
               if(opts.add) {
                  console.warn(`${corr}: No puede ser el eslabón de una cadena porque es una corrección adictiva`);
                  opts.params = corr.setParams(newname, false);
               }
               if(corr.looped(name, chain.corr)) {
                  console.debug(`${corr}: Corrección ya aplicada en la cadena de correciones. Se salta para evitar refencias circulares.`);
                  opts.params = corr.setParams(newname, false);
               }
               const markerClass = Object.getPrototypeOf(this).constructor;
               opts.params = corr.setParams(newname, chain.func.call(markerClass, params));
            }

            if(opts.params !== false) ret = this.apply(newname) || ret;
         }
         // Fin issue #37

         return ret;
      },
      /**
       * Elimina una corrección de la marca. No debería usarse directamente, 
       * ya que las correcciones deben eliminarse a través de :meth:`Marker#uncorrect`.
       * @private
       *
       * @param {String} name    Nombre de la corrección.
       */
      unapply: function(name) {  // Elimina la corrección.
         const corr     = this.options.corr,
               opts     = corr.getOptions(name),
               arr      = getProperty(this.getData(), opts.attr);
         let ret;

         if(ret = arr.unapply(name)) {
            // Issue #5
            const filter = this.options.filter;
            if(filter) for(const f of filter.getFilters(opts.attr)) this.applyF(f);
            // Fin issue #5

            this._updateIcon({[opts.attr]: arr});
         }

         // Issue #37
         if(!opts.auto) return ret;
         for(const chain of opts.chain) {
            const newname = name + " " + chain.corr,
                  opts = corr.getOptions(newname);
            if(!opts.params) continue;  // No se aplicó.
            ret = this.unapply(newname) || ret;
         }
         // Fin issue #37

         return ret;
      },
      // Issue #5
      /**
       * Aplica un filtro a la marca. No debería usarse directamente, 
       * ya que los filtros deben aplicarse a través de :meth:`Marker#filter`.
       * @private
       *
       * @param {String} El nombre del filtro.
       */
      applyF: function(name) {
         const filter = this.options.filter;
         if(!filter) throw new Error("No se ha definido filtro. ¿Se ha olvidado de incluir la opción filtro al crear la clase de marca?");
         const params = filter.getParams(name),
               res = filter[name].call(this, params);
         if(res) {
            if(this._filtered.indexOf(name) === -1) {
               this._filtered.push(name) 
               // Issue #56
               // El evento sólo se produce cuando un centro sin filtrar, se filtra.
               if (this._filtered.length === 1) {
                  this.fire("filtered", {name: name, opts: params});
               }
               // Fin issue #56
            }
         }
         else this.unapplyF(name);
         return res;
      },
      /**
       * Elimina un filtro de la marca.No debería usarse directamente, 
       * ya que los filtros deben eliminarse a través de :meth:`Marker#unfilter`.
       * @private
       *
       * @param {String} El nombre del filtro.
       */
      unapplyF: function(name) {
         const filter = this.options.filter;
         if(!filter) throw new Error("No se ha definido filtro. ¿Se ha olvidado de incluir la opción filtro al crear la clase de marca?");
         const params = filter.getParams(name),
               idx = this._filtered.indexOf(name);
         if(idx !== -1) {
            this._filtered.splice(idx, 1);
            // Issue #56
            // El evento sólo se produce cuando un centro filtrado, deja de estarlo
            if (this._filtered.length === 0) {
               this.fire("unfiltered", {name: name, opts: params});
            }
            // Fin issue #56
         }
         return idx !== 1;
      }
      // Fin issue #5
   });


   const CorrSys = (function() {

      /**
       * @name Value
       * @hideconstructor
       * @class
       * @classdesc Genera un valor que permite conocer si está filtrado o no.
       * Si el valor es un objeto, simplemente, devuelve otro que añade la propiedad
       * ``filters`` que contiene en un Array los nombres de las correcciones que han filtrado el valor.
       * Si el valor es un tipo primitivo, genera un objeto que almacena en la propiedad ``value`` el
       * valor original y en ``filters`` la lista de correcciones que lo filtran.
       */
      const Value = (function() {
         function Value(value, filters) {
            Object.defineProperty(this, "__primitive", {
               value: typeof value !== "object" || value === null,
               writable: false,
               configurable: false,
               enumerable: false
            });
            if(this.isPrimitive()) this.value = value;
            else {
               if(value.filters !== undefined) console.warn("El valor original del array posee un atributo filters y se perderá");
               Object.assign(this, value);
            }
            Object.defineProperty(this, "filters", {
               value: filters,
               writable: false,
               configurable: false,
               enumerable: false
            });
         }

         Value.prototype.isPrimitive = function() { return this.__primitive };
         Value.prototype.valueOf = function() {
            if(this.isPrimitive()) return this.value;
            else return this;
         }
         Value.prototype.toString = function() {
            if(this.isPrimitive()) return this.value.toString();
            else return Object.prototype.toString.call(this);
         }

         return Value;
      })();

      /*
       * Convierte un array en un array con esteroides. Básicamente, el array
       * (llamémoslo *A*) pasa a tener un atributo *corr*, que es un objeto cuyas
       * claves son las correcciones aplicadas sobre *A* y cuyos valores son arrays de
       * longitud idéntica a *A*. Cada elemento de estos arrays represente el efecto
       * que ha tenido la corrección sobre el elemento correspondiente de *A*:
       *
       * - ``true``:  la correción filtró el elemento.
       * - ``false``: la corrección no filtró el elemento.
       * - ``undefined``: la corrección no se aplicó sobre ese elemento.
       * - ``null``: la corrección creó el elemento.
       *
       * Un ejemplo esquemático:
       *
       *            [ valor1   , valor2    , valor3]
       *  {
       *    corr1:  [ true     , true      , false ]
       *    corr2:  [ undefined, undefined ,  null ]
       *  }
       *
       * En este caso, el *valor1* lo eliminan ambas correcciones. el *valor2*
       * sólo *corr1*, y el *valor3* lo añade *corr2* y no lo elimina *corr1*.
       *
       */

      /**
       * @name Correctable
       * @hideconstructor
       * @class
       * @classdesc La clase permite apuntar sobre el array qué elementos han sido filtrados
       * por cuáles correcciones y qué nuevos elementos han sido añadidos y por cuál corrección.
       * @param {Array} arr El array original.
       * @param {Object} sc Parte del :js:class:`sistema de correcciones <CorrSys>` que se aplica
       * exclusivamente al array.
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
               return Object.keys(this.corr).filter(n => this.corr[n][idx])
                                            .map(c => this._sc.getOriginal(c));
            },
            /**
             * @typedef {Object} Correctable.CorrValue
             * @property {?*} value   El valor del elemento o ``null``, si alguna corrección lo eliminó.
             * @property {Array.<String>} filters  Los nombres de las correcciones que eliminan el elemento.
             */

            /**
             * Aplica una determinada corrección sobre el array.
             *
             * @param {Marker} marker  Marca a la que pertenece el :class:`Correctable`
             * @param {String} name    El nombre de la corrección.
             *
             * @returns {boolean}  ``true`` Si la correción
             *    provocó algún cambio en el array.
             */
            apply: function(marker, name) {
               const opts = this._sc.getOptions(name);

               if(opts.add) {
                  // La corrección ya estaba aplicada: la desaplicamos.
                  if(this.corr.hasOwnProperty(name)) this.unapply(name);

                  const values = opts.func.call(marker, null, this, opts.params);
                  let num = values.length;
                  if(num === 0) return false;
                  Array.prototype.push.apply(Object.getPrototypeOf(this), values);

                  this.corr[name] = new Array(this.length);
                  for(let i=this.length-num; i<this.length; i++) this.corr[name][i] = null;
                  this._count = undefined;

                  // Las correcciones que eliminan valores,
                  // pueden eliminar los valores añadidos.
                  for(const n in this.corr) {
                     const opts = this._sc.getOptions(n);

                     this.corr[n].length = this.length;
                     if(opts.add) continue;  // Es una corrección que añade valores.

                     for(let i=this.length-num; i<this.length; i++) {
                        this.corr[n][i] = opts.func.call(marker, i, this, opts.params);
                     }
                  }

                  return true;
               }
               else {
                  let ret = false;
                  if(!this.corr.hasOwnProperty(name)) this.corr[name] = new Array(this.length);

                  for(let i=0; i<this.length; i++) {
                     const prev = this.corr[name][i];
                     this.corr[name][i] = opts.func.call(marker, i, this, opts.params);
                     if(prev ^ this.corr[name][i]) ret = true;  // La corrección cambia sus efectos.
                  }

                  if(ret) this._count = undefined;
                  return ret;
               }
            },
            /**
             * Deshace una determinada corrección hecha previamente.
             *
             * @param {String} name Nombre de la corrección.
             *
             * @returns {Boolean}  ``true`` si eliminar la corrección
             *    provocó cambios en el *array*.
             */
            unapply: function(name) {
               const opts = this._sc.getOptions(name);

               if(opts.add) {
                  if(!this.corr.hasOwnProperty(name)) return false; // No se había aplicado.
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
                  Object.getPrototypeOf(this).splice(a, b-a);
                  for(const name in this.corr) this.corr[name].splice(a, b-a);
               }
               else {
                  if(!this.corr.hasOwnProperty(name)) return false; // No se había aplicado.
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

         // TODO: ¿Cómo narices se incluye esto en la documentación.
         /**
          * Iterador que genera un objeto Value para cada elemento del array
          * a fin de que se pueda saber si el valor está o no filtrado.
          * @generator
          */
         function* iterator() {
            for(let i=0; i<this.length; i++) {
               yield new Value(this[i], this.filters(i));
            }
         }

         function Correctable(arr, sc) {
            if(!(arr instanceof Array)) throw new TypeError("El objeto no es un array");
            const obj = Object.assign(Object.create(arr), Prototype);
            Object.defineProperties(obj, {
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
       * El sistema de correcciones estará constituido por varias correcciones, cada una
       * de las cuales tiene un nombre y afectará a un atributo del objeto.
       * Varias correcciones podrán afectar a un mismo atributo, pero una
       * corrección no podrá afectar a varios atributos.
       *
       * Puede ocurrir también que la aplicación de una corrección desencadene
       * automáticamente la aplicación de una o más correcciones que afectan a otros
       * atributos. En este caso, si la corrección que se aplica es "bilingue" y la
       * corrección que se desencadena automáticamente es "adjpue", la corrección
       * automática se identificará como "bilingue adjpue".
       * 
       * Las :js:class:`clases de marcas definidas como mutables <Marker>` definen
       * automáticamente una opción ``corr`` que es un objeto de este tipo, de modo
       * que cuando se usan métodos que definen o aplican correcciones obre las marcas
       * de la clase (:js:meth:`Marker.register`, :js:meth:`Marker.correct`,
       * :js:meth:`Marker.uncorrect`) se utiliza este objeto.`
       *
       */
      const CorrSys = (function() {

         function CorrSys() {}

         /**
          * Registra una corrección.
          * @method CorrSys#register
          *
          * @param {String} name Nombre de la corrección
          * @param {Object} obj  Objeto que define la corrección. :js:meth:`Marker.register` 
          * para saber cómo es este objeto.
          * @param {Array} chain  Correcciones que se aplicarán automáticamente
          * tras la aplicación de esta corrección. Cada elemento es un objeto con dos atributos,
          * el nombre de la corrección que se desencadena (``corr``) y la función que
          * transforma las opciones de la corrección aplicada en opciones de la corrección
          * desencadena. Si la aplicación concreta de la corrección no debe provocar el
          * desencadenamiento de la segunda corrección, debe devolverse ``false``.
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
            //       - la cadena de correcciones.
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
               apply: obj.apply || equals,  // Issue #58
               default_auto: obj.autochain || false,  // Issue #39
               params: null,  // Issue #23.
               // Issue #37
               chain: obj.chain || [],  // Correcciones que aplica automáticamente esta corrección
               chain_params: {}  // key: eslabones previos de la cadena de correcciones.
                                 // value: las opciones de corrección
               // Fin issue # 37
            }
            sc[name] = obj.func;
            return this;
         }

         // Issue #58
         /** 
          * Comprueba si las opciones de aplicación suministradas son inútiles,
          * porque ya hay al menos otra aplicación de la corrección que abarca
          * tales opciones.
          *
          * @param {String} name Nombre de la corrección.
          * @param {Object} params Opciones de aplicación.
          * @param {Object} type Tipo de comprobación que puede ser "*manual*",
          * si sólo se pretende consultar la anterior aplicación manual de la
          * corrección, "*auto*", si sólo se pretenden consultar las aplicaciones
          * automáticas de la corrección; y cualquier otro valor para consultar
          * todas.
          */
         CorrSys.prototype.isApplied = function(name, params, type) {
            const opts = this.getOptions(name);
                  
            let a_params = [] 

            if(type !== "auto" && opts.params) a_params.push(opts.params);
            if(type !== "manual") {
               let params = this.getAutoParams(name);
               params = Object.keys(params).map(c => params[c]);
               a_params.push.apply(a_params, params);
            }

            for(const oldparams of a_params) {
               if(opts.apply(oldparams, params)) return true;
            }
            return false;
         }
         // Fin issue #58

         // Issue #37
         /**
          * Normaliza el nombre. Las correcciones encadenadas forman su nombre
          * encadenando todos los eslabones de la cadena y separándolos por espacio.
          * Por ejemplo, "*bilingue adjpue*" es la corrección *adjpue* que aplica
          * automáticamente otra corrección llamda bilingue. En este ejemplo,
          * el nombre normalizado es "*adjpue*" y el prenombre "*bilingue*"
          * @method CorrSys#_normalizeName
          * @private
          *
          * @param {String} name El nombre que se quiere normalizar,
          * @param {Boolean} prename Si se quiere obtener también el prenombre.
          *
          * @returns {String|Array.<String>}  El nombre normalizado o un array
          * con el nombre normalizado y el prenombre si el argumento ``prename`` era
          * ``true``.
          */
         CorrSys.prototype._normalizeName = function(name, prename) {
            const lastSpace = name.lastIndexOf(" ");
            if(lastSpace === -1) return prename?["", name]:name;
            else {
               const res = name.substring(lastSpace+1);
               return prename?[name.substring(0, lastSpace), res]:res;
            }
         }
         // Fin #issue 37

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
          * @param {?String} attr  Nombre de la propiedad. Si es ``null``, devolverá
          * los nombres de todas las correcciones.
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
          * Devuelve el nombre de todas las correcciones aplicadas
          * manualmente y las opciones con las que se aplican.
          *
          * @returns {Object} Un objeto cuyas claves son los nombres
          * de las correcciones aplicadas y cuyos valores son las opciones.
          */
         CorrSys.prototype.getAppliedCorrections = function() {
            const ret = {},
                  corrs = this.getCorrections();

            for(const name in corrs) {
               const opts = corrs[name].prop;
               if(!opts.params) continue;
               ret[name] = opts;
            }

            return ret;
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
               o[name] = new Correctable(o[name], this);
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
            name = this._normalizeName(name);
            for(const prop in this) {
               if(this[prop].hasOwnProperty(name)) return prop;
            }
         }

         /**
          * @typedef {Object} CorrSys.OptionsCorr
          * @property {?String}  prename  Eslabones previos de la cadena de correcciones.
          * @property {String}   name     Nombre de la corrección (sin eslabones previos).
          * @property {Boolean}  add      true, si la corrección agrega valores.
          * @property {Object}   params   Opciones de aplicación de la corrección.
          * @property {Array}    chain    Array con las correcciones que desenacadena
          * @property {String}   attr     El nombre de la propiedad sobre la que actúa la corrección.
          * @property {Function} func     La función de corrección.
          * automáticamente la corrección.
          */

         // Issue #23 - Modificado por issue #37.
         /**
          * Devuelve las características de una corrección
          * @method CorrSys.prototype.getOptions
          *
          * @param {String} name  Nombre de la corrección.
          *
          * @returns {OptionsCorr}
          */
         CorrSys.prototype.getOptions = function(name) {
            let ret, prename;
            [prename, name] = this._normalizeName(name, true);

            const property = this.getProp(name);
            if(!property) throw new Error(`${name}: corrección no registrada`);
            const sc = this[property];

            ret = {attr: property, func: sc[name]}
            Object.assign(ret, ret.func.prop);

            if(prename) {
               ret.params = ret.chain_params[prename];
               ret.prename = prename;
            }
            delete ret.chain_params;

            return ret;
         }

         /**
          * Establece unas nuevas opciones de aplicación de una determinada corrección.
          * @method CorrSys#setParams
          *
          * @params {String} name   Nombre de la corrección.
          * @params {Object} opts   Opciones de aplicación de la corrección.
          *
          * @returns {Object}   Las propias opciones.
          */
         CorrSys.prototype.setParams = function(name, opts) {
            const sc = this[this.getProp(name)];
            if(!sc) throw new Error(`${name}: corrección no registrada`);

            let [prename, postname] = this._normalizeName(name, true);

            if(prename) {
               if(opts !== null) sc[postname].prop.chain_params[prename] = opts;
               else delete sc[postname].prop.chain_params[prename];
            }
            else sc[name].prop.params = opts;

            // Si se borran los opciones de corrección (se fijan a null), se deben
            // borrar recursivamente las opciones calculadas del resto de la cadena.
            // Issue #60: o si se fijan unas nuevas opciones manuales, resetear las calculadas.
            if(opts === null || !prename) {
               for(const chain of sc[postname].prop.chain) {
                  if(this.looped(name, chain.corr)) continue;
                  this.setParams(postname + " " + chain.corr, null);
               }
            }

            return opts;
         }
         // Fin issue #23

         /**
          * Resetea el objeto.
          *
          * @param {Boolean} deep  Si ``true``, elimina del sistema las correcciones;
          *    de lo contrario, sólo las marca como desaplicadas.
          */
         CorrSys.prototype.reset = function(deep) {
            if(deep) for(const prop in this) delete this[prop];
            else {
               const corrs = this.getCorrections();
               for(const name in corrs) this.setParams(name, null);
            }
            return this;
         }


         /**
          * Inicializa la corrección, fijando las opciones y si se deben
          * aplicar automáticamente las correcciones definidas en su cadena.
          * @params {String} name  El nombre de la corrección.
          * @params {Object} opts  Opciones de corrección.
          * @params {Boolean} auto Si ``true``, se aplicaráb las correciones de la cadena.
          *
          * @returns {CorrSys} El propio objeto.
          */
         CorrSys.prototype.initialize = function(name, opts, auto) {
            this.setParams(name, opts);
            const sc = this[this.getProp(name)];
            try {
               sc[name].prop.auto = sc[name].prop.default_auto;  // Issue #39
               if(auto !== undefined) sc[name].prop.auto = !!auto;
            }
            catch(error) {
               console.warn("¿Está intentando inicializar una corrección encadenada?");
               throw error;
            }

            return this;
         }

         /**
          * Comprueba si la cadena forma un bucle
          *
          * @param {String}  chain  Los nombres de las correcciones que forman la cadena.
          * @oaram {?String} name   La nueva corrección que se desea añadir a la cadena.
          * Si no se define, se entenderá que *chain* ya lo incorpora.
          *
          * @returns {Boolean} ``true``, si se forma bucle.
          */
         CorrSys.prototype.looped = function(chain, name) {
            chain = chain.split(" ");
            if(!name) name = chain.pop();

            return chain.indexOf(name) !== -1;
         }

         /**
          * Devuelve todos las opciones con las que se ha aplicado automáticamente
          * una corrección.
          * 
          * @param {String} name  El nombre de la corrección.
          *
          * @returns {Object}  Un objeto en que las claves son las correcciones originales
          * que provocaron las correcciones y los valores las opciones de corrección.
          */
         CorrSys.prototype.getAutoParams = function(name) {
            const sc = this[this.getProp(name)];
            if(!sc) throw new Error(`${name}: corrección no registrada`);

            name = this._normalizeName(name);
            const params = sc[name].prop.chain_params;

            let res = {};
            for(const n in params) {
               res[this.getOriginal(n)] = params[n];
            }
            return res;
         }

         /**
          * Devuelve la correccion original que desencadenó
          * la corrección que se consulta.
          *
          * @param {String} name  El nombre de la corrección.
          *
          * @returns {String} La corrección que originariamente
          * desencadenó la corrección suministrada.
          */
         CorrSys.prototype.getOriginal = function(name) {
            const idx = name.indexOf(" ");
            return idx === -1?name:name.substring(0, idx);
         }
         // Fin issue #37

         /**
          * Devuelve todas las correcciones que ha desencadenado
          * automáticamente la corrección suministrada y cuáles
          * han sido los parámetros con los que se ha desencadenado.
          * Se incluye a sí misma.
          *
          * @param {String} name  El nombre de la corrección desencadenante.
          *
          * @returns {Object} Objeto en que cada clave es una de las
          * correcciones desencadenadas y el valor, los parámetros con los
          * que se aplicó.
          */
         CorrSys.prototype.getAutoCorrs = function(name, ret) {
            ret = ret || {}; 

            const sc = this[this.getProp(name)];
            if(!sc) throw new Error(`${name}: corrección no registrada`);

            let [prename, postname] = this._normalizeName(name, true);

            if(prename) {
               const opts = sc[postname].prop.chain_params[prename];
               if(opts) ret[postname] = opts;
            }
            else ret[name] = sc[name].prop.params;

            for(const chain of sc[postname].prop.chain) {
               if(this.looped(name, chain.corr)) continue;
               this.getAutoCorrs(name + " " + chain.corr, ret);
            }

            return ret;
         }

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
    * Consulte la opción ``filter`` de las :js:attr:`optiones de Marker <Marker.options>`
    * para conocer cuáles son sus valores posibles.
    * @classdesc Implementa un sistema de filtros para las marcas.
    * Las :js:class:`clases de marcas definidas como mutables <Marker>` definen
    * una propiedad ``filter`` que es un objeto de este tipo, de modo que los métodos
    * que definen o aplican filtros a las marcas de la clase (:js:meth:`Marker.registerF`,
    * :js:meth:`Marker.filter`, :js:meth:`Marker.unfilter`),
    * utilizan este objeto.
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
       * @param {String}  name  Nombre del filtro.
       * @param {Object}  obj   Propiedades del filtro.
       * @param {String|Array.<String>} obj.attrs Nombre de las propiedades de los datos
       * cuyos valores afecta al filtro.
       * @param {Function} obj.func  Función que filtra. Debe devolver
       * ``true`` (sí filtra) o ``false``.
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
       * Obtiene las opciones de filtrado de un determinado filtro.
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
         markerClass.invoke("refresh", null, exhideable && !this.hideable && old);
      }

      // Issue #40
      /**
       * Resetea el objeto.
       *
       * @param {Boolean} deep  Si ``true``, elimina del sistema los filtros;
       * de lo contrario, sólo los marca como desaplicados.
       */
      FilterSys.prototype.reset = function(deep) {
         if(deep) for(const name in this) delete this[name];
         else for(const name in this) this.disable(name);
         return this;
      }
      // Fin issue #40

      return FilterSys;
   })();
   // Fin issue #5

})();
