window.onload = function() {

   function poblarSelectores() {
      const selectEstilo = document.querySelector("select[name='estilo']");
      const selectEsp = document.querySelector("select[name='especialidad']");

      selectEstilo.addEventListener("change", e => g.setIcon(e.target.value));

      selectEsp.addEventListener("change", function(e) {
         g.cluster.clearCentros();
         g.Centro.reset();
         g.setRuta(null);

         g.agregarCentros(this.value);
      });
   }

   const g = mapAdjOfer("../../dist", {
      zoom: 8,
      center: [37.45, -4.5],
      pathLoc: "../../json/localidades.json",
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
      if(marca instanceof g.Localidad) return;

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

   // Para seguir los centros que se piden y dejan de pedirse.
   g.on("requestset", e => {
      const data = e.marker.getData(),
       nom = data.id?data.id.nom:data.nom;

      if(e.newval === 0) {
         console.log(`Deja de pedirse '${nom}'`);
      }
      else if(e.oldval == 0) {
         console.log(`Se pide '${nom}' en la petición ${e.newval}`);
      }
      else {
         console.log(`Se pasa '${nom}' de la petición ${e.oldval} a la ${e.newval}`);
      }
   });

   g.on("requestset", e => {
      e.marker.refresh();
      if(e.marker instanceof e.target.Centro) {
         // Solo si pasa de pedido a no pedido
         // o viceversa debe cambiarse el icono.
         if(!!e.newval !== !!e.oldval) {
            const tipo = e.newval === 0?"BolicheIcono":"SolicitudIcono",
                  Icono = e.target.solicitud[tipo];

            Icono.onready(() => e.marker.setIcon(new Icono()));
         }
      }
   });

   function solicitar() {
      g.solicitud.add("11004866");
      g.solicitud.add(21002100);
      g.solicitud.add(g.Centro.get(23001111));
      g.solicitud.add("11700603C");
      g.solicitud.add(21001910);
   }

   // Sólo hace la solicitud la primera vez
   // que se cargan los datos de informática.
   g.once("dataloaded", function(e) {
      if(e.target.general.entidad[0] === 590107) solicitar();
      else setTimeout(() => e.target.once("dataloaded", arguments.callee), 250);
   });

   poblarSelectores();
   document.querySelector("select[name='especialidad']").dispatchEvent(new Event("change"));

   x = g;
}
