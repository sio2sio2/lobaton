const Interfaz = (function() {

   // Opciones predeterminadas al arrancar la interfaz.
   const defaults = {
      "filter:oferta": true,    // Filtrar centros sin oferta.
      "filter:adj": false,      // Filtrar centros sin adjudicaciones.
      "correct:vt+": false,     // Incluir vacantes telefónicas.
      "correct:cgt": false,     // Incluir correcciones por CGT.
   }

   // Opciones predeterminadas propias exclusivamente de la interfaz.
   const defaults_v = {
      ocultarBorrado: false,  // Oculta enseñanzas y adj. borradas.
      recordar: false,        // Recuerda entre sesiones el estado del mapa.
      mostrarFiltrados: false // Si true, muestra en gris los centros filtrados.
   }

   function Interfaz(opts) {
      this.options = Object.assign({}, defaults, defaults_v, opts);

      for(const o in defaults_v) {
         const value = this.options[o];
         Object.defineProperties(this.options, {
            [o]: {
               get: () => this.options[`_${o}`],
               set: value => {
                  this.options[`_${o}`] = value;
                  this.g.fire("statuschange", {attr: `visual.${o}`});
               },
               configurable: false,
               enumerable: true
            },
            [`_${o}`]: {
               value: value,
               writable: true,
               configurable: false,
               enumerable: false,
            }
         });
      }

      opts = {
         unclusterZoom: 13,
         autostatus: false,
         search: false,
         ors: {
            key: "5b3ce3597851110001cf62489d03d0e912ed4440a43a93f738e6b18e",
         }
      }

      // Issue #62
      const url = new URL(window.location.href);
      let status = url.searchParams.get("status");  // Issue #57
      if(!status) status = localStorage && localStorage.getItem("status");
      if(status) opts.status = status;
      // Fin issue #62

      // Objeto de manipulación del mapa.
      this.g = mapAdjOfer("../../dist", opts);

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

      // Al dejar de incluir las vacantes telefónicas,
      // deja de tener sentido aplicar la eliminación de adj. no telefónicas.
      this.g.Centro.on("uncorrect:vt+", e => {
         if(this.g.Centro.uncorrect("vt")) this.g.Centro.invoke("refresh");
      });

      // Las correcciones se borran al cargar una especialidad,
      // pero las que se aplican automáticamente por mor de las opciones
      // de la interfaz, deberían aplicarse automáticamente.
      this.g.on("dataloaded", e => {
         for(const opt in this.options) {
            if(this.options[opt] && opt.startsWith("correct:")) {
               const name = opt.split(":")[1];
               this.g.Centro.correct(name, {});
            }
         }
      });

      // TODO: DEBUG: Elimínese esto en producción.
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
    * Devuelve el estado presente del mapa.
    */
   Object.defineProperty(Interfaz.prototype, "status", {
      get: function() {
         const extra = {}
         for(const o in defaults_v) extra[o.substring(0, 3)] = this.options[o];
         return this.g.getStatus(extra);
      },
      configurable: false,
      enumerable: true
   });


   /**
    * Inicializa los atributos que son aplicaciones VueJS.
    */
   Interfaz.prototype.initVueJS = function() {
      Object.defineProperties(this, {
         // Selector de especialidad
         selector: {
            value: initSelector.call(this),
            writable: false,
            configurable: false,
            enumerable: true
         },
         // Buscador de centros
         buscador: {
            value: initBuscador.call(this),
            writable: false,
            configurable: false,
            enumerable: true
         },
         // Ajustes de la interfaz
         ajustes: {
            value: initAjustes.call(this),
            writable: false,
            configurable: false,
            enumerable: true
         },
         // Aplicador de correcciones a los datos
         filtrador: {
            value: initFiltrador.call(this),
            writable: false,
            configurable: false,
            enumerable: true
         },
         // Información sobre el mapa.
         info: {
            value: initInfo.call(this),
            writable: false,
            configurable: false,
            enumerable: true
         }
      });

      initInterfaz.call(this);
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

                  // ¿Para qué vamos a borrar los datos si es la misma especialidad?
                  if(codigo !== this.especialidad) {
                     this.interfaz.g.cluster.clearLayers();
                     this.interfaz.g.agregarCentros(`../../json/${codigo}.json`);
                  }

                  this.cambiarSidebar(codigo);

                  this.interfaz.g.Centro.reset();
                  this.interfaz.g.seleccionado = null;
                  this.interfaz.g.setRuta(null);
                  e.target.value = "";

               }
               else { 
                  e.target.setCustomValidity("Puesto inválido. Escriba parte de su nombre para recibir sugerencias");
               }
            },
            cambiarSidebar(codigo) {
               if(codigo) {
                  const especialidad = this.todas[codigo];
                  // TODO:: ¿Ponemos el nombre de la especialidad en algún sitio?
                  console.log("DEBUG: Nombre:", especialidad);
               }

               // Hay que habilitar todos los botones de la barra lateral.
               if(!this.especialidad) {
                  document.querySelectorAll("#sidebar .leaflet-sidebar-tabs li.disabled")
                     .forEach(e => e.classList.remove("disabled"));
               }

               // Cambiamos al panel de filtros.
               interfaz.sidebar.open("correcciones");
               // Cerramos paneles para mostrar el mapa.
               document.querySelector("#sidebar .leaflet-sidebar-tabs li a")
                       .dispatchEvent(new Event("click"));

               this.especialidad = codigo;
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
         }
      });

      Vue.component("opcion-corr", {
         props: ["o", "idx"],
         template: "#opcion-corr",
         data: function() {
            return {
               checked: false,
               disabled: false
            }
         },
         computed: {
            id: function() {
               return this.$parent.c.nombre === "turno"?`${this.o.tipo}:${this.$parent.c.nombre}`:
                                                        `${this.$parent.id}_${this.idx}`
            },
         },
         methods: {
            prepararOperacion: function(input) {
               const c = this.$parent.c;
               // Si las opciones son excluyentes, al marcar una
               // se desmarcan las restantes. No puede usarse "radio",
               // porque no marcar ninguna opción también es posible.
               if(c.excluyentes) this.excluirResto(input);

               switch(c.nombre) {
                  case "turno":
                     const operaciones = c.excluyentes?this.$parent.$children:[this];
                     for(const a of operaciones) {
                        const opts = a.checked?{[a.o.campo]: a.o.value}: false,
                              nombre = c.nombre,
                              tipo = a.o.tipo;

                        this.$parent.$parent.aplicarOperacion(tipo, nombre, opts, a.o.auto);
                     }
                     break;

                  case "adjref":
                     const form = this.$el,
                           colectivo = form.querySelector("select").value,
                           esc_f = form.querySelector("#escalafon"),
                           ts_f = form.querySelectorAll("fieldset>input"),
                           options = input.checked?{col: colectivo}:false;

                     if(options) {
                        if(!esc_f.disabled) options.esc = Number(esc_f.value);
                        if(!ts_f.disabled) {
                           const ts = Array.from(ts_f).map(i => Number(i.value || "-1"))
                                                      .filter(v => v>=0);
                           if(ts.length === 3) options.ts = ts;
                        }
                     }
                     
                     this.$parent.$parent.aplicarOperacion(c.tipo, "adjref", options, false);
                     break;

                  default:
                     const opts = c.getOpts?c.getOpts.call(this.$parent, input):this.recogerValores();

                     if(opts) Object.assign(opts, c.extra);
                     this.$parent.$parent.aplicarOperacion(c.tipo, c.nombre, opts, c.auto);
               }
            },
            excluirResto: function(input) {
               if(input.checked) {
                  this.$parent.$children.forEach(i => {
                     const e = i.$el.querySelector("input");
                     if(e !== input && i.checked) i.checked = false;
                  });
               }
            },
            recogerValores: function() {
               const key = this.$parent.c.campo,
                     // Se recogen todos los valores marcados, pero no los deshabilitados
                     // puesto que estos se entiende que lso ha marcado una corr. automática
                     value = this.$parent.$children.filter(i => i.checked && !i.disabled)
                                                   .map(e => e.o.value);
               return value.length>0?{[key]: value}:false;
            }
         }
      });

      Vue.component("opcion-adjref", {
         template: "#opcion-adjref",
         data: function() {
            return {
               checked: false,
               disabled: true,
            }
         },
         mounted: function() {
            // Por incapacidad para hacer funcionarlo correctamente con Vue.
            const form = this.$parent.$parent.$el.querySelector("form"),
                  select = form.querySelector("select"),
                  escalafon = form.querySelector("#escalafon"),
                  fieldset = form.querySelector("fieldset");

            form.addEventListener("input", e => {
               if(this.checked) this.checked = false;
               this.disabled = !form.checkValidity();
            });
            select.addEventListener("input", e => {
               const esInterino = e.target.value === "J";
               fieldset.disabled = false;
               escalafon.disabled = esInterino;
               for(const i of form.querySelectorAll("fieldset>input")) {
                  i.required = esInterino;
                  i.value = "";
               }
            });
            escalafon.addEventListener("input", e => {
               const pattern = /^([89][0-9]|20[0-9]{2})[0-9]{4}$/,
                     msg = pattern.test(e.target.value)?"":"Escalafón inválido";
               e.target.setCustomValidity(msg);
            });
         },
         methods: {
         }
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

      this.g.once("dataloaded", e=> {
         const col = this.g.general.colectivos;
         this.filtrador.colectivos = Object.keys(col)
               .sort((a,b) => col[a].o - col[b].o)
               .map(c => new Object({letra: c, nombre: col[c].v}));
      });

      return new Vue({
         el: "#correcciones :nth-child(2)",
         data: {
            g: this.g,
            ajustes: this.ajustes,
            puestos: {},
            colectivos: [],
            ens: {},
            corrFijas: [
               {
                  titulo: "Bilingüismo",
                  desc: "Muestra sólo enseñanzas bilingües en",
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
                  titulo: "Enseñanzas preferibles",
                  desc: "Elimina la oferta menos apetecible",
                  nombre: "deseable",
                  tipo: "correct",
                  campo: "da.igual",
                  auto: true,
                  opciones: [{
                     label: "Elimina enseñanzas",
                     value: "cualquiera"
                  }]
               },
               {
                  titulo: "Turno",
                  desc: "Filtros basados en el turno de la enseñanza",
                  nombre: "turno",
                  excluyentes: true,
                  opciones: [
                     {
                        label: "Elimina enseñanzas de mañana",
                        tipo: "correct",
                        campo: "turno",
                        value: 1
                     },
                     {  
                        label: "Elimina centros con enseñanza de tarde",
                        tipo: "filter",
                        campo: "turno",
                        value: 2
                     }
                  ]
               },
               {
                  titulo: "Plan de compensación",
                  desc: "Elimina centros según plan",
                  nombre: "tipo",
                  tipo: "filter",
                  campo: "tipo",
                  getOpts: function(id) {
                     const key = this.c.campo,
                           value = this.$children.filter(i => i.checked && !i.disabled)
                                                 .reduce((x,a) => x + a.o.value, 0);
                     return value>0?{[key]: value}:false;
                  },
                  opciones: [
                     {
                        label: "Sin plan alguno",
                        value: 1
                     },
                     {
                        label: "Compensatoria",
                        value: 2
                     },
                     {
                        label: "Difícil desempeño",
                        value: 4
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
                  titulo: "Vacantes iniciales",
                  desc: "Elimine adj. que no responden a vacante incial",
                  nombre: "vi",
                  tipo: "correct",
                  campo: "da.igual",
                  opciones: [{
                     label: "Eliminar adjudicaciones",
                     value: "cualquiera",
                  }]
               },
            ]
         },
         computed: {
            correcciones: function() {
               const adjref = [{
                  titulo: "Adjudicatario de referencia",
                  desc: "Elimina adjudicaciones con más prelación",
                  nombre: "adjref",
                  tipo: "correct",
                  opciones: []
               }];

               adjref[0].opciones.push({colectivos: this.colectivos});

               const oferta = {
                  titulo: "Enseñanzas",
                  desc: "Elimina la oferta del centro",
                  nombre: "ofens",
                  tipo: "correct",
                  campo: "ens"
               }
               oferta.opciones = Object.keys(this.ens)
                                        .map(c => new Object({label: this.ens[c], value: c}));

               const puestos = {
                  titulo: "Puestos",
                  desc: "Elimina adjudicaciones de los puestos",
                  nombre: "adjpue",
                  tipo: "correct",
                  campo: "puesto"
               }
               puestos.opciones = Object.keys(this.puestos)
                                         .map(c => new Object({label: this.puestos[c], value: c}));
               return adjref.concat(this.corrFijas, [oferta, puestos]);
            }
         },
         methods: {
            aplicarOperacion: function(tipo, nombre, opts, auto) {
               const res = opts?this.g.Centro[tipo](nombre, opts, auto)
                               :this.g.Centro[`un${tipo}`](nombre);
               
               if(res) this.g.Centro.invoke("refresh");
            }
         }
      });
   }

   function initAjustes() {
      // Que los ajustes referentes a las telefónicas y el CGT
      // estén habilitados, depende de que se disponga de datos.
      this.g.on("dataloaded", e => {
         for(const ajuste of this.ajustes.$children) {
            switch(ajuste.a.tipo) {
               case "correct:vt+":
                  ajuste.disabled = !this.g.general.spider.vt;
                  break;
               case "correct:cgt":
                  ajuste.disabled = !this.g.general.spider.cgt;
                  break;
            }
         }
      });

      Vue.component("ajuste", {
         props: ["a"],
         template: "#ajuste",
         data: function() {
            return {
               checked: this.a.tipo === "visual"?this.$parent.options[this.a.opt]:false,
               disabled: false
            }
         },
         watch: {
            checked: function() {
               // Sólo actualizamos las opciones de interfaz visuales,
               // las relativas a filtros y correcciones deben conservar
               // sus valores iniciales.
               if(this.a.tipo === "visual") this.$parent.options[this.a.opt] = this.checked;
            }
         },
         computed: {
            id: function() {
               return this.a.tipo !== "visual"?this.a.tipo:
                                               `${this.a.tipo}:${this.a.opt}`
            }
         },
         methods: {
            // Qué acción se desencadena al cambiar el ajuste.
            ajustar: function(e) {
               //this.$parent.options[this.a.opt] = this.checked;

               if(this.a.accion) {
                  this.a.accion(this.a.opt, this.checked);
                  return;
               }

               if(this.a.tipo === "visual") return;
               
               const [accion, nombre] = this.a.tipo.split(":"),
                     Centro = this.$parent.g.Centro,
                     res = this.checked?Centro[accion](nombre, this.a.value || {})
                                       :Centro[`un${accion}`](nombre);

               if(res) Centro.invoke("refresh");
            }
         }
      });

      return new Vue({
         el: "#ajustes :nth-child(2)",
         data: {
            g: this.g,
            options: this.options,
            ajustes: [
               {
                  desc: "Filtrar centros sin oferta",
                  opt: "filter:oferta",
                  tipo: "filter:oferta",
                  value: {min: 1}
               },
               {
                  desc: "Filtrar centros sin adjudicaciones",
                  opt: "filter:adj",
                  tipo: "filter:adj",
                  value: {min: 1}
               },
               {
                  desc: "Recordar el estado del mapa",
                  opt: "recordar",
                  tipo: "visual",
                  accion: (name, value) => {
                     if(!value) {
                        if(localStorage) localStorage.clear();
                     }
                     else if(!localStorage) console.warn("El navegador no tiene soporte para almacenar datos localmente");
                  }
               },
               {
                  desc: "Ocultar datos filtrados",
                  opt: "ocultarBorrado",
                  tipo: "visual"
               },
               {
                  desc: "Mostrar (en gris) centros filtrados",
                  opt: "mostrarFiltrados",
                  tipo: "visual",
                  accion: (name, value) => {
                     value = true?L.utils.grayFilter:this.g.cluster;
                     this.g.Centro.setFilterStyle(value);
                  }
               },
               {
                  desc: "Incluir vacantes telefónicas",
                  opt: "correct:vt+",
                  tipo: "correct:vt+"
               },
               {
                  desc: "Corregir con el CGT",
                  opt: "correct:cgt",
                  tipo: "correct:cgt"
               }
            ]
         }
      });

   }

   function initInfo() {

      this.g.on("dataloaded", e => {
         const data = this.g.general;
         this.info.especialidad = data.entidad[0];
         this.info.colocacion = data.curso;
         this.info.ofertasec = data.spider.ofertasec;
         this.info.ofertafp = data.spider.ofertafp;
         this.info.organica = data.spider.organica;
         this.info.cgt = data.spider.cgt?"Disponible":"No disponible";
         this.info.vt = data.spider.vt?"Disponibles":"No disponibles";
         this.info.centros = this.g.Centro.store.length;
         this.info.filtrados = this.g.Centro.store.filter(c => c.filtered).length;
      });

      this.g.Centro.on("filter:* unfilter:* correct:* uncorrect:*", e => {
         this.info.filtrados = this.g.Centro.store.filter(c => c.filtered).length;
      });

      this.g.on("isochroneset routeset", e => {
         if(e.newval) this.info.contador = this.g.contador
      });

      this.g.on("isochroneset", e => {
         this.info.isocronas = !!e.newval;
      });

      this.g.on("originset", e => {
         if(e.newval) {
            e.newval.on("geocode", e => {
               this.info.contador = this.g.contador;
               this.info.postal = e.target.postal;
            });
         }
         this.info.origen = e.newval;
      });

      this.g.Centro.on("unfilter:lejos", e => {
         this.info.isocronas = !!this.g.isocronas;
      });

      this.g.Centro.on("filter:lejos", e=> {
         this.info.isocronas = this.g.isocronas[e.opts.idx].feature.properties.value / 60;
      });

      this.g.on("routeset", e => this.info.ruta = e.newval);

      this.g.on("markerselect", e => this.info.seleccionado = e.newval);

      this.g.on("statuschange", e => {
         this.info.link = `${window.location.href}?status=${this.status}`;
      });

      return new Vue({
         el: "#info :nth-child(2)",
         data: {
            link: window.location.href,
            especialidad: "-",
            colocacion: "-",
            ofertasec: "-",
            ofertafp: "-",
            organica: "-",
            vt: "No disponibles",
            cgt: "No disponible",
            //
            centros: 0,
            filtrados: 0,
            contador: 0,
            //
            origen: null,
            postal: null,
            isocronas: false,
            ruta: null,
            seleccionado: null
         },
         computed: {
            visibles: function() {
               return this.centros - this.filtrados;
            },
            estado_origen: function() {
               if(this.origen) {
                  if(this.postal) {
                     return this.postal;
                  }
                  else {
                     const coords = this.origen.getLatLng();
                     return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                  }
               }
               else return "Botón derecho sobre mapa";
            },
            estado_isocronas: function() {
               if(!this.origen) return "Fije primero origen";
               else {
                  if(this.isocronas) {
                     if(this.isocronas === true) {
                        return "Botón der. sobre área filtra por lejanía";
                     }
                     else return `Filtrando a más de ${this.isocronas} min`;
                  }
                  else return "Botón derecho sobre origen";
               }
            },
            estado_destino: function() {
               if(this.ruta) return this.ruta.destino.getData().id.nom;
               else return this.origen?"Botón derecho sobre un centro":"Fije primero origen";
            },
            tiempo: function() {
               if(!this.ruta) return "-";
               else {
                  const data = this.ruta.layer.feature.properties.summary;
                  const min = Math.floor(data.duration / 60);
                  return `${min} min`;
               }
            },
            distancia: function() {
               if(!this.ruta) return "-";
               else {
                  const data = this.ruta.layer.feature.properties.summary;
                  const km = Math.floor(data.distance / 1000);
                  return `${km} Km`;
               }
            },
            estado_seleccionado: function() {
               if(this.seleccionado) return this.seleccionado.getData().id.nom;
               else return "Click sobre un centro";
            }
         },
         methods: {
            irLugar: (e, sitio) => {
               e.preventDefault();
               if(sitio.constructor === this.g.Centro) {
                  const zoom = Math.max(this.g.map.getZoom(),
                                        this.g.cluster.options.disableClusteringAtZoom);
                  this.g.map.setView(sitio.getLatLng(), zoom);
               }
               else this.g.map.panTo(sitio.getLatLng());
               return false;
            },
            copyToClipboard: function(e) {
               const input = e.target.previousElementSibling;
               /*
               navigator.clipboard.writeText(input.value).then(() => {
                  alert("Copiado el enlace en el portapapeles");
               });
               */
               input.select();
               document.execCommand("copy");
               alert("Copiado el enlace en el portapapeles");
            }
         }
      });
   }

   // Vuelva sobre el aspecto de la interfaz el estado inicial del mapa
   function initInterfaz() {
      let status = this.g.options.status;

      function reflejarOpciones(opts) {
         for(const ajuste of this.ajustes.$children) {
            const input = ajuste.$el.querySelector("input");
            if(opts[input.name]) {
               input.checked = true;
               input.dispatchEvent(new Event("change"));
            }
         }
      }

      // Nos aseguramos de que al (des)aplicarse
      // un filtro o corrección se refleja en la interfaz.
      this.g.Centro.on("filter:* unfilter:*", reflejarFiltro.bind(this));
      this.g.Centro.on("correct:* uncorrect:*", reflejarCorreccion.bind(this));

      let opciones = {};
      if(status) {
         this.g.setStatus();  // Aplicamos el estado del mapa.
         // Lo único que queda por reflejar son las opciones
         // exclusivas de la interfaz virtual.
         for(const o in defaults_v) {
            const name = o.substring(0, 3);
            if(status.visual.hasOwnProperty(name)) {
               opciones[o] = status.visual[name];
            }
         }
         if(status.esp) this.selector.cambiarSidebar(status.esp);
      }
      else opciones = this.options;

      reflejarOpciones.call(this, opciones);

      // Si no se incluyen vacantes telefónicas, entonces
      // debe deshabilitarse la corrección por adjudicaciones no telefónicas.
      if(!this.options["correct:vt+"]) {
         for(const f of this.filtrador.$children) {
            if(f.c.tipo === "correct" && f.c.nombre === "vt") {
               f.$children[0].disabled = true;
               break;
            }
         }
      }

      // Una vez aplicados todos los cambios iniciales, definimos
      // el disparador para que vaya apuntando en local los cambios de estado.
      this.g.on("statuschange", e => {
         if(localStorage && this.options.recordar) localStorage.setItem("status", this.status);
      });

      // Guardamos el estado final de la inicialización.
      this.g.fire("statuschange");
   }


   function reflejarFiltro(e) {
      const on = e.type.startsWith("filter:");
      switch(e.name) {
         case  "tipo":
            for(const f of this.filtrador.$children) {
               if(f.c.nombre === e.name && f.c.tipo === "filter") {
                  for(const i of f.$children) {
                     i.checked = !!(i.o.value & e.opts.tipo);
                  }
                  break;
               }
            }
            break;

         default:
            const input = document.getElementById(`filter:${e.name}`);
            if(input) input.checked = on;
      }
   }
      

   function reflejarCorreccion(e) {
      const on = e.type.startsWith("correct:");
      let f, corr = this.g.Centro.getCorrectStatus();

      switch(e.name) {
         case "bilingue":
         case "adjpue":
         case "ofens":
            corr = this.g.Centro.getCorrectStatus();

            for(f of this.filtrador.$children) {
               if(f.c.tipo === "correct" && f.c.nombre === e.name) break
            }

            // Para cada ítem comprobamos si el valor que representa
            // ese ítem está aplicado o no.
            const params = corr.manual[e.name] && corr.manual[e.name].params;
            for(const i of f.$children) {
               let checked = false, disabled = false;
               checked = params && params[f.c.campo].indexOf(i.o.value) !== -1;
               if(corr.auto[e.name]) {
                  for(const n in corr.auto[e.name]) {
                     const params = corr.auto[e.name][n];
                     if(params && params[f.c.campo].indexOf(i.o.value) !== -1) {
                        checked = true
                        disabled = true;
                        break;
                     }
                  }
               }
               i.disabled = disabled;
               i.checked = checked;
            }

            break;

         case "vt":
         case "vi":
         case "deseable":
            for(f of this.filtrador.$children) {
               if(f.c.tipo === "correct" && f.c.nombre === e.name) {
                  f.$children[0].checked = on;
                  break
               }
            }
            break;

         case "vt+":
            for(f of this.ajustes.$children) {
               if(f.a.tipo === `correct:${e.name}`) {
                  f.checked = on;
                  break;
               }
            }

            // Si no se incluyen vacantes telefónicas,
            // se deshabilita eliminar adj. no telefónicas.
            for(f of this.filtrador.$children) {
               if(f.c.tipo === "correct" && f.c.nombre === "vt") {
                  f.$children[0].disabled = !on;
                  break
               }
            }
            break;

         case "turno":
            for(f of this.filtrador.$children) {
               if(f.c.nombre === e.name) {
                  for(i of f.$children) {
                     if(i.o.tipo === "correct") {
                        if(e.opts.turno == 1) i.checked = on;
                        break;
                     }
                  }
                  break;
               }
            }
            break;

         case "adjref":
            for(f of this.filtrador.$children) {
               if(f.c.nombre !== e.name) continue;

               const form = f.$el,
                     select = form.querySelector("select"),
                     escalafon = form.querySelector("#escalafon"),
                     fieldset = form.querySelector("fieldset"),
                     ts = fieldset.querySelectorAll("input"),
                     checkbox = form.querySelector("input[type='checkbox']");

               if(!on) {
                  checkbox.checked = false;
                  break;
               }

               if(e.opts.col) {
                  select.value = e.opts.col;
                  fieldset.disabled = false;
                  escalafon.disabled = e.opts.col === "J";
               }

               if(e.opts.ts) {
                  ts.forEach((el, idx) => el.value = e.opts.ts[idx]);
               }

               if(e.opts.esc) escalafon.value = e.opts.esc;
               
               checkbox.checked = true;
               checkbox.disabled = false;
               break;
            }
            break;

         case "extinta":
            break;

         default:
            console.error(`Aún no se ha definido como reflejar ${e.name}`);
      }
   }

   return Interfaz;
})();


window.onload = function() {
   interfaz = new Interfaz();
   interfaz.initVueJS();
}
