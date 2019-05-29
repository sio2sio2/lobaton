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
         pathLoc: "../../json/localidades.json",
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
      document.querySelector("#sidebar i.fa-arrows-alt").parentNode
              .addEventListener("click", e => {
         this.g.map.toggleFullscreen();
      });

      // Ocultar los paneles implica también, quitar la barra lateral.
      document.querySelectorAll("#sidebar .leaflet-sidebar-pane .leaflet-sidebar-close")
              .forEach(e => e.addEventListener("click", e => {
         document.querySelector("#sidebar i.fa-arrow-up").parentNode
                 .dispatchEvent(new Event("click"));
      }));

      // Al seleccionar un centro, muestra automáticamente su información y
      // habilita el botón correspndiente de la barra.
      this.g.on("markerselect", e => {
         const boton = this.sidebar._container
                  .querySelector("#sidebar .leaflet-sidebar-tabs a[href='#centro']").parentNode;

         if(!e.newval) {  // Deshabilitamos botón.
            const activa = this.sidebar._container
                  .querySelector("#sidebar .leaflet-sidebar-tabs li.active");
            // Si el panel activo, es el de información de centro, lo cerramos.
            if(activa && activa.querySelector("a[href='#centro']")) {
               this.sidebar.close();
            }
            boton.classList.add("disabled");
            return;
         }

         boton.classList.remove("disabled");
         if(!this.sidebar._map) { // La barra no está desplegada.
            document.getElementById("view-sidebar").dispatchEvent(new Event("click"));
         }
         this.sidebar.open("centro");
      });

      // Al cargar datos por primera vez deben habilitarse todos los
      // botones deshabilitados de la barra, excepto el de información de centro.
      this.g.once("dataloaded", e => {
         this.sidebar._container.querySelectorAll("#sidebar .leaflet-sidebar-tabs li.disabled")
             .forEach(e => !e.querySelector("a[href='#centro']") && e.classList.remove("disabled"));
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
         },
         // Información sobre el centro
         centro: {
            value: initCentro.call(this),
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
            todas: {}
         },
         created: function() {
            L.utils.load({
               url: "../../json/especialidades.json",
               callback: xhr => this.todas = JSON.parse(xhr.responseText),
               failback: xhr => {
                  console.log(xhr);
                  throw new Error("No es posible cargar las especialidades disponibles");
               }
            });
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
         this.info.especialidad = this.selector.todas[data.entidad[0]];
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

   function initCentro() {

      // Confiere a la corrección un nombre más compresible para el usuario.
      Vue.filter("identificarCorreccion", correccion => {
         let nombre = correccion;
         for(const f of this.filtrador.correcciones) {
            if(f.nombre === correccion) {
               nombre = f.titulo;
               break
            }
         }
         return nombre;
      });

      Vue.component("oferta", {
         props: ["of"],
         template: "#oferta",
         computed: {
            visible: function() {
               // Visible si no está filtrada o, si estándolo, no se quiere ocultar.
               return !this.$parent.ocultarBorrado || this.of.filters.length === 0
            },
            nombre: function() {
               const ens = this.$parent.g.general.ens[this.of.ens];
               return ens.grado?`${ens.grado} ${ens.nombre}`:ens.nombre;
            }
         },
         filters: {
            capitalize: function (value) {
               if (!value) return '';
               value = value.toString();
               return value.charAt(0).toUpperCase() + value.slice(1)
            },
            // La modalidad viene abreviada, por lo que hay que obtener la palabra/s real/es
            traduceModalidad: function (nombreAbreviado) {
               switch (nombreAbreviado) {
                  case "pres":
                     nombre = "Presencial";
                     break;
                  case "semi":
                     nombre = "Semipresencial";
                     break;
                  default:
                     nombre = "A distancia";
               }
               return nombre;
            }
         }
      });

      Vue.component("adjudicacion", {
         props: ["adj"],
         template: "#adjudicacion",
         methods: {
            // Devuelve el nombre de un puesto dado su código
            nombrePuesto: function(codigo) {
               return this.$parent.g.general.puestos[codigo];
            },
            // Devuelve el nombre de un colectivo dada su letra
            nombreColectivo: function(letra) {
               return this.$parent.g.general.colectivos[letra].v;
            }
         }
      });

      //Al seleccionar un centro, cambian los datos a presentar.
      this.g.on("markerselect", e => {
         if(e.newval) {
            this.centro.datosCentro = e.newval.getData();
            this.centro.adj = this.centro.datosCentro.adj;
            this.centro.oferta = this.centro.datosCentro.oferta;
         }
         else {
            this.centro.datosCentro = this.centro.adj = this.centro.oferta = null;
         }
      });

      // Al cargar una nueva especialidad, cambian los datos
      this.g.on("dataloaded", e => {
         this.centro.g = this.g;
      });

      this.g.on("statuschange", e => {
         // Si el usuario cambia su preferencia de ver los datos filtrados
         if(e.attr === "visual.ocultarBorrado") {
            this.centro.ocultarBorrado = this.options.ocultarBorrado;
         }
         // Si se aplica alguna corrección
         else if(this.g.seleccionado && e.attr.startsWith("cor.")) {
            // Objec.create para que el objeto sea otro y VueJS detecte el cambio.
            this.centro.oferta = Object.create(this.centro.datosCentro.oferta);
            this.centro.adj = Object.create(this.centro.datosCentro.adj);
         }
      });

      return new Vue({
         el: "#centro :nth-child(2)",
         data: {
            datosCentro: null,
            // Apartamos oferta y adj, porque son lo único que puede requerir
            // actualización después de haber seleccionado un centro.
            oferta: null,
            adj: null,
            g: null,
            ocultarBorrado: this.options.ocultarBorrado
         },
         computed: {
            tienePlazas: function () {
               return Object.keys(this.datosCentro.pla).length > 0
            },
            dificultad: function() {
               const dificultad = this.datosCentro.mod.dif;
               return dificultad === "dificil"?"difícil desempeño":"compensatoria";
            }
         },
         filters: {
            normalizaCodigo: function(codigo) {
               return codigo.toString().padStart(8, "0");
            },
         },
         methods: {
            /* 
            * DecodificaCentro devuelve el nombre de un centro dado un código. 
            * Utilizado principalmente para obtener el nombre del centro en enseñanzas trasladadas
            */
            decodificaCentro: codigo => this.g.Centro.get(codigo).getData().id.nom,
            hayNoVisibles: function(attr) {
               return this.ocultarBorrado && this[attr].length > this[attr].total;
            },
            // Devuelve el númerod de miembros de la plantilla orgánica.
            organica: function(org, norg) {
               return norg === undefined || norg === org?org:`${org} (${norg})`;
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
   // Si no hay soporte para datalist, elimina los input.
   function datalistSupport() {
      if(document.createElement("datalist") && window.HTMLDataListElement) return;

      Array.from(document.querySelectorAll(".datalist-supported")).forEach(e => {
         e.parentNode.removeChild(e);
      });
   }

   interfaz = new Interfaz();
   interfaz.initVueJS();
   datalistSupport();
}
