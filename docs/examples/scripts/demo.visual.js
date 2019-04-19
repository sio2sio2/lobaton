window.onload = function() {
   function poblarSelectores() {
      const selectEstilo = document.querySelector("select[name='estilo']");
      const selectEsp = document.querySelector("select[name='especialidad']");

      selectEstilo.addEventListener("change", e => g.cambiarIcono(e.target.value));

      selectEsp.addEventListener("change", function(e) {
         g.cluster.clearLayers();
         g.Centro.reset();
         L.utils.load({
            url: this.value,
            callback: function(xhr) {
               const centros = JSON.parse(xhr.responseText);
               g.agregarCentros(selectEstilo.value, centros);
            }
         });
      });
   }

   const g = new MapaAdjOfer("map", "../..");
   // En este punto, los centros no se han añadido a la capa,
   // así que no es necesario refrescar.
   g.Centro.correct("bilingue", {bil: ["Inglés"]});
   g.Centro.correct("adjpue", {puesto: ["11590107", "00590059"]});
   g.Centro.filter("adj", {min: 1});
   g.Centro.filter("oferta", {min: 1});

   console.log("DEBUG", `Centro añadidos por ahora: ${g.Centro.store.length}`);

   g.lanzarTrasDatos(function() {
      console.log("Se han acabado de cargar los centros");
      //Ahora sí hay centros, asi que sí debemos refrescar
      g.Centro.correct("vt+", {});
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

   poblarSelectores();
   document.querySelector("select[name='especialidad']").dispatchEvent(new Event("change"));

   x = g;
}
