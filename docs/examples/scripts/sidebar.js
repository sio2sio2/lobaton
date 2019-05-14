window.onload = function() {

   // Objeto de manipulación del mapa.
   g = mapAdjOfer("../../dist", {
      zoom: 8,
      center: [37.45, -4.5],
      unclusterZoom: 13,
      search: false,
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

   sidebar = L.control.sidebar({ container: 'sidebar', closeButton: true })
                   .addTo(g.map)
                   .open("selector");

   const Despliegue = L.Control.extend({
      onAdd: function(map) {
         const button = L.DomUtil.create("button"),
               icon = L.DomUtil.create("i", "fa fa-arrow-down");

         button.id = "view-sidebar";
         button.setAttribute("type", "button");
         button.appendChild(icon);
         button.addEventListener("click", e => {
            this.remove(map);
         });

         return button;
      },
      onRemove: map => {
         sidebar.addTo(map);
         // Por alguna extraña razón (que parece un bug del plugin)
         // hay que volver a eliminar y añadir la barra para que funcione
         // el despliegue de los paneles.
         sidebar.remove();
         sidebar.addTo(map);
      }
   });

   document.querySelector("#sidebar i.fa-arrow-up").closest("a")
           .addEventListener("click", e => {
      sidebar.remove();
      new Despliegue({position: "topleft"}).addTo(g.map);
   });

   document.querySelector("#sidebar i.fa-square-o").closest("a")
           .addEventListener("click", e => {
      g.map.toggleFullscreen();
   });

   function createSearchPanel(id) {
      const panel = document.createElement("article");
      document.getElementById(id).appendChild(panel);
      const input = document.createElement("input");
      const datalist = document.createElement("datalist");
      panel.appendChild(input);
      panel.appendChild(datalist);

      function label(d) {
         const isFirefox = typeof InstallTrigger !== "undefined";
         // Firefox no muestra value en la lista de sugerencias, así
         // que debemos añadir el código de provincia al nombre del centro.
         return true?`(${String(d.id.cp).substring(0,2)}) ${d.id.nom}`:d.id.nom;
      }

      function filterData(text) {
         const pathData = g.Centro.prototype.options.mutable;
         return new Fuse(
            g.cluster.getLayers(), {
               keys: [pathData + ".id.nom"],
               minMatchCharLength: 2,
            }).search(text);
      }

      datalist.id = "sugerencias";
      input.setAttribute("list", "sugerencias");
      input.setAttribute("name", "centro");
      input.setAttribute("placeholder", "Escriba el nombre...");

      input.addEventListener("input", e => {
         const opts = Array.from(datalist.querySelectorAll("option")).map(o => o.value);

         datalist.innerHTML = "";
         if(opts.indexOf(e.target.value) !== -1) {
            e.target.setCustomValidity("");
            g.seleccionado = g.Centro.get(e.target.value);
            e.target.value = "";
            g.map.setView(g.seleccionado.getLatLng(),
                          g.cluster.options.disableClusteringAtZoom);
         }
         else {
            if(e.target.value.length > 2) {
               const res = filterData(e.target.value);
               for(const centro of res)  {
                  const option = L.DomUtil.create("option", undefined, datalist),
                        data = centro.getData();
                  option.value = data.id.cod;
                  option.textContent = label(data);
               }
            }
            e.target.setCustomValidity("Centro no encontrado");
         }
      });
   }

   createSearchPanel("busqueda");

   g.on("markerselect", e => {
      if(!sidebar._map) { // La barra no está desplegada.
         document.getElementById("view-sidebar").dispatchEvent(new Event("click"));
      }
      sidebar.open("centro");
   });

}
