var U = (function() {
   "use strict";

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

   return  {
      load: load,
   }
})();
