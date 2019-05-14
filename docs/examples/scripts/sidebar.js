window.onload = function() {

   // Objeto de manipulación del mapa.
   g = mapAdjOfer("../../dist", {
      zoom: 8,
      center: [37.45, -4.5],
      ors: {
         key: "5b3ce3597851110001cf62489d03d0e912ed4440a43a93f738e6b18e",
      }
   });

   // Los filtros se conservan al cargar nuevos datos
   // así que podemos fijarlos de inicio.
   g.Centro.filter("adj", {min: 1});
   g.Centro.filter("oferta", {min: 1});

   // Acciones que se desencadenan al seleccionar/deseleccionar un centro
   g.on("markerselect", function(e) {
      if(e.newval) {
         const layer = e.newval;
         console.log("Se ha seleccionado el centro " + layer.getData().id.nom);
         console.log("marca", layer);
         console.log("datos", layer.getData());
         console.log("filtrado", layer.filtered);
         console.log("oferta", Array.from(layer.getData().oferta));
         console.log("adj", Array.from(layer.getData().adj));
      }
      else console.log("Se ha deseleccionado el centro " + e.oldval.getData().id.nom);
   });

   // Tras cargar los datos, se desencadena esto
   g.on("dataloaded", function() {
      console.log("Se han acabado de cargar los centros");

      // Aplicamos unas correcciones automáticamente.
      g.Centro.correct("bilingue", {bil: ["Inglés"]});
      g.Centro.correct("adjpue", {puesto: ["00590059"]});
      g.Centro.correct("vt+", {});
      g.Centro.invoke("refresh");

      console.log("Estado de correcciones", g.Centro.getCorrectStatus());
      console.log("Estado de filtros", g.Centro.getFilterStatus());
   });

   /*
   function poblarSelectores() {
      const selectEstilo = document.querySelector("select[name='estilo']");
      const selectEsp = document.querySelector("select[name='especialidad']");

      selectEstilo.addEventListener("change", e => g.setIcon(e.target.value));

      selectEsp.addEventListener("change", function(e) {
         g.cluster.clearLayers();
         g.Centro.reset();
         g.setRuta(null);

         g.agregarCentros(this.value);
      });
   }

   poblarSelectores();
   document.querySelector("select[name='especialidad']").dispatchEvent(new Event("change"));
   */
   
   g.agregarCentros("../../json/590107.json");

   // Prueba para meter el cajetín de búsqueda dentro de la barra lateral
   const data = [
      {loc:[37, -6], title:"algo inútil"}
   ]

   g.map.addControl(new L.Control.Search({
      container: "busqueda",
      layer: g.cluster,
      initial: false,
      collapsed: false,
   }));

   const sidebar = L.control.sidebar({ container: 'sidebar' })
                   .addTo(g.map)
                   .open("selector");

}
