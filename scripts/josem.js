var g;

(function() {

   function init() {
      g = M("map");  // Cargamos el mapa y los iconos.
      g.fire(function() {
         console.log("DEBUG: Esto se lanza al acabar de cargar los centros.");
         cargaCorrecciones();
      });

      g.cluster.on("layeradd", function(e) {
         const marca = e.layer;
         marca.on("click", function(e) {
            displayInfoCentro(e.target);
         });
         marca.on("click", function(e) {
            const m = e.target;
            console.log("DEBUG", m.getData().id.nom);
            console.log("DEBUG", m.getData());
         });
      });

      poblarSelectores();
      document.querySelector("select[name='especialidad']").dispatchEvent(new Event("change"));
   }

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

   function cargaCorrecciones(){
      console.log("Cargando correcciones");
      // menuCorrecciones será un array con las opciones que serán mostradas en el menú de correcciones/filtrado
      let menuCorrecciones = [];

      /* 
      Registramos manualmente los idiomas por los que queremos que se pueda filtrar. 
      Dichos idiomas no pueden obtenerse de ningún listado, por lo que si el día de mañana
      cambiaran, habría que añadirlos a mano
      */
     idiomas = [
         {
         opcion_id: "ing",
         opcion_label: "Inglés",
         opcion_valor: "Inglés",
         opcion_checked: ""
         },
         {
            opcion_id: "fra",
            opcion_label: "Francés",
            opcion_valor: "Francés",
            opcion_checked: ""
         },
         {
            opcion_id: "ale",
            opcion_label: "Alemán",
            opcion_valor: "Alemán",
            opcion_checked: ""
         }
      ];

      //Añadimos las correcciones de bilingüismo al menú
      menuCorrecciones.push({
         nombre: "Bilingüismo",
         correccion_id: "bil",
         correccion_name: "bilingue[]",
         descripcion: "Muestra únicamente centros bilingües en:",
         values: idiomas
      });

      //Añadimos las correcciones de vacantes telefónicas al menú
      menuCorrecciones.push({
         nombre: "Vacantes telefónicas",
         correccion_id: "vac",
         correccion_name: "vt+",
         descripcion: "Añade las vacantes telefónicas a las adjudicaciones",
         values: [{
            opcion_id: "vac",
            opcion_label: "Añadir vacantes",
            opcion_valor: "Vac",
            opcion_checked: ""
            }]
      });

      // Correcciones de adjudicaciones
      menuCorrecciones.push({
         nombre: "Adjudicaciones",
         correccion_id: "puesto",
         correccion_name: "adjpue[]",
         descripcion: "Elimina las adjudicaciones que no sean de los puestos:",
         values: Object.keys(g.general.puestos).map(function(key, index){
            return {
               opcion_id: key,
               opcion_label: g.general.puestos[key],
               opcion_valor: key,
               opcion_checked: ""
            }
         })
      });

      // Por último, asignamos los valores a la plantilla
      var app = new Vue({
         el: '#correcciones',
         data: {
             correcciones: menuCorrecciones
         },
         template: "#template_correccion"
     });
   }

   function displayInfoCentro(centro) {
      // Test to see if the browser supports the HTML template element by checking
      // for the presence of the template element's content attribute.
      if ('content' in document.createElement('template')) {
          var app = new Vue({
              el: '#template-centro',
              data: {
                  datosCentro: centro.getData(),
                  info: g.general
              },
              template: "#template-centro",
              filters: {
                  capitalize: function (value) {
                    if (!value) return ''
                    value = value.toString()
                    return value.charAt(0).toUpperCase() + value.slice(1)
                  },
                  /* 
                  * DecodificaCentro devuelve el nombre de un centro dado un código. 
                  * Utilizado principalmente para obtener el nombre del centro en enseñanzas trasladadas
                  */
                  // TODO: Probar esto, que lo he cambiado.
                  decodificaCentro: function(codCentro){
                      let c;
                      for(c of centro.constructor.store) {  // centro.constructor === g.Centro
                        if(c.getData().id.cod === codCentro) break;
                      }
                      return c.getData().id.nom;
                  }
                }
          });
      }
   }
   window.onload = init();

})();

