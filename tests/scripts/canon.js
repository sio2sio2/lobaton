(function() {

// Objeto para acceso global dentro del script
const g = {
   map: undefined,    // Mapa.
   Centro: undefined  // Clase para las marcas de centro.
}

// Carga del mapa con todos sus avíos.
function init() {

   var cluster;

   function pintarMapa() {
      g.map = L.map("map").setView([37.07, -6.27], 9);
      g.map.addControl(new L.Control.Fullscreen({position: "topright"}));
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
      }).addTo(g.map);
   }

   function configSelectores() {
      const cantidad = document.querySelector("select[name='marca']").value;
      const estilo = document.querySelector("select[name='estilo']").value;

      document.querySelector("select[name='estilo']").addEventListener("change", function(e) {
         const cantidad = document.querySelector("select[name='marca']").value;
         redefineMarcas(this.value, cantidad, cluster);
      });

      document.querySelector("select[name='marca']").addEventListener("change", function(e) {
         cluster.clearLayers();
         const estilo = document.querySelector("select[name='estilo']").value;
         redefineMarcas(estilo, this.value, cluster);
      });
   }

   function redefineMarcas() {
   }

   // Capa que agrupa las marcas.
   cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      // Al llegar a nivel 14 de zoom se ven todas las marcas.
      disableClusteringAtZoom: 14,
      spiderfyOnMaxZoom: false
   }).addTo(map);

   pintarMapa();
   configSelectores();
}


window.onload = init

})();
