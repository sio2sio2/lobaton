var g;
// menuCorrecciones será un array con las opciones que serán mostradas en el menú de correcciones/filtrado
// Se declara aquí ya que en algunos momentos es necesario acceder a la información textual de las mismas
var menuCorrecciones = [];

window.onload = function() {
   g = new MapaAdjOfer("map", "../../dist");
   g.lanzarTrasDatos(cargaCorrecciones);
   //cargaCorrecciones();

   g.cluster.on("layeradd", function(e) {
      const marca = e.layer;
      marca.addEventListener("click", function(e) {
         //Mostramos la barra si estaba oculta
         displaySidebar();
         displayInfoCentro(e.target);
         // Para una mejor visibilidad, al cargar la información del centro, colapsamos los filtros
         collapseFiltros();
      });
   });

   x = g;

   // Cuando el usuario seleccione una especialidad, se cargarán los datos y se ocultará el selector
   poblarSelectores();
   
   //Vamos a hacer que un cambio en uno de los filtros de corrección se aplique instantáneamente
   $(document).on("change", ".correccion", function(e) {
      //Eliminamos los paréntesis y demás elementos del nombre de la corrección
      cor = sanitizeNombreCorreccion(e.target.name);

      if ($("input[name='" + e.target.name + "']").filter(":checked").length > 0) {
         /*
            Recorreremos todos los valores activos de la corrección cambiada. 
            Recordar que una misma corrección puede tener varios valores posibles aplicados (bilingÑuismo en inglés y francés, etc.)
         */
         let params = {
            [$(this).closest("fieldset").attr("name")]: $("input[name='" + e.target.name + "']").filter(":checked").map(function () {
                  return $(this).val();
            }).get()
         };

         // Aplicamos la corrección
         aplicaCorreccion(cor, params);
      }
      else {
         // O la deshacemos
         deshaceCorreccion(cor);
      }
   });

   //Filtros

   //Vamos a enlazar los checkboxes para que efectúen el filtrado o no de los correspondientes centros
   document.getElementById("ocultar_centros_oferta").addEventListener("change", function(e) {
      filtrarCentrosSinOferta(this.checked);
   });

   document.getElementById("ocultar_centros_adj").addEventListener("change", function(e) {
      filtrarCentrosSinAdjudicaciones(this.checked);
   });

   //Por defecto, el filtrado de centros con enseñanzas mínimas estará activo
   filtrarCentrosSinAdjudicaciones(false);
   filtrarCentrosSinOferta(true);


   // Esta funcionalidad hace que la barra lateral (sidebar) se abra y cierre pulsando los botones oportunos
   document.getElementById("sidebarCollapse").addEventListener('click', toogleSidebar);
   document.getElementById("close").addEventListener('click', toogleSidebar);
}

/**
* Función que se encarga de mostrar u ocultar la barra lateral
*/
function toogleSidebar() {
   document.getElementById('sidebar').classList.toggle('active');
   document.getElementById('sidebarCollapse').classList.toggle('invisible');
}

/**
 * Esta función muestra la barra lateral si estaba oculta, y no hace nada si estaba visible
 */
function displaySidebar() {
   if ( ! document.getElementById('sidebarCollapse').classList.contains('invisible')) {
      toogleSidebar();
   }
}

function aplicaCorreccion(cor, params) {
   g.Centro.correct(cor, params);
   g.Centro.invoke("refresh");
}

function deshaceCorreccion(cor) {
   g.Centro.uncorrect(cor);
   g.Centro.invoke("refresh");
}

function sanitizeNombreCorreccion(cor) {
   if (cor.indexOf("[") !== -1) {
      cor = cor.slice(0, -2);
   }
   return cor;
}

function filtrarCentrosSinAdjudicaciones(mostrar){
   if(mostrar){
      g.Centro.filter("adj", {min: 1});
   }
   else {
      g.Centro.unfilter("adj");
   }
   g.Centro.invoke("refresh");
}

function filtrarCentrosSinOferta(mostrar){
   if(mostrar){
      g.Centro.filter("oferta", {min: 1});
   }
   else {
      g.Centro.unfilter("oferta");
   }
   g.Centro.invoke("refresh");
}

function poblarSelectores() {
   //Deberíamos cargar esta variable desde otro sitio, ya que no debería poder cambiarlo
   const selectEstilo = "boliche";
   const selectEsp = document.querySelector("select[name='especialidad']");

   selectEsp.addEventListener("change", function(e) {
      //Vamos a ocultar el cuadro de selección, y pondremos la esp. seleccionada como título
      document.getElementById("esp_selected_title").innerHTML = e.target.options[e.target.selectedIndex].text;
      // jQuery. Nota para poder localizar mejor el uso de la librería por si decidimos eliminarla
      $("#esp").collapse('hide');

      g.cluster.clearLayers();
      g.Centro.reset();
      L.utils.load({
         url: this.value,
         callback: function(xhr) {
            const centros = JSON.parse(xhr.responseText);
            g.agregarCentros(selectEstilo, centros);
            
         }
      });
   });

   
}

function cargaCorrecciones(){

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
      descripcion: "Elimina las adjudicaciones de los puestos:",
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

/**
 * Esta función se crea para evitar introducir código jQuery en "las entrañas" del código base,
 * y así ser capaz, en el futuro, de poder eliminar el uso de dicha librería
 */
function collapseFiltros() {
   $("#filtros").collapse('hide');
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
               decodificaCentro: function(codCentro){
                     let c;
                     for(c of centro.constructor.store) {  // centro.constructor === g.Centro
                        if(c.getData().id.cod === codCentro) break;
                     }
                     return c.getData().id.nom;
               },
               /*
                * Devuelve el nombre de un puesto dado su código
                */
               nombrePuesto: function(codPuesto){
                  return g.general.puestos[codPuesto];
               },
               /*
               * Devuelve el nombre de un filtro dado su atributo name en html del menú
               */
               detallaFiltros: function(filtro){
                  let nombre;
                  for (cor of menuCorrecciones){
                     if(sanitizeNombreCorreccion(cor.correccion_name) === filtro) {
                        nombre = cor.nombre;
                        break;
                     }
                  }
                  return nombre;
               }
            }
         });
   }
}

//Evitar propagación del zoom sobre la barra
var sidebar = L.DomUtil.get('sidebar');
L.DomEvent.disableClickPropagation(sidebar);
L.DomEvent.on(sidebar, 'mousewheel', L.DomEvent.stopPropagation);
