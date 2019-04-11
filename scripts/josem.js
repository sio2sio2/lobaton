window.onload = function() {
   function poblarSelectores() {
      const selectEstilo = document.querySelector("select[name='estilo']");
      const selectEsp = document.querySelector("select[name='especialidad']");

      selectEstilo.addEventListener("change", function(e) {
         const Icono = g.Iconos[this.value];
         Icono.onready(() => g.cluster.eachLayer(m => m.setIcon(new Icono())));
      });

      selectEsp.addEventListener("change", function(e) {
         g.cluster.clearLayers();
         const Icono = g.Iconos[selectEstilo.value];
         L.utils.load({
            url: this.value,
            callback: function(xhr) {
               const centros = JSON.parse(xhr.responseText);
               Icono.onready(g.agregarCentros.bind(null, Icono, centros));
            }
         });
      });
   }

   const g = M("map");
   g.fire(function() {
      console.log("DEBUG: Se han acabado de cargar los centros");
   });

   // A efectos de depuración
   g.cluster.on("layeradd", function(e) {
      const marca = e.layer;
      marca.on("click", function(e) {
         const icon = e.target.options.icon;
         console.log("DEBUG - ident", e.target.feature.properties.name);
         console.log("DEBUG - marca", e.target);
         console.log("DEBUG - datos", e.target.getData());
      });
   });

   /*
   // A cada centro añadido le aplicamos algunas correciones.
   g.cluster.on("layeradd", function(e) {
      const marca = e.layer;
      marca.apply("bilingue", {bil: ["Inglés"]});
      marca.apply("vt+", {});
      marca.apply("adjpue", {puesto: ["11590107", "00590059"], inv: true});
      // Redibujamos por si la marca ya estaba pintada.
      marca.refresh();
   });
   */

   poblarSelectores()
   document.querySelector("select[name='especialidad']").dispatchEvent(new Event("change"));

}
