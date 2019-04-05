(function() {

// Objeto para acceso global dentro del script
const g = {
   map: undefined,    // Mapa.
   Centro: undefined  // Clase para las marcas de centro.
}


// Carga del mapa con todos sus avíos.
function init() {

   var cluster;
   var estilo;

   function crearMapa() {
      g.map = L.map("map").setView([37.07, -6.27], 9);
      g.map.addControl(new L.Control.Fullscreen({position: "topright"}));
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
      }).addTo(g.map);

      // Capa que agrupa las marcas.
      cluster = L.markerClusterGroup({
         showCoverageOnHover: false,
         // Al llegar a nivel 14 de zoom se ven todas las marcas.
         disableClusteringAtZoom: 14,
         spiderfyOnMaxZoom: false
      }).addTo(g.map);
   }

   function poblarSelectores() {
      const selectEstilo = document.querySelector("select[name='estilo']");
      const selectEsp = document.querySelector("select[name='especialidad']");

      selectEstilo.addEventListener("change", function(e) {
         setMarcas(this.value, selectEsp.value);
      });

      selectEsp.addEventListener("change", function(e) {
         cluster.clearLayers();  // Los datos serán otros.
         setMarcas(selectEstilo.value, this.value);
      });
   }

   function setMarcas(estilo, json) {
      console.log("DEBUG", estilo, json);
   }

   crearMapa();
   poblarSelectores();

   document.querySelector("select[name='estilo']").dispatchEvent(new Event("change"));

}


/*
 * Los iconos necesitan:
 *    un HTML                    --> obtenido a través de una función.
 *    una función conversora     --> no es la misma para todos. ¡Todos los iconos
 *                                     no representan los mismos datos!
 *    una función actualizadora  --> depende de cada estilo.
 */

// TODO:: Esto convendría pasarlo a leaflet
const IconStyle = (function () {

   /**
    * Constructor de la clase.
    *
    *
    * @param {string|function} element  Elemento que constituirá el icono.
    *    Admite, o bien una cadena que contiene el código HTML, o bien una
    *    función que permite obtener mediante algún método (p.e. AJAX) el
    *    elemento. Tal elemento se devolverá en forma de Document o de
    *    DocumentFragment.
    * @param {function} converter  Función que convierte en opciones de dibujo
    *     los datos asociados a la entidad que representa la marca. Recibe
    *     como único argumento los datos a convertir. Es conveniente que se
    *     escriba permitiendo el paso de datos parciales, de manera que sólo
    *     genere las opciones de dibujo asociadas a esos datos parciales y
    *     no todas.  Por ejemplo, supongamos que tenemos dos datos:
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
    *     Si se escribe de este modo (admitiendo datos parciales), puede
    *     añadirse la opción "fast: true" para que el programa tome ventaja de
    *     este hecho.
    *    
    * @param {function} updater  Función que actualiza el aspecto del icono
    *    a partir de los nuevos valores que tengan las opciones de dibujo.
    *    Toma las opciones de dibujo (o una parte de ellas) y modifica el
    *    elemento DIV (o SVG. etc.) del icono para que adquiera un aspecto
    *    adecuado. SEGUIR (no todas las opciones).
    *    Para estas funciones es muy conveniente SEGUIR...
    */
   function IconStyle(element, converter, updater, opts) {
      this.ready = false;  // Cuando esté disponible el elemento se pasa a true.
   }

})();

window.onload = init


// Peticiones AJAX
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


})();
