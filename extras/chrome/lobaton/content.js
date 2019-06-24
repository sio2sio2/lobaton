(function() {
   "use strict";

   // Establece dónde colocar el botón.
   function buscarHueco() {
      return document.querySelector("a[onclick^=fSeleccionCentros]");
   }

   // Obtiene los cajetines en los que insertar los códigos
   function buscarCajetines() {
      return document.querySelectorAll(".tdpeticioncodigo input[type='text']");
   }


   // Crea el importador de códigos.
   function crearCargador() {
      const label = document.createElement("Label");
      label.textContent = "Importar códigos";

      label.style.cursor = "pointer";
      label.style.color = "#fff";
      label.style.backgroundColor = "#007bff";
      label.style.borderColor = "#007bff";
      label.style.padding = ".375rem .75rem";
      label.style.fontWeight = "400";
      label.style.borderRadius = ".25rem";

      const input = document.createElement("input");
      label.appendChild(input);
      input.type = "file";
      input.setAttribute("accept", ".csv");
      input.style.display = "none";
      input.addEventListener("change", e => {
         const files = e.target.files;
         if(files.length === 0) return;

         const fileReader = new FileReader();
         fileReader.onloadend = function(e) {
            const codigos = parseCSV(this.result);
            if(confirm("Se insertarán los códigos BORRANDO todo los anteriores, aunque NO SE GUARDARÁ el resultado, por lo que podrá revertir la importación si sale de la página sin GUARDAR los códigos. Si desea fijar los códigos de la importación, REVISE LAS PETICIONES detenidamente antes y sólo despues GUARDE los cambios. ¿Está seguro de que quiere continuar?")) {
               insertarCodigos(codigos);
            }
         }
         fileReader.readAsText(files[0]);
      });

      return label;
   }


   // Procesa el CSV de entrada (obtiene los códigos).
   function parseCSV(text) {
      text = text.split('\n');
      text.shift(); // La primera línea son los nombres de las columnas.
      // A las loclaidades hay que quitarle la L; y la C de los centros, permanece.
      return text.map(l => l.substring(0, 9));
   }


   // Inserta los códigos en la página.
   function insertarCodigos(codigos) {
      const inputs = buscarCajetines();

      if(codigos.length > inputs.length) {
         console.warn("Hay más códigos que cajetines para añadirlos");
      }

      for(let i=0; i<inputs.length; i++) {
         const input = inputs[i];
         input.value = codigos[i] || "";

         // Nombre del centro o localidad correspondientes.
         if(codigos[i]) deco(`c_vac${i+1}`, `d_vac${i+1}`, i+1);
         else document.getElementById(`d_vac${i+1}`).innerHTML = "";
      }
   }


   function crearExportador() {
      const a = document.createElement("a");
      a.download = "solicitudes.csv";

      a.style.display ="inline-block";
      a.style.color = "#fff";
      a.style.backgroundColor = "#007bff";
      a.style.borderColor = "#007bff";
      a.style.padding = ".375rem .75rem";
      a.style.fontWeight = "400";
      a.style.borderRadius = ".25rem";
      a.style.marginLeft = "20px";

      a.innerHTML = "Exportar códigos";

      a.addEventListener("click", e=> {
         const file = new Blob([leerCodigos()], {type: "text/csv"});
         a.href = URL.createObjectURL(file);
      });

      return a;
   }


   function leerCodigos() {
      const lines = ["cod;peticion;tipo;name"];
      const inputs = buscarCajetines();

      function normalizeNombre(tipo, nombre) {
         if(tipo ==="L") nombre = nombre.substring(nombre.indexOf(":")+1);
         else {
            const p1 = nombre.lastIndexOf("(");
            if(p1 !== -1) nombre = nombre.substring(0, p1);
         }
         return nombre.trim();
      }


      for(let i=0; i<inputs.length; i++) {
         const input = inputs[i];
         let   codigo = input.value;

         if(!codigo) break;  // Se acabaron los códigos
         
         let tipo = codigo.slice(-1) === "C"?"C":"L";

         if(tipo === "L") codigo += "L";

         let nombre = document.getElementById(`d_vac${i+1}`);
         nombre = normalizeNombre(tipo, nombre.firstElementChild.textContent);

         lines.push([codigo, i+1, tipo, nombre].join(";"));
      }

      return lines.join("\n");
   }

   const el = buscarHueco();
   if(!el) console.log("La página no presenta hueco para insertar el botón");
   else  {
      el.parentNode.insertBefore(crearCargador(), el);
      el.parentNode.insertBefore(crearExportador(), el);
   }

})();
