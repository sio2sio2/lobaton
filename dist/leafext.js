(function() {
   "use strict";

   /**
    * Permite obtener el valor de una propiedad de forma
    * que getProperty(x, "a.b") devolvería el valor de x.a.b
    */
   function getProperty(obj, name) {
      let res = obj;
      name = name.split(".");

      while(name.length) {
         res = res[name.shift()];
         if(res === undefined) break;
      }
      return res;
   }


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
    * Una vez creado el objeto, puede modificarse los valores de los atributos
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
    *    // attrs son los parámetros que sirven para dibujar el icono.
    *    // o es el objeto con los datos en crudo a partir de los cuales
    *    // se obtienen los valores de los parámetros.
    *    function converter(attrs, o) {
    *       return Object.keys(o).filter(e => attrs.indexOf(e) !== -1).
    *          reduce((res, e) => { res[e] = o[e]; return res}, {});
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
    *     las propiedades que permiten definir el icono. En el ejemplo, attrs
    *     debería ser ["numvac", "tipo"] y debería devolver un objeto de la
    *     forma: { numvac: 5, tipo: "normal"}.
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
      if(typeof e === "String") {
         e = new DomParser().parseFromString("<div>" + html + "</div>", 'text/html');
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
      if(options.updater && options.html) {
         if(!options.converter) options.converter = data => Object.assign({}, data);
         options.html = getElement(options.html);
         Object.assign(Icon.prototype, IconPrototype);
      }
      return Icon;
   }

   const createDivIcon = L.DivIcon.prototype.createIcon;

   const IconPrototype = {
      createIcon: function() {
         this.options.params = new Options(this.options.converter(this._marker.getData()));
         this.options.params.reset();
         if(!this.options.hasOwnProperty("html")) {
            const html = this.options.html.cloneNode(true);
            html.container = this.options.html.container;
            this.options.updater.call(html, this.options.params);
            this.options.html = html.container?html.innerHTML:html.outerHTML;
         }
         return createDivIcon.call(this, arguments);
      }
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
         const icon = this.options.icon;
         if(!icon.options.params || icon.options.params.updated) return false;
         icon.options.updater.call(this.getElement(), icon.options.params.modified);
         icon.options.params.reset();
         return true;
      },
      initialize: function() {
         MarkerInitialize.apply(this, arguments);
         this.constructor.store.push(this);
         if(this.options.icon) this.options.icon._marker = this;
      },
      setIcon: function(icon) {
         icon._marker = this;
         MarkerSetIcon.apply(this, arguments);
      },
      prepare: function() {  // Convierte Arrays en Correctables.
         const data = getProperty(this, this.options.mutable);
         if(data === undefined) return false;  // La marca no posee los datos.
         this.options.corr.prepare(data);
         return true;
      },
      getData: function() {  // Devuelve los datos asociados a la marca.
         return getProperty(this, this.options.mutable);
      },
      apply: function(name, params) {  // Aplica una corrección.
         const property = this.options.corr.getProp(name),
               sc       = this.options.corr[property],
               arr      = getProperty(this.getData(), property),
               func     = sc[name].bind(this);

         func.prop = Object.assign({}, sc[name].prop);

         // Conversión en Correctable.
         if(!(arr instanceof CorrSys.Correctable)) CorrSys.prototype.prepare(this.getData(), property);

         arr.apply(func, params);

         // TODO: Hay que modificar los parámetros del icono.
         // TODO: Cambiar los GeoJSON para que siempre haya "adj" y "oferta".
         const icon = this.options.icon;
         const data = icon.options.fast?{[property]: arr}:this.getData();
         if(icon.options.params) icon.options.params.change(icon.options.converter(data));
      },
      unapply: function(name) {  // Elimina la corrección.
         const property = this.options.corr.getProp(name),
               arr      = getProperty(this.getData(), property);

         arr.unapply(name);

         const icon = this.options.icon;
         const data = icon.options.fast?{[property]: arr}:this.getData();
         if(icon.options.params) icon.options.params.change(icon.options.converter(data));
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
                     add  = func.prop.add;
               if(this.corr.hasOwnProperty(name)) return false; // Ya aplicado.
               if(add) {
                  const values = func(null, this, params);
                  let num = values.length;
                  this.push.apply(this, values);

                  // Aplicamos las correcciones ya existentes a los nuevos valores.
                  for(const n in this.corr) {
                     thhis.corr[n].length = this.length;
                     if(this._sc[n].add) continue;  // Es una corrección que añade valores.
                     for(let i=this.length-num; i<this.length; i++) this.corr[n][i] = func(this.length[i]);
                  }

                  this.corr[name] = new Array(this.length);
                  for(let i=this.length-num; i<this.length; i++) this.corr[n][i] = null;
                  if(num>0) this._count = undefined;
               }
               else {
                  this.corr[name] = this.map(e => func(e, this, params));
                  //this.corr[name] = new Array(this.length);
                  //for(let i=0; i<this.length; i++) this.corr[name][i] = func(this.length[i], params);
                  if(this.corr[name].some(e => e)) this._count = undefined;
               }
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
               if(this._sc[name].add) {
                  const arr = this.corr[name];
                  let a, b;
                  for(let i=0; i<arr.length; i++) {
                     if(arr[i] === null) {
                        if(a === undefined) a=i;
                     }
                     else {
                        if(a !== undefined) b=i;
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
          * Informa de si la propiedad requerida es corregible.
          *
          * @param {string} attr  Nombre de la propiedad que se quiere investigar.
          * @return {boolean}
          */
         CorrSys.prototype.isCorrectable = function(attr) {
            return this.hasOwnProperty(attr);
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

      CorrSys.Correctable = Correctable;

      return CorrSys;
   })();

})();
