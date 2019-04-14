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
   // En este punto, los centros no se añadido a la capa,
   // así que no hay ni que refrescar.
   g.Centro.do("bilingue", {bil: ["Inglés"]});
   g.Centro.do("adjpue", {puesto: ["11590107", "00590059"]});
   g.Centro.filter("adj", {min: 1});
   g.Centro.filter("oferta", {min: 1});

   console.log("DEBUG", `Centro añadidos: ${g.Centro.store.length}`);

   g.fire(function() {
      console.log("Se han acabado de cargar los centros");
      //Ahora sí hay centros, asi que sí debemos refrescar
      g.Centro.do("vt+", {});
      g.Centro.invoke("refresh");
   });

   // A efectos de depuración
   g.cluster.on("layeradd", function(e) {
      const marca = e.layer;
      marca.on("click", function(e) {
         const icon = e.target.options.icon;
         console.log("DEBUG - ident", e.target.feature.properties.name);
         console.log("DEBUG - marca", e.target);
         console.log("DEBUG - datos", e.target.getData());
         console.log("DEBUG - filtrado", e.target.filtered);
      });
   });

   poblarSelectores()
   document.querySelector("select[name='especialidad']").dispatchEvent(new Event("change"));

   x = g;
}
