// Necesitamos que g sea accesible desde fuera de la función de inicio para poder enlazar la interfaz visual con el mapa
var g;

// menuCorrecciones será un array con las opciones que serán mostradas en el menú de correcciones/filtrado
// Se declara aquí ya que en algunos momentos es necesario acceder a la información textual de las mismas
var menuCorrecciones = [];

window.onload = function() {
   g = mapAdjOfer( "../../dist", {
      zoom: 8,
      center: [37.45, -4.5],
      ors: {
         key: "5b3ce3597851110001cf62489d03d0e912ed4440a43a93f738e6b18e",
      }
   });

   g.on("dataloaded", function(){
      // Si había algún centro seleccionado y/o mostrado, lo deseleccionamos y ocultamos.
      // Esto es útil tras cambiar de especialidad sobre todo
      ocultarInfoCentro();

      //Lo primero que haremos tras cargar los datos será cargar las correcciones oportunas
      cargaCorrecciones();
   });

   //En el momento en el que se seleccione uno de los centros
   g.on("markerselect", function(e) {
      if(e.newval){
         //Mostramos la barra si estaba oculta
         displaySidebar();
         displayInfoCentro(e.newval);
         // Para una mejor visibilidad, al cargar la información del centro, colapsamos los filtros
         collapseFiltros();
      }
      else {
         ocultarInfoCentro();
      }
   });
   
   // Cuando el usuario seleccione una especialidad, se cargarán los datos y se ocultará el selector
   poblarSelectores();
   
   // Filtros y correcciones en ajustes (no requieren que el usuario establezca valores)
   document.querySelectorAll("#ajustes input[id^='filtro:'], #ajustes input[id^='corr:']")
           .forEach(input => input.addEventListener("change", aplicarCambioBinario));

   // No tiene sentido eliminar vacantes no telefónicas, si no se han añadido:
   ligarVacantes();

   // Si se pasó parámetro status a través de la URL, hay que ajustar el
   // estado de la interfaz a las correcciones y filtros aplicados.
   if(g.status) estableceEstados();
   else { // En caso contrario, se aplica por defecto el filtro de centros sin oferta.
      document.getElementById("filtro:oferta").checked = true;
      document.getElementById("filtro:oferta").dispatchEvent(new Event("change"));
   }

   // Esta funcionalidad hace que la barra lateral (sidebar) se abra y cierre pulsando los botones oportunos
   document.getElementById("sidebarCollapse").addEventListener('click', toogleSidebar);
   document.getElementById("close").addEventListener('click', toogleSidebar);
}

/**
 * Establece los estados de los campos de formulario en función
 * de las correcciones y filtros aplicados.
 */
function estableceEstados() {
   const filters = g.Centro.getFilterStatus();

   for(const f in filters) {
      const input = document.getElementById(`filtro:${f}`);
      if(input) input.checked = true;
   }


   // TODO:: Falta aplicarlo a las correcciones.
}

/**
 * Liga los campos del formulario "Añadir vacantes telefónicas" y "Eliminar vacantes
 * no telefónicas", ya que sin lo primero no tiene sentido lo segundo.
 */
function ligarVacantes() {
   // Si se desaplica la corrección que añade las telefónicas,
   // desaplicamos la corrección que filtra por ellas.
   g.Centro.on("uncorrect:vt+", e => g.Centro.uncorrect("vt"));

   // Ligamos los aspectos en la interfaz
   const agregar = document.getElementById("corr:vt+");
   agregar.addEventListener("change", e => {
      const eliminar = document.getElementById("vac");
      if(!eliminar) return;

      eliminar.disabled = !e.target.checked;
      if(!e.target.checked) eliminar.checked = false;
   });
}


/**
 * Aplica/desaplica la corrección al cambiar el input correspondiente
 */
function cambiaCorreccion(e) {
   const cor = sanitizeNombreCorreccion(e.target.name);
   const fieldset = e.target.closest("fieldset");
   const inputs = fieldset.querySelectorAll(`input[name='${e.target.name}']:checked`);

   if(inputs.length>0) {
      params = { [fieldset.getAttribute("name")]: Array.prototype.map.call(inputs, e => e.value) }

      // Para quedarse con las enseñanzas bilingües hay que invertir el sentido de las opciones:
      // El sentido normal del filtro es desecharlas
      if(cor === "bilingue") params.inv = true;

      aplicaCorreccion(cor, params);
   }
   else deshaceCorreccion(cor);

   //Se haga o deshaga la corrección, vamos a actualizar la información del centro que estuviera seleccionado, si es que había alguno
   if (g.seleccionado !== null) {
      displayInfoCentro(g.seleccionado);
   }
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
   g.Centro.correct(cor, params, true);
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


/**
 * Aplica filtros o correcciones en los que el usuario no tiene que establecer
 * las opciones de aplicación, sino que estas ya vienen dadas.
 * Cuáles sean estas opciones, se establece en el valor de data-opts.
 */
function aplicarCambioBinario(e) {
   let aplicacion,
       tipo = e.target.id.startsWith("filtro")?"filter":"correct";

   if(e.target.checked) {
      const opts = JSON.parse(e.target.getAttribute("data-opts"));
      aplicacion = g.Centro[tipo](e.target.name, opts);
   }
   else aplicacion = g.Centro[`un${tipo}`](e.target.name);

   // Cuando una aplicación/desaplicación no se lleva a cabo
   // (por ejemplo, porque ya estaba se devuelve falso. 
   if(aplicacion) g.Centro.invoke("refresh");
}


function poblarSelectores() {
   //Deberíamos cargar esta variable desde otro sitio, ya que no debería poder cambiarlo
   const inputEsp = document.getElementById("esp_selected");
   const opts = Array.from(document.querySelectorAll("#especialidades>option"));

   inputEsp.addEventListener("input", function(e) {
      //Vamos a ocultar el cuadro de selección, y pondremos la esp. seleccionada como título
      if(opts.map(o => o.value).indexOf(this.value) !== -1) {
         this.setCustomValidity("");
         const especialidad = document.querySelector(`#especialidades>option[value="${this.value}"]`).textContent
         document.getElementById("esp_selected_title").innerHTML = especialidad;

         $("#esp").collapse('hide');

         g.cluster.clearLayers();
         g.Centro.reset();
         g.seleccionado = null;
         g.setRuta(null);
         g.agregarCentros(`../../json/${this.value}.json`);
         this.value = "";
      }
      else this.setCustomValidity("Puesto inválido. Escriba parte de su nombre para recibir sugerencias");
      // jQuery. Nota para poder localizar mejor el uso de la librería por si decidimos eliminarla

   });
}

function cargaCorrecciones(){

   // Inicializamos las correcciones para cargarlas de nuevo
   menuCorrecciones = [];
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
      correccion_name: "vt",
      descripcion: "Elimina vacantes que no sean telefónicas",
      values: [{
         opcion_id: "vac",
         opcion_label: "Eliminar vacantes",
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
      methods: {
         cambiaCorreccion: cambiaCorreccion
      },
      template: "#template_correccion"
   });


   // La corrección que elimina vacantes telefónicas
   // está asociada a que se hayan incluido en los ajustes.
   const agregar = document.getElementById("corr:vt+"),
         eliminar = document.getElementById("vac");
   agregar.dispatchEvent(new Event("change"));
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
               decodificaCentro: codigo => g.Centro.get(codigo).getData().id.nom,
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

function ocultarInfoCentro() {
   if( document.querySelector('div#template-centro') !== null && !document.querySelector('div#template-centro').classList.contains("invisible")) {
      document.querySelector('div#template-centro').classList.toggle('invisible');
   }
}

//Evitar propagación del zoom sobre la barra
var sidebar = L.DomUtil.get('sidebar');
L.DomEvent.disableClickPropagation(sidebar);
L.DomEvent.on(sidebar, 'mousewheel', L.DomEvent.stopPropagation);
