window.onload = function() {

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

   function progresaIsocronas(n, total, lapso) {
      const map = L.DomUtil.get("map"),
            progress = L.DomUtil.get("leaflet-progress") || 
                       L.DomUtil.create("progress", "leaflet-message leaflet-control", map);
      progress.id = "leaflet-progress";
      progress.setAttribute("value", n/total);
      if(n === total) setTimeout(() => L.DomUtil.remove(progress), 500);
   }

   // tipo: isocronas, geocode, ruta.
   function cargaDatos(tipo) {
      let loading;
      
      if(loading = L.DomUtil.get("leaflet-loading")) {
         L.DomUtil.remove(loading);
      }
      else {
         loading = L.DomUtil.create("div", "leaflet-message leaflet-control", 
                                    L.DomUtil.get("map"));
         loading.id = "leaflet-loading";
         const img = document.createElement("img");
         img.setAttribute("src", "images/ajax-loader.gif");
         loading.appendChild(img);
      }
   }

   const g = mapAdjOfer("../../dist", {
      zoom: 8,
      center: [37.45, -4.5],
      ors: {
         key: "5b3ce3597851110001cf62489d03d0e912ed4440a43a93f738e6b18e",
         loading: cargaDatos,
         chunkProgress: progresaIsocronas
      }
   });
   // Los filtros se conservan al cargar nuevos datos
   // así que podemos fijarlos de inicio.
   g.Centro.filter("adj", {min: 1});
   g.Centro.filter("oferta", {min: 1});

   // Acciones que se desencadenan al seleccionar/deseleccionar un centro
   g.on("markerselect", function(e) {
      if(e.newval) console.log("Se ha seleccionado el centro " + e.newval.getData().id.nom);
      else console.log("Se ha deseleccionado el centro " + e.oldval.getData().id.nom);
   });

   g.on("dataloaded", function() {
      console.log("Se han acabado de cargar los centros");
      g.Centro.correct("bilingue", {bil: ["Inglés"]});
      g.Centro.correct("adjpue", {puesto: ["00590059"]});
      g.Centro.correct("vt+", {});
      g.Centro.invoke("refresh");
   });

   // A efectos de depuración
   g.cluster.on("layeradd", function(e) {
      const marca = e.layer;
      marca.on("click", function(e) {
         const icon = e.target.options.icon;
         console.log("DEBUG - ident", e.target.getData().id.nom);
         console.log("DEBUG - marca", e.target);
         console.log("DEBUG - datos", e.target.getData());
         console.log("DEBUG - filtrado", e.target.filtered);
         console.log("DEBUG - oferta", Array.from(e.target.getData().oferta));
         console.log("DEBUG - adj", Array.from(e.target.getData().adj));
      });
   });

   poblarSelectores();
   document.querySelector("select[name='especialidad']").dispatchEvent(new Event("change"));

   x = g;
}
