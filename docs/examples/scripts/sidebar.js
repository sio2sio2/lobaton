const Interfaz = (function() {

   // Opciones predeterminadas al arrancar la interfaz.
   const defaults = {
      filtrarOferta: true,    // Filtrar centros sin oferta.
      filtrarAdj: false,      // Filtrar centros sin adjudicaciones.
      incluirTlfo: false,     // Incluir vacantes telefónicas.
      incluirCGT: false,      // Incluir correcciones por CGT.
      ocultarBorrado: false,   // Oculta enseñanzas y adj. borradas.
   }

   function Interfaz(opts) {
      this.options = Object.assign({}, defaults, opts);

      // Objeto de manipulación del mapa.
      this.g = mapAdjOfer("../../dist", {
         zoom: 8,
         center: [37.45, -4.5],
         unclusterZoom: 13,
         search: false,
         ors: {
            key: "5b3ce3597851110001cf62489d03d0e912ed4440a43a93f738e6b18e",
         }
      });

      initialize.call(this);
      createSidebar.call(this);
   }


   // Inicializa el mapa.
   function initialize() {

      if(!this.g.map.toggleFullscreen) {
         console.warn("Falta plugin: https://github.com/Leaflet/Leaflet.fullscreen");
      }

      if(!L.control.sidebar) {
         throw new Error("Falta plugin: https://github.com/nickpeihl/leaflet-sidebar-v2");
      }

      // DEBUG: Elimínese esto en producción.
      this.g.on("markerselect", function(e) {
         if(!e.newval) return;
         const layer = e.newval;
         console.log("Se ha seleccionado el centro " + layer.getData().id.nom);
         console.log("marca", layer);
         console.log("datos", layer.getData());
         console.log("filtrado", layer.filtered);
         console.log("oferta", Array.from(layer.getData().oferta));
         console.log("adj", Array.from(layer.getData().adj));
      });
   }


   // Crea la barra lateral.
   function createSidebar() {

      // Barra lateral
      this.sidebar = L.control.sidebar({ container: 'sidebar', closeButton: true })
                      .addTo(this.g.map)
                      .open("selector");

      // Botón que sustituye a la barra lateral.
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
            this.sidebar.addTo(map);
            // Por alguna extraña razón (que parece un bug del plugin)
            // hay que volver a eliminar y añadir la barra para que funcione
            // el despliegue de los paneles.
            this.sidebar.remove();
            this.sidebar.addTo(map);
         }
      });

      // Botón de enrollado.
      document.querySelector("#sidebar i.fa-arrow-up").parentNode
              .addEventListener("click", e => {
         this.sidebar.remove();
         this.sidebar.despliegue = new Despliegue({position: "topleft"}).addTo(this.g.map);
      });

      // Botón para pantalla completa.
      document.querySelector("#sidebar i.fa-square-o").parentNode
              .addEventListener("click", e => {
         this.g.map.toggleFullscreen();
      });

      // Ocultar los paneles implica también, quitar la barra lateral.
      document.querySelectorAll("#sidebar .leaflet-sidebar-pane .leaflet-sidebar-close")
              .forEach(e => e.addEventListener("click", e => {
         document.querySelector("#sidebar i.fa-arrow-up").parentNode
                 .dispatchEvent(new Event("click"));
      }));

      // Al seleccionar un centro, muestra automáticamente su información.
      this.g.on("markerselect", e => {
         if(!e.newval) return;
         if(!this.sidebar._map) { // La barra no está desplegada.
            document.getElementById("view-sidebar").dispatchEvent(new Event("click"));
         }
         this.sidebar.open("centro");
      });

   }


   /**
    * Inicializa los atributos que son aplicaciones VueJS.
    */
   Interfaz.prototype.initVueJS = function() {
      // Selector de especialidad
      Object.defineProperty(this, "selector", {
         value: initSelector.call(this),
         writable: false,
         configurable: false,
         enumerable: true
      });

      // Buscador de centros
      Object.defineProperty(this, "buscador", {
         value: initBuscador.call(this),
         writable: false,
         configurable: false,
         enumerable: true
      });

      // Aplicador de correcciones a los datos
      Object.defineProperty(this, "filtrador", {
         value: initFiltrador.call(this),
         writable: false,
         configurable: false,
         enumerable: true
      });

      // Ajustes de la interfaz
      Object.defineProperty(this, "ajustes", {
         value: initAjustes.call(this),
         writable: false,
         configurable: false,
         enumerable: true
      });
   }

   function initSelector() {
      return new Vue({
         el: "#esp",
         data: {
            especialidad: null,
            interfaz: this,	
            todas: {
               590101: "Administración de empresas",
               590012: "Alemán",
               590102: "Análisis y química industrial",
               590103: "Asesoría y procesos de imagen personal",
               590008: "Biología y geología",
               590104: "Construcciones civiles y edificación",
               590009: "Dibujo",
               590061: "Economía",
               590017: "Educación física",
               590001: "Filosofía",
               590105: "Formación y orientación laboral",
               590010: "Francés",
               590007: "Física y química",
               590005: "Geografía e historia",
               590002: "Griego",
               590106: "Hostelería y turismo",
               590107: "Informática",
               590011: "Inglés",
               590108: "Intervención sociocomunitaria",
               590013: "Italiano",
               590003: "Latín",
               590004: "Lengua castellana y literatura",
               590006: "Matemáticas",
               590016: "Música",
               590109: "Navegación e instalaciones marinas",
               590110: "Organización y gestión comercial",
               590111: "Organización y procesos de mantenimiento de vehículos",
               590112: "Organización y proyectos de fabricación mecánica",
               590113: "Organización y proyectos de sistemas energéticos",
               590018: "Orientacion educativa",
               590015: "Portugués",
               590114: "Procesos de cultivo acuícola",
               590117: "Procesos de diagnósticos clínicos y productos ortoprotésicos",
               590115: "Procesos de producción agraria",
               590116: "Procesos en la industria alimentaria",
               590118: "Procesos sanitarios",
               590119: "Procesos y medios de comunicación",
               590120: "Procesos y productos de textil, confección y piel",
               590121: "Procesos y productos de vidrio y cerámica",
               590122: "Procesos y productos en artes gráficas",
               590123: "Procesos y productos en madera y mueble",
               590125: "Sistemas electrotécnicos y automáticos",
               590124: "Sistemas electrónicos",
               590019: "Tecnología",
               591201: "Cocina y pastelería",
               591202: "Equipos electrónicos",
               591203: "Estética",
               591204: "Fabricación e instalación de carpintería y mueble",
               591206: "Instalaciones electrotécnicas",
               591207: "Instalaciones y equipos de cría y cultivo",
               591205: "Instalación y mantenimiento de equipos termicos y de fluídos",
               591208: "Laboratorio",
               591209: "Mantenimiento de vehículos",
               591211: "Mecanizado y mantenimiento de máquinas",
               591210: "Máquinas, servicios y producción",
               591212: "Oficina de proyectos de construcción",
               591213: "Oficina de proyectos de fabricación mecánica",
               591215: "Operaciones de procesos",
               591214: "Operaciones y equipos de elaboración de productos alimentarios",
               591216: "Operaciones y equipos de producción agraria",
               591217: "Patronaje y confección",
               591218: "Peluquería",
               591219: "Procedimientos de diagnostico clinico y ortoprotésico",
               591220: "Procedimientos sanitarios y asistenciales",
               591221: "Procesos comerciales",
               591222: "Procesos de gestión administrativa",
               591223: "Producción en artes gráficas",
               591224: "Producción textil y tratamiento fisico-quimicos",
               591225: "Servicios a la comunidad",
               591226: "Servicios de restauración",
               591227: "Sistemas y aplicaciones informáticas",
               591228: "Soldadura",
               591021: "Taller de vidrio y cerámica",
               591229: "Técnicas y procedimientos de imagen y sonido",
            }
         },
         methods: {
            selEspec: function(e) {
               const codigo = e.target.value;
               // El input es válido, sólo si coincode
               // con alguna de las sugerencias.
               if(Object.keys(this.todas).indexOf(codigo) !== -1) {
                  e.target.setCustomValidity("");
                  const especialidad = this.todas[codigo];
                  // TODO:: ¿Ponemos el nombre de la especialidad en algún sitio?
                  console.log("DEBUG: Nombre:", especialidad);

                  // Hay que habilitar todos los botones de la barra lateral.
                  if(!this.especialidad) {
                     document.querySelectorAll("#sidebar .leaflet-sidebar-tabs li.disabled")
                        .forEach(e => e.classList.remove("disabled"));
                  }

                  // Para qué vamos a borrar los datos si es la misma especialidad.
                  if(codigo !== this.especialidad) {
                     this.interfaz.g.cluster.clearLayers();
                     this.interfaz.g.agregarCentros(`../../json/${codigo}.json`);
                  }

                  this.interfaz.g.Centro.reset();
                  this.interfaz.g.seleccionado = null;
                  this.interfaz.g.setRuta(null);
                  this.especialidad = codigo;
                  e.target.value = "";
                  document.querySelector("#sidebar .leaflet-sidebar-tabs li a")
                          .dispatchEvent(new Event("click"));
               }
               else { 
                  e.target.setCustomValidity("Puesto inválido. Escriba parte de su nombre para recibir sugerencias");
               }
            }
         }
      });
   }


   function initBuscador() {
      return new Vue({
         el: "#busqueda :nth-child(2)",
         data: {
            g: this.g,
            pathData: this.g.Centro.prototype.options.mutable,
            patron: null
         },
         computed: {
            candidatos: function() {
               if(!this.patron) return [];

               // Búsqueda difusa (require fuse.js)
               return new Fuse(
                  this.g.cluster.getLayers(), {
                     keys: [this.pathData + ".id.nom"],
                     minMatchCharLength: 2,
               }).search(this.patron);
            }
         },
         methods: {
            sugerir: function(e) {
               this.patron = "";
               if(e.target.value.length < 3) return;
               this.patron = e.target.value;
            },
            seleccionar: function(e) {
               const codigo = e.currentTarget.value;
               this.$el.querySelector("input").value = "";
               this.patron = "";
               this.g.seleccionado = this.g.Centro.get(codigo);
               this.g.map.setView(this.g.seleccionado.getLatLng(),
                                  this.g.cluster.options.disableClusteringAtZoom);
            }
         }
      });
   }

   function initFiltrador() {

      Vue.component("correccion", {
         props: ["c"],
         template: "#correccion",
         computed: {
            // Identificador para el fieldset de la corrección.
            id: function() { return `${this.c.tipo}:${this.c.nombre}`; },
         },
         methods: {
            prepararOperacion: function(id) {
               // Si las opciones son excluyentes, al marcar una
               // se desmarcan las restantes. No puede usarse "radio",
               // porque no marcar ninguna opción también es posible.
               if(this.c.excluyentes) {
                  const input = document.getElementById(id);
                  if(input.checked) {
                     this.$el.querySelectorAll("input").forEach(i => {
                        if(i !== input && i.checked) i.checked = false;
                     });
                  }
               }

               const tipo = this.c.tipo,
                     nombre = this.c.nombre,
                     opts = this.c.getOpts?this.c.getOpts.call(this, id):this.recogerValores();

               if(opts) Object.assign(opts, this.c.extra);
               this.$parent.aplicarOperacion(tipo, nombre, opts, this.c.auto);
            },
            recogerValores: function() {
               const key = this.c.campo,
                     value = Array.from(this.$el.querySelectorAll("input:checked"))
                                                .map(e => e.value);
               return value.length>0?{[key]: value}:false;
            }
         }
      });

      Vue.component("opcion-corr", {
         props: ["o", "idx"],
         data: function() {
            return {
               checked: false,
            }
         },
         computed: {
            id: function() {
               return `${this.$parent.id}_${this.idx}`;
            },
         },
         template: "#opcion-corr",
      });

      // Al cargar datos, los puestos y las enseñanzas varían
      // por lo que las correcciones adjpue y oferta, también lo hacen.
      this.g.on("dataloaded", e => {
         this.filtrador.puestos = this.g.general.puestos;
         const res = {};
         for(const ens in this.g.general.ens) {
            const value = this.g.general.ens[ens];
            res[ens] = value.grado?`${value.grado} ${value.nombre}`:value.nombre;
         }
         this.filtrador.ens = res;
      });

      return new Vue({
         el: "#correcciones :nth-child(2)",
         data: {
            g: this.g,
            puestos: {},
            ens: {},
            corrFijas: [
               {
                  titulo: "Bilingüismo",
                  desc: "Muestra únicamente centros bilingües en",
                  nombre: "bilingue",  // Nombre de la corrección
                  tipo: "correct",  // Tipo: corrección o filtro.
                  campo: "bil",  // Nombre de la opción de corrección: {bil: ["Inglés"]}
                  extra: {inv: true},  // Opciones de corrección extra 
                  auto: true,  // Aplica correcciones encadenadas.
                  // getOpts: function() {}  // Mecanismo alternativo para obtener las opciones de correcciones.
                  // excluyentes: true  // En plan Los Inmortales: sólo puede marcarse una.
                  opciones: [
                     {
                        label: "Inglés",
                        value: "Inglés"
                     },
                     {
                        label: "Francés",
                        value: "Francés"
                     },
                     {
                        label: "Alemán",
                        value: "Alemán"
                     }
                  ]
               },
               {
                  titulo: "Vacantes telefónicas",
                  desc: "Elimina adjudicaciones no telefónicas",
                  nombre: "vt",
                  tipo: "correct",
                  campo: "da.igual",
                  opciones: [{
                     label: "Eliminar adjudicaciones",
                     value: "cualquiera"
                  }]
               },
               {
                  titulo: "Turno",
                  desc: "Elimina enseñanzas de",
                  nombre: "turno",
                  tipo: "correct",
                  campo: "turno",
                  excluyentes: true,
                  getOpts: function(id) {
                     const key = this.c.campo,
                           input = document.getElementById(id);

                     return input.checked?{[key]: input.value}:false;
                  },
                  opciones: [
                     {
                        label: "Mañana",
                        value: 1
                     },
                     {  
                        label: "Tarde",
                        value: 2
                     }
                  ]
               }
            ]
         },
         computed: {
            correcciones: function() {
               const oferta = {
                  titulo: "Enseñanzas",
                  desc: "Elimina la oferta del centro",
                  nombre: "oferta",
                  tipo: "correct",
                  campo: "ens"
               }
               oferta.opciones = Object.keys(this.ens)
                                        .map(c => new Object({label: this.ens[c], value: c}));

               const puestos = {
                  titulo: "Adjudicaciones",
                  desc: "Elimina adjudicaciones de los puestos",
                  nombre: "adjpue",
                  tipo: "correct",
                  campo: "puesto"
               }
               puestos.opciones = Object.keys(this.puestos)
                                         .map(c => new Object({label: this.puestos[c], value: c}));
               return this.corrFijas.concat([oferta, puestos]);
            }
         },
         methods: {
            aplicarOperacion: function(tipo, nombre, opts, auto) {
               const res = opts?this.g.Centro[tipo](nombre, opts, auto)
                               :this.g.Centro[`un${tipo}`](nombre);
               
               //TODO:: Si es auto, se han desencadenado automáticamente
               // correcciones y, en consecuencia, debería marcarse automáticamente
               // algunas otras correcciones.
               // Opcion B) --> Usar los eventos correct:* y uncorrect:*

               if(res) this.g.Centro.invoke("refresh");
            }
         }
      });
   }

   function initAjustes() {
      const self = this;

      Vue.component("ajuste", {
         props: ["a"],
         template: "#ajuste",
         data: function() {
            return {
               checked: false,
            }
         },
         methods: {
            ajustar: function(e) {
               if(this.a.accion) {
                  this.a.accion.call(this);
                  return;
               }
               self.options[this.a.opt] = this.checked;
               if(this.a.tipo === "visual") return;
               
               const [accion, nombre] = this.a.tipo.split(":"),
                     res = this.checked?self.g.Centro[accion](nombre, this.a.value || {})
                                       :self.g.Centro[`un${accion}`](nombre);

               if(res) self.g.Centro.invoke("refresh");
            }
         }
      });

      return new Vue({
         el: "#ajustes :nth-child(2)",
         data: {
            g: this.g,
            ajustes: [
               {
                  desc: "Ocultar centros sin oferta",
                  opt: "filtrarOferta",
                  tipo: "filter:oferta",
                  value: {min: 1}
                  //accion: function(name, value) {},
               },
               {
                  desc: "Ocultar centros sin adjudicaciones",
                  opt: "filtrarAdj",
                  tipo: "filter:adj",
                  value: {min: 1}
               },
               {
                  desc: "Ocultar datos de centro filtrados",
                  opt: "ocultarBorrado",
                  tipo: "visual"
               },
               {
                  desc: "Incluir vacantes telefónicas",
                  opt: "incluirTlfo",
                  tipo: "correct:vt+"
               },
               {
                  desc: "Corregir con el CGT",
                  opt: "incluirCGT",
                  tipo: "correct:cgt"
               }
            ]
         }
      });
   }

   return Interfaz;
})();


window.onload = function() {
   interfaz = new Interfaz();
   interfaz.initVueJS();
}
