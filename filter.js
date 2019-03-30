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
const Corregible = (function() {
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
       * - name: Nombre de la corrección.
       * TODO: Estas funciones deben cumplir que:
       *  - this es el objeto marker correspondiente.
       *  - Esperan recibir un argumento que puede ser:
       *       - Si la corrección se dedica a eliminar elementos, cada elemento
       *         del array (apply hará un for sobre todos los elementos).
       *       - Si la corrección se dedica a añadir elementos, el propio array.
       *  - Devuelve:
       *       - Si añade valores, un array con los nuevos valores.
       */
      apply: function(name) {
         if(this.corr.hasOwnProperty(name)) return false; // Ya aplicado.
         //TODO: Esto dependerá de cómo se defina el sistema de correcciones.
         const add = this._sc[name].add,
               func = this._sc[name].func;
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
       */
      unapply: function(name) {
         if(!this.corr.hasOwnProperty(name)) return false; // No se había aplicado.
         //TODO: Esto dependerá de cómo se defina el sistema de correcciones.
         const add = this._sc[name].add;
         if(add) {
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
      },
      /**
       * Limpia el array de todas las correcciones.
       */
      clear = function() {

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

   function Corregible(arr, sc) {
      if(!(arr instanceof Array)) throw new TypeError("El objeto no es un array");
      Object.assign(arr, Prototype);  // Evitamos hacer una subclase de array porque es menos eficiente.
      /**
       * Sistema de correcciones que se aplica sobre el array.
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
