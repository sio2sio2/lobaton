var C;  // Para acceder a Centro desde consola.

// Peticiones AJAX
function load(params) {
   const xhr = new XMLHttpRequest();
   let qs = '', method = "GET"; 

   if(params.params) {
      qs = Object.keys(params.params).map(k => k + "=" + encodeURIComponent(params.params[k])).join('&');
      method = "POST";
   }

   method = (params.method || method).toUpperCase();

   if(method === "GET" && params.params) {
      params.url = params.url + "?" + qs;
      qs = "";
   }

   xhr.open(method, params.url, !!params.callback);
   if(params.callback || params.failback) {
      xhr.onreadystatechange = function() {
          if(xhr.readyState === 4) {
            if (xhr.status === 200) {
               if(params.callback) {
                  if(params.context) params.callback.call(params.context, xhr);
                  else params.callback(xhr);
               }
            }
            else if(params.failback) {
               if(params.context) params.failback.call(params.context, xhr);
               else params.failback(xhr);
            }
          }
      };
      if(params.url.endsWith(".html")) { // Permite para las respuestas HTML, obtener un responseXML
         xhr.responseType = "document";
      }
   }

   if(method === 'POST') xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
   xhr.send(qs);

   // Sólo es útil cuando la petición es síncrona.
   return xhr;
}


async function getStyle(estilo, num, callback) {

   let updater, html, converter, iconstyle;

   switch(num) {
      case "dos":
      case "muchos":
         // Para los centros generados con este script basta con eliminar
         // algunos atributos como las coordenadas del punto.
         converter = function (o) {
            return Object.keys(o).reduce((res, e) => { res[e] = o[e]; return res}, {});
         }
         break;
      default:
         // Conversor para los GeoJSON que se usarán en el programa final
         // IMPORTANTE: Debemos asegurarnos de que las propiedades que admiten
         // correcciones se tratan como arrays normales o como arrays corregibles,
         // ya que en el momento de la invocación de esta función la propiedad
         // puede aún ser un array normal.
         // Lo ideal es que la API del array corregible fuera la misma que la del normal
         // pero eso no parece que se pueda hacer con Javascript.
         converter = function(o) {
            const res = {};

            if(o.hasOwnProperty("adj")) res["numvac"] = (o.adj.total !== undefined)?o.adj.total:o.adj.length;

            if(o.hasOwnProperty("mod")) {
               res["tipo"] = o.mod.hasOwnProperty("dif")?o.mod.dif:"normal";
               res["ofervar"] = o.mod.hasOwnProperty("cam")?o.mod.cam:0;
            }

            if(o.hasOwnProperty("peticion")) res["peticion"] = o.peticion;

            if(o.hasOwnProperty("oferta")) {
               res["numofer"] = 0;
               if(o.oferta.walk !== undefined) {
                  for(const ens of o.oferta.walk()) {
                     if(!ens.value) continue
                     res["numofer"] += ens.value.mar?3:1;
                  }
               }
               else {
                  for(const ens of o.oferta) res["numofer"] += ens.mar?3:1;
               }
               res["numofer"] = Math.round(res["numofer"]/3);

               let idiomas;

               // Array con los idiomas de cada enseñanza
               if(o.oferta.walk) idiomas = Array.from(o.oferta.walk()).map(ens => ens.value && ens.value.idi)
               else idiomas = o.oferta.map(ens => ens.idi)

               // Eliminamos valores nulos y valores repetidos.
               idiomas = idiomas.filter((idi, i, arr) => idi && arr.indexOf(idi) === i)

               switch(idiomas.length) {
                  case 0:
                     res["bil"] = null;
                     break;
                  case 1:
                     res["bil"] = idiomas[0];
                     break;
                  default:
                     res["bil"] = "multi";
               }

            }

            return res;
         }
   }

   updater = function(o) {
      const content = this.querySelector(".content");
      if(o.tipo) content.className = "content " + o.tipo;
      if(o.numvac !== undefined) content.firstElementChild.textContent = o.numvac;
      return this;
   }

   const options = {
      updater: updater,
      converter: converter,
      iconstyle: iconstyle,
   }

   switch(estilo) {
      case "css1":
         options.iconstyle = "dist/images/icon1.css";
         options.iconSize = null;
         options.iconAnchor = [12.5, 34];
         break;
      case "css2":
         options.iconstyle = "dist/images/icon2.css";
         options.iconSize = [25, 34];
         options.iconAnchor = [12.5, 34];
         break;
      case "solicitud":
         options.iconSize = [40, 40];
         options.iconAnchor = [19.556, 35.69];
         options.updater = function(o) {
            var text = this.querySelector("text");
            if(o.peticion !== undefined) {
               text.textContent = o.peticion;
               var size = (o.peticion.toString().length > 2)?28:32;
               text.setAttribute("font-size", size);
            }
            return this;
         }
         break;
      case "boliche":
         options.iconSize = [40, 40];
         options.iconAnchor = [19.556, 35.69];
         options.fast = true;
         options.updater = (function() {

            var paletaOferta = new Array(5).fill(null);
            var paletaPlazas = new Array(7).fill(null);

            /**
             * Obtiene una gama de colores RGB distinguibles entre sí.
             * En principio, si se desea obtener 4 colores, habrá que pasar:
             * como ratio 1/4, 2/4, 3/4 y 4/4.
             */
            function HSLtoRGB(h, s, l) {
               s = s || .65;
               l = l || .45;

               var r, g, b;

               if(s == 0){
                  r = g = b = l;
               }
               else {
                  function hue2rgb(p, q, t) {
                     if(t < 0) t += 1;
                     if(t > 1) t -= 1;
                     if(t < 1/6) return p + (q - p) * 6 * t;
                     if(t < 1/2) return q;
                     if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                     return p;
                  }

                  var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                  var p = 2 * l - q;
                  r = hue2rgb(p, q, h + 1/3);
                  g = hue2rgb(p, q, h);
                  b = hue2rgb(p, q, h - 1/3);
               }

               return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
            }


            /**
             * Devuelve blanco o negro dependiendo de cuál contraste mejor con el
             * color RGB suministrado como argumento
             */
            function blancoNegro(rgb) {
               var y = 2.2;

               return (0.2126*Math.pow(rgb[0]/255, y) + 0.7152*Math.pow(rgb[1]/255, y) + 0.0722*Math.pow(rgb[2]/255, y) > Math.pow(0.5, y))?"#000":"#fff";
            }

            /**
             * Convierte un array de tres enteros (RGB) en notación hexadecimal.
             */
            function rgb2hex(rgb) {
               return "#" + rgb.map(dec => ("0" + dec.toString(16)).slice(-2)).join("");
            }

            paletaOferta[0] = "black";
            for(let i=1; i < paletaOferta.length; i++) {
               paletaOferta[i] = rgb2hex(HSLtoRGB(i/(paletaOferta.length-1)));
            }

            var tintaPlazas = new Array(paletaPlazas).fill(null);
            paletaPlazas[0] = tintaPlazas[0] = "black";
            for(let i=1; i < paletaPlazas.length; i++) {
               let color = HSLtoRGB(i/(paletaPlazas.length-1));
               paletaPlazas[i] = rgb2hex(color);
               tintaPlazas[i] = blancoNegro(color);
            }

            function updater(o) {
               const defs = this.querySelector("defs");
               const content = this.querySelector(".content");

               var e = this.querySelector(".ofervac");
               if(o.numofer !== undefined) {
                  let x = e.querySelector("circle");
                  x.setAttribute("fill", paletaOferta[Math.min(paletaOferta.length-1, o.numofer)]);
               }

               if(o.numvac !== undefined) {
                  let i = Math.min(paletaPlazas.length-1, o.numvac);
                  e = e.querySelector("path");
                  e.setAttribute("fill", paletaPlazas[i]);
                  e = e.nextElementSibling;
                  e.textContent = o.numvac;
                  e.setAttribute("fill", tintaPlazas[i]);
               }

               if(o.ofervar !== undefined) {
                  e = this.querySelector(".ofervar");
                  if(!o.ofervar) e.setAttribute("display", "none");
                  else {
                     e.removeAttribute("display");
                     e = e.firstElementChild.nextElementSibling;
                     if(o.ofervar > 0) e.removeAttribute("display");
                     else e.setAttribute("display", "none");
                  }
               }

               if(o.bil !== undefined) {
                  e = content.querySelector(".bil");
                  if(e) defs.appendChild(e);
                  if(o.bil !== null) content.appendChild(defs.querySelector(".bil." + o.bil));
               }

               if(o.tipo !== undefined) {
                  e = content.querySelector(".tipo");
                  if(o.tipo === null) if(e) defs.appendChild(e);
                  else {
                     if(!e) content.appendChild(defs.querySelector(".tipo"));
                     if(o.tipo === "dificil") e.setAttribute("fill", "#c13");
                     else e.setAttribute("fill", "#13b"); 
                  }
               }
            }

            return updater;
         })();
         break;
      default: 
         // ¿No hay assert?
         throw new Error(estilo + ": Estilo desconocido");
   }
   
   function getHtml() {
      return new Promise(function(resolve, reject) {
         switch(estilo) {
            case "css1":
            case "css2":
               resolve(document.querySelector("template").content);
               break;
            case "solicitud":
               load({
                  url: "dist/images/solicitud.svg", 
                  callback: function(xhr) { resolve(xhr.responseXML) }
               });
               break;
            case "boliche":
               load({
                  url: "dist/images/centro.svg", 
                  callback: function(xhr) { resolve(xhr.responseXML) }
               });
         }
      });
   }

   options.html = await getHtml();
   callback(options);
}

// Generador de centros
function genCentros(vers) {
   function* unPar() {
      const centros = [
         {
            lat: 37.275475,
            lng: -5.952594,
            peticion: 5,
            tipo: "compensatoria",
            bil: "inglés",
            ofervar: 1,
            numofer: 3,
            numvac: 4
         },
         {
            lat: 37.58434,
            lng: -4.638891,
            peticion: 55,
            tipo: "dificil",
            bil: "multi",
            ofervar: -1,
            numofer: 1,
            numvac: 2
         }
      ];

      for(let i=0; i<centros.length; i++) {
         const lat = centros[i].lat,
               lng = centros[i].lng;
         delete centros[i].lat;
         delete centros[i].lng;

         yield {
            type: "Feature",
            geometry: {
               type: "Point",
               coordinates: [lng, lat]
            },
            properties: {
               name: "Icono " + i,
               data: centros[i]
            }
         };
      }
   }

   function* muchos() {
      const NUM = 1500; // 1500 marcas.

      const esqii = [36.623794, -7.234497];
      const esqsd = [38.159936, -2.362061];

      function random(a, b) { return a + Math.random()*(b-a); }

      for(let i=0; i<NUM; i++) {
         yield {
            type: "Feature",
            geometry: {
               type: "Point",
               coordinates: [random(-7.234497, -2.362061), random(38.159936, 36.623794)]
            },
            properties: {
               name: "Icono " + i,
               data: {
                  peticion: Math.floor(random(1, 300)),
                  tipo: ["dificil", "normal", "compensatoria"][Math.floor(Math.random()*3)],
                  bil: ["inglés", "francés", "alemán", "multi"][Math.floor(Math.random()*4)],
                  ofervar: Math.floor(Math.random()*3) - 1,
                  numofer: Math.floor(Math.random()*6),
                  numvac: Math.floor(Math.random()*11)
               }
            }
         }
      }
   }

   return { "dos": unPar, "muchos": muchos }[vers]();
}


function getCentros(json, callback) {
   load({
      url: json,
      callback: function(xhr) {
         const centros = JSON.parse(xhr.responseText);
         callback(centros);
      }
   });
}


function cambiarIcono(estilo, num, cluster) {
   getStyle(estilo, num, function(opts) {
      const link = document.getElementById("iconstyle");
      if(opts.iconstyle) {
         link.setAttribute("rel", "stylesheet");
         link.setAttribute("href", opts.iconstyle);
      }
      else link.setAttribute("rel", "alternate stylesheet");
      
      delete opts.iconstyle;

      const options = Object.assign(opts, {className: "icon"});

      const Icon = L.DivIcon.extend({ options: options });

      if(cluster.getLayers().length) {
         cluster.eachLayer(m => m.setIcon(new Icon()));
      }
      else {
         // Los datos de los centros, que se encontrarán en
         // feature.properties.data, admiten correcciones.
         const Centro = L.Marker.extend({
            options: {mutable: "feature.properties.data"}
         });

         C = Centro;

         cargaCorrecciones(Centro);

         const layer = L.geoJSON(null, {
            pointToLayer: (f, p) => new Centro(p, {
               icon: new Icon(),
               title: f.properties.name
            }),
            onEachFeature: function(f, l) {
               l.on("click", function(e) {
                  const icon = e.target.options.icon;
                  console.log("DEBUG - marca", e.target);
                  console.log("DEBUG - ident", e.target.feature.properties.name);
                  console.log("DEBUG - data", e.target.getData());
                  console.log("DEBUG - converter", icon.options.converter(e.target.getData()));
               });
            }
         });

         function agregaCentro(c) {
            layer.addData(c);
            cluster.addLayer(layer);
            layer.clearLayers();
         }

         function agregaCentrosDelTiron(c) {
            agregaCentro(c) // También vale para agregar muchos centros.
            // Aplicación de las correcciones.
            Centro.invoke("apply", "bilingue", {bil: ["Inglés"]});
            Centro.invoke("apply", "vt+", {});
            Centro.invoke("apply", "adjpue", {puesto: ["11590107", "00590059"], inv: true});
         }

         switch(num) {
            case "dos":
            case "muchos":
               for(const c of genCentros(num)) agregaCentro(c);
               break;
            default:
               getCentros(num, agregaCentrosDelTiron);
         }
      }
   });
}


// Crea algunas correcciones
function cargaCorrecciones(Centro) {
   // Elimina enseñanzas que no son bilingües
   Centro.register("bilingue", {
      attr: "oferta",
      // opts= { bil: ["Inglés", "Francés"] } => Filtra enseñanzas que no sean bilingues de francés o inglés.
      func: function(value, oferta, opts) {
         if(!opts.bil || opts.bil.length === 0) return false;
         return opts.bil.indexOf(value.idi) === -1
      }
   });

   // Añade las vacantes telefónicas a las adjudicaciones.
   Centro.register("vt+", {
      attr: "adj",
      add: true,
      func: function(value, adj, opts) {
         const data = this.getData(),
               res = [];
         for(const puesto in data.pla) {
            for(let i=0; i<data.pla[puesto].vt; i++) res.push({
               col: "J",
               esc: [0, 0, 0],
               pue: puesto,
               pet: null,
               // TODO:: ¿Qué narices es esto?
               per: false,
               ubi: false
            });
         }
         return res;
      }
   });

   // Elimina las adjudicaciones que no sean de los puestos suministrados.
   Centro.register("adjpue", {
      attr: "adj",
      // opts= {puesto: ["00590059", "11590107"], inv: true}
      func: function(value, adj, opts) {
         return !!(opts.inv ^ (opts.puesto.indexOf(value.pue) === -1));
      }
   });
}


function init() {
   var map = L.map('map').setView([37.07, -6.27], 9);
   map.addControl(new L.Control.Fullscreen({position: "topright"}));
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
     maxZoom: 18
   }).addTo(map);

   cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      // Al llegar a nivel 14 de zoom se ven todas las marcas.
      disableClusteringAtZoom: 14,
      spiderfyOnMaxZoom: false
   }).addTo(map);

   const cantidad = document.querySelector("select[name='marca']").value;
   const estilo = document.querySelector("select[name='estilo']").value;
   cambiarIcono(estilo, cantidad, cluster);

   document.querySelector("select[name='estilo']").addEventListener("change", function(e) {
      const cantidad = document.querySelector("select[name='marca']").value;
      cambiarIcono(this.value, cantidad, cluster);
   });

   document.querySelector("select[name='marca']").addEventListener("change", function(e) {
      cluster.clearLayers();
      const estilo = document.querySelector("select[name='estilo']").value;
      cambiarIcono(estilo, this.value, cluster);
   });
}

window.onload = init
