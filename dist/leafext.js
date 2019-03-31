(function() {
   "use strict";

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
            if(opts[attr]) this[attr] = opts[attr];
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
    *    const Icon = L.divIcon.extend({
    *       options: {
    *          updater: updater,
    *          className: "icon",
    *          iconSize: [25, 34],
    *          iconAnchor: [12.5, 34],
    *          html: elemento_html
    *       }
    *    });
    *
    *    const params = {numvac: 6, tipo: "normal"};
    *    const icon = new Icon({params: params});
    *
    * Los parámetros que se pasan son:
    *
    * + updater:
    *     Función que se encarga de modificar el elemento HTML que define
    *     el icono según los valores de sus propiedades (numvac y tipo en el ejemplo).
    *
    * + iconSize:
    *     Si definimos el tamaño exacto a través de CSS (lo cual no es recomentable),
    *     debe ser null.
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
    * + params:
    *     Los valores cambiantes que se usan para redefinir el icono.
    *
    */
   const initDivIcon = L.DivIcon.prototype.initialize;

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
      if(options.html && options.updater) options.html = getElement(options.html);
      return Icon;
   }

   L.DivIcon.prototype.initialize = function(opts) {
      const params = opts.params;
      delete opts.params;
      initDivIcon.call(this, opts);
      if(!this.options.updater) return;
      this.options.params = new Options(params);
      this.options.params.reset();
      // container estará indefinido si se proporcionó html en el prototipo.
      const html = (this.options.html.container !== undefined)?this.options.html.cloneNode(true):getElement(this.options.html);
      html.container = this.options.html.container;
      this.options.updater.call(html, this.options.params);
      this.options.html = html.container?html.innerHTML:html.outerHTML;
   }

   const MarkerExtend = L.Marker.extend;

   L.Marker.extend = function(obj) {
      const Marker = MarkerExtend.call(this, obj);
      const options = Marker.prototype.options;
      if(options.corr) { // Si es true.
         // Debe crearse un objeto de filtro que forme parte del prototipo.
         // En este objeto de filtro se registrarán los distintos criterios de filtrado
         // (ejemplo de criterio: filtrar marcas cuyo centro no tenga vacantes, etc)
         // De ese modo, todas las marcas que se creen con esta clase de marca
         // compartiran el mismo objeto de filtro.
         options.corr = new CorrSys();
      }
      return Marker;
   }

   // Refresca la marca en caso de que haya que redibujar el icono asociado.
   L.Marker.prototype.refresh = function() {
      const icon = this.options.icon;
      if(!icon.options.params || icon.options.params.updated) return false;
      icon.options.updater.call(this.getElement(), icon.options.params.modified);
      icon.options.params.reset();
      return true;
   }
   

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
    *            [ valor1, valor2, valor3]
    *  {
    *    corr1:  [ true  ,  true , false ]
    *    corr2:  [ true  , false ,  null ]
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
            // TODO: Es más eficiente hacer un bucle for.
            return Object.keys(this.corr).filter(c => c[idx]);
         }
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
               const filters = this.filters(i));
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
          * @returns {boolean}  Verdadero si se aplicó la correción y
          *    falso si no se hizo porque ya estaba aplicada.
          */
         apply: function(func) {
            const name = func.prop.name,
                  add  = func.prop.add;
            if(this.corr.hasOwnProperty(name)) return false; // Ya aplicado.
            if(add) {
               const values = func(this):
               let num = values.length;
               this.push.apply(this, values);  // La función devuelve un array con los nuevo valores.

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
               this.corr[name] = this.map(e => func(e));
               //this.corr[name] = new Array(this.length);
               //for(let i=0; i<this.length; i++) this.corr[name][i] = func(this.length[i])
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
      Object.defineProperty(Prototype, "total", {
         get: function() {
            if(this._count !== undefined) return this._count;
            this._count = 0;
            for(let i=0; i<arr.length; i++) if(!this.filters(i)) this._count++;
            return this._count;
         },
         enumerable: false,
         configurable: false
      });

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
            writable: false
            enumerable: false,
            configurable: false,
         });
         // Pre-almacena el número de elementos para mejorar el rendimiento.
         Object.defineProperty(this, "_count", {
            value: arr.length,
            writable: true,
            configurable: false,
            enumerable: false
         });

         return arr;
      }

      return Corregible;
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
    */
   var CorrSys =(function() {

      function CorrSys() {
      }

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
       *    La función debe usar como contexto la Marca a la que pertenece el objeto
       *    que contiene el array y recibirá como único parámetro o bien el atributo
       *    array que sufrirá la corrección o bien un elemento individual del
       *    array. Que reciba uno u otro depende del "add".
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
       * @returns {Object}  Un Objeto en que cada atributo es el nombre
       * de las corrección y cada valor la función que aplica tal corrección.
       */
      CorrSys.prototype.getCorrections = function(attr) {
         return this[attr];
      }

      return CorrSys;
   });

})();
