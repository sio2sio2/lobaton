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
   var Options = (function() {

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
    *          iconSize: null,
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
    *     Debe ser null, si definimos el tamaño exacto a través de CSS.
    *     Si usamos un SVG para pintar el icono, es mejor definir el SVG
    *     con viewBox y usar iconSize para definir el tamaño.
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
      if(options.filter) { // Si es true.
         // Debe crearse un objeto de filtro que forme parte del prototipo.
         // En este objeto de filtro se registrarán los distintos criterios de filtrado
         // (ejemplo de criterio: filtrar marcas cuyo centro no tenga vacantes, etc)
         // De ese modo, todas las marcas que se creen con esta clase de marca
         // compartiran el mismo objeto de filtro.
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

   // Oculta la marca filtrada
   L.Marker.prototype.hide = function() {
      this.getElement().classList.add("filter");
   }

   // Muestra la marca anteriormente filtrada.
   L.Marker.prototype.show = function() {
      this.getElement().classList.remove("filter");
   }
})();
