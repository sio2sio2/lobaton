¿Qué es Lobatón?
*****************
*Lobatón* es un mapa interactivo que presenta la oferta educativa y las
adjudicaciones de destino de todos los centros públicos de Andalucía. En
principio, está restringido a los institutos de enseñanza secundaria y a los
cuerpos **590** y **591**, aunque tal restricción no es técnica, sino debida a
la limitación que impone no tener disponibles en la aplicación los datos del
resto de centros y cuerpos.

Se caracteriza por:

+ Representar cada centro mediante un icono, cuyos detalles visuales dependen
  de cuáles sean los datos de oferta y adjudicaciones.
+ Permitir la aplicación de filtros y correcciones a los datos para eliminar
  aquellas adjudicaciones, enseñanzas y centros que resulten irrelevantes.
+ Reflejar sobre el aspecto de los iconos la aplicación de tales filtros y
  correcciones.

La aplicación corre enteramente en el navegador cliente.

Uso
***

Arranque
========
Nada más acceder a la aplicación, esta presenta un mapa vacío y nos insta a
escoger la especialidad objeto de la consulta:

.. image:: files/inicio.png

.. note:: Si el mapa :ref:`no carga datos previos <datos-previos>`, el navegador
   nos pedirá permiso para conocer nuestra posición. El dato no es enviado a
   ningún lugar externo, sino que se toma simplemente para centrar el mapa en la
   ubicación del usuario. Si rechazamos la petición o no somos rápidos en
   responder, el mapa se centrará en un lugar más o menos céntrico de Andalucía
   y con un *zoom* que permite ver toda la Comunidad en el monitor de un
   ordenador de sobremesa.

Podemos escoger una especialidad tecleando algunas letras que compongan su
nombre:

.. image:: files/especialidad.png

La selección de una de ellas cargará los datos, los presentará en el mapa y
recogerá la barra lateral:

.. image:: files/cargados.png

En el mapa aparecerán dos tipos de iconos:

- Los iconos que representan centros individuales como el icono que se deja
  entrever en la esquina superior derecha de la captura.
- Los iconos que representan agrupaciones de centros y que dejan adivinar
  cuántos a través del número superpuesto que presentan.

.. warning:: En el mapa no tienen por qué aparecer todos los centros públicos,
   sino sólo aquellos que tienen enseñanzas relevantes para la especialidad
   seleccionada. Por ese motivo, si se escoge la especialidad de *Matemáticas*,
   aperecerán todos los centros de enseñanza secundaria. En cambio, si se escoge
   la especilidad de *Informática* no aparecerán los centros que sólo dispongan de
   |ESO|, ya que en la base de datos de la que se obtiene la información, esta
   especialidad no está relacioanda con la |ESO|, puesto que lo habitual es que
   no exista puesto en centros de estas características\ [#]_.

.. note:: En el caso de dispositivos con un ancho de pantalla muy pequeño en
   posición vertical, como los teléfonos móviles, el panel lateral ocupa todo el
   espacio y no podrá verse el mapa hasta que no se repliegue éste.

Selección de centro
===================
La navegación por el mapa es trivial y semejante a la que se puede practicar en
otras herramientas de este estilo\ [#]_. Por su parte, las agrupaciones de
centros irán deshaciéndose al acercar el *zoom* o pulsar sobre los propios
iconos.

Si se quiere conocer la información en detalle de un centro basta con pulsar
sobre él: el icono aparecerá rodeado con un círculo rojo y se desplegará
automáticamente el panel lateral de información de centro:

.. image:: files/seleccionado.png

Si nos fijamos en los iconos de la barra, veremos que aparecerán habilitados
todos. Los deshabiltados al principio eran aquellos con nula utilidad mientras
no hubiera datos cargados. No obstante, el icono que permite mostrar la
información de centro, sólo está habilitado si hay un centro seleccionado; si
se deselecciona pinchando otra vez sobre el propio centro seleccionado, el
panel se cerrará y el icono volverá a deshabilitarse.

La información de centro presenta los datos del centro, sus plantillas, las
enseñanzas relevantes para la especialidad seleccionada y las adjudicaciones a
los puestos relacionados con la especialidad:

.. image:: files/seleccionado2.png

.. _panel-informacion:

Estado el mapa
==============
El estado del mapa puede consultarse pinchando sobre el icono de información y
presenta información sustanciosa sobre el propio mapa:

+ Una primera sección que refiere cuáles son los datos cargados y nos permite
  conocer si éstos están convenientemente actualizados.

+ Una segunda sección de estadísticas con mero carácter informativo.

+ Una tercera sección que muestra cuáles son las entidades geográficas que hemos
  definido sobre el mapa y que no da pistas de cuál es la siguiente acción que
  debemos llevar a cabo para crearlas. A ellas dedicaremos el siguiente
  epígrafe.

.. image:: files/info1.png

.. image:: files/info2.png

El último botón permite copiar en el portapapeles una |URL| que reproduce
automáticamente el estado actual del mapa, lo que nos permite compartir con
otros usuarios un estado que nos parezca relevante.

Entidades geográficas
=====================
Son las siguientes:

Centro seleccionado
   Ya descrito anteriormente.

Origen
   La aplicación permite definir un punto de origen que es útil cuando se
   quieren hacer valoraciones sobre la idoneidad de un centro basándose en la
   lejanía respecto a un punto de referencia. Para definirlo basta con pulsar
   con el botón derecho sobre el mapa (o pulsación larga en un dispositivo
   táctil) y elegir la opción en el menú contextual:

   .. image:: files/origen.png

   Las dos siguientes entidades sólo tienen sentido si previamente se ha fijado
   un origen de referencia.

Ruta
   Una :dfn:`ruta` establece el camino entre el origen y un centro de destino
   arbitrario que puede o no coincidir con el seleccionado. Para crearla basta
   tener definido un origen y, una vez hecho, pinchar con el botón derecho sobre
   el centro de destino:

   .. image:: files/ruta.png

   La utilidad de la ruta, más allá de mostrar el itinerario, es la de declarar
   la distancia entre origen y destino y la duración del viaje. Creada la ruta,
   esa misma información puede obtenerse del :ref:`panel de información
   <panel-informacion>`.

.. _isocronas:

Isocronas
   Las :dfn:`isocronas`, esto es, líneas de igual tiempo, permiten calcular
   respecto al origen, todos los puntos geográficos que se encuentran a una
   misma distancia en espacio o tiempo. La aplicación generá automáticamente
   las isocronas de 10 a 60 minutos\ [#]_ en intervalos de 10 minutos y colorea
   de distinto color las áreas entre medias. Para crearlas no hay más que pulsar
   con el botón derecho sobre el origen y seleccionar la opción oportuna en
   el menú contextual:

   .. image:: files/isocronas.png

   En la captura, la naranja es el área encerrada por la isocrona de 10
   minutos, por lo que todos sus puntos se encontrarán a menos de ese tiempo del
   origen que seleccionamos. Sobre los centros que quedan dentro o fuera de esas
   áreas no podemos pronunciarnos taxativamente si se encuentran agrupados, ya que
   al desagregarlos alguno puede viajar a un área continua. Por ejemplo, es
   probable que alguno de los cuatro centros que aparentemente se encuentran a
   menos de 20 minutos en la parte inferior caiga en el área siguiente, como
   efectivamente ocurre:

   .. image:: files/isocronas2.png

   Si embargo, si aplicamos botón derecho sobre cualquiera de las áreas, la
   aplicación nos brindará la posibilidad de elimianr los centros que queden
   fuera de la isocrona correspondiente. Si hacemos tal acción sobre el área
   violácea que representa el área limitada por la isocrona de 20 minutos:

   .. image:: files/isocronas3.png

   desaparecerán los centros más allá de esta isocrona y el áreas violácea
   invadirá toda la superficie interna hasta el punto de origen. Los centros
   supervivientes a la acción son los únicos centros que podemos asegurar que
   se encuentran a menos de 20 minutos. Este filtro es el único que se aplica
   interactuando directamente con el mapa y no a través del :ref:`panel
   correspondiente <panel-filtros>` o el :ref:`panel de ajustes <panel-ajustes>`.
   
.. _panel-ajustes:

Ajustes
=======
El panel de ajustes permite modificar parte del comportamiento de la aplicación:

.. image:: files/ajustes.png

El significado de cada opción es el siguiente:

Filtrar centros sin oferta
   Filtra los centros que se han quedado sin oferta como consecuencia de las
   correcciones a los datos que se hayan establecido (véase el próximo epígrafe).

Filtrar centros sin adjudicación
   Filtra los centros que se han quedado sin adjudicaciones como consecuencia
   de las correcciones a los datos que se hayan establecido (véase el próximo
   epígrafe).

.. _datos-previos:

Recordar el estado del mapa
   Recuerda el estado del mapa entre sesiones. Esto significa que si cerramos
   el navegador y volvernos a abrirlo, la aplicación cargará automáticamente
   los datos, los filtros, las correcciones y presentará el mapa centrado en el
   mismo lugar y con el mismo nivel de *zoom*. Consecuentemente, la aplicación
   quedará inicialmente en el mismo estado con que se cerró.

Ocultar datos filtrados
   Deshabilitada esta opción, las :ref:`enseñanzas y adjudicaciones filtradas
   <panel-filtros>` aparecen en la información detallada del centro tachadas y
   con indicación de cuál es la razón por la que se tacharon.
  
   .. image:: files/tachadas.png 
  
   Al habilitarla, tales enseñanzas y adjudicaciones, simplemente, desaparecen:

   .. image:: files/ocultas.png

Mostrar (en gris) centros filtrados
   Al quedar filtrado un centro, este desaparece del mapa. Si se habilita esta
   opción, en vez de desaparecer aparecerá dibujado en gris. Se comportan
   del mismo modo que los centros sin filtrar, salvo por el hecho de que el
   número de la marca que representa centros agrupados no los tiene en cuenta.

Incluir vacantes telefónicas
   La base de la información contenida en el mapa es la resolución del procedimiento
   de colocación de efectivos que se celebra en verano. Al habilitar esta opción,
   se añaden a la información de los centros las vacantes que siempre aparecen en
   septiembre, y que no salieron a concurso en julio.

Corregir con el |CGT|
   Añade correcciones a las adjudicaciones del procedimiento que generan los resultados
   del |CGT|. Algunas de estas correcciones (como postular si un funcionario irá
   a su destino definitivo o no) son meras especulaciones.

.. _panel-filtros:

Filtrado
========
La carga de datos (si no se procede de la recuperación de un estado anterior)
presenta todos los centros posibles, y todas las enseñanzas y puestos
relevantes para la especialidad seleccionada. Lo habitual, sin embargo, es
afinar la búsqueda añadiendo correcciones a los datos para deshacerse de
aquellos que no interesan:

.. image:: files/filtros1.png

Por defecto, todas las correcciones están deshabilitadas, por lo que aparecerán todos los
datos disponibles sobre el mapa.

Adjudicatario de referencia
   Esta corrección permite establecer un adjudicatario de referencia (colectivo por el que
   participa, escalafón, si procede, y tiempo de servicio) y elimina de los centros todas
   las adjudicaciones que gozaran de mayor prelación en el procedimiento.

   .. note:: Recuerde que si quiere hacer desaparecer los centros que queden sin
      adjudicaciones, deberá ir a :ref:`ajustes <panel-ajustes>` y habilitar la opción
      correspondiente.

   .. warning:: Por un defecto en el diseño de la base de datos, de los
      funcionarios no interinos, no se almacena el tiempo de servicio, de modo
      que si no es interino, rellene sólo el escalafón.

Bilingüismo
   Permite prescindir de las enseñanzas que no son bilingües en los idiomas seleccionados.
   Esta corrección, además, elimina todos las adjudicaciones a puestos que no sean del
   perfil bilingüe señalado. Fundamentalmente es útil para interinos que
   pertenecen a bolsas bilingües.

Enseñanzas preferibles
   Cada especialidad tiene asociadas unas enseñanzas preferibles que son las de
   Bachillerato para el caso de especialidades predominantemente de secundaria, y las
   de formación profesional para especialidades predominantemente de formación profesional.
   Por tanto, habilitar esta corrección para el caso de un profesor de *Inglés*, significa
   eliminar las enseñanzas de ESO del mapa y para un profesor de *Informática* eliminar
   todas las enseñanzas que no sean los cuatro ciclos formativos de su familia profesional.
   Si se acompaña esta correccion con filtrar los centros sin oferta (a través del panel
   de :ref:`ajustes <panel-ajustes>`), haremos desaparecer los centros que carecen de estas enseñanzas.

   .. note:: Para eliminar enseñanzas individualmente, existe otra corrección que se tratará
      más adelante.

.. image:: files/filtros2.png

Turno
   Permite escoger centro antendiendo al turno de sus enseñanzas:

   * El primer ítem permite eliminar enseñanzas de mañana que si se acompaña con
     el filtro que elimina centros sin oferta (en :ref:`ajustes
     <panel-ajustes>`), mostrará en pantalla exclusivamente los centros con
     enseñanzas de tarde relevantes para nuestra especialidad.

   * El segundo ítem filtra los centros que tengan alguna enseñanza de tarde,
     por lo que es útil si no nos interesa correr el riesgo de trabajar en este
     turno.

   Ambos ítem son incompatibles por lo que si se habilita uno se deshabilitara
   él otro

Plan de compensación
   Este filtro permite eliminar centros dependiendo de si es un centro con
   compensatoria, un centro de difícil desempeño o un centro normal.

Vacantes telefónicas
   Elimina las adjudicaciones que se produjeron en el procedimiento de verano.

Vacantes iniciales
   Elimina las adjudicaciones que no responden a vacantes iniciales del
   procedimiento de colocación de efectivos.

.. image:: files/filtros3.png

Puestos
   La corrección permite eliminar individualmente las adjudicaciones a los
   puestos que se marquen. Si algún puesto específico no interesa, es
   conveniente marcarlo aquí.

Enseñanzas
   Permite eliminar individualmente enseñanzas que no interesen.

.. _faq:

|FAQ|
=====

#. **Llevo cuarenta minutos pinchando centro a centro en la ciudad de Sevilla y
   sus alrededores para saber si podría pillar plaza por allí, ¿estoy haciendo
   el tonto?**

   Mayúsculamente. Para saberlo de un vistazo basta con lo siguiente:

   a. En :ref:`ajustes <panel-ajustes>` debe:

      + Marcarse "*Filtrar centros sin adjudicaciones*"
      + Cerciorarse de que no está marcado "*Mostrar (en gris) centros filtrados*".
      + Cerciosarse de que no está marcado "*Incluir vacantes telefónicas*"
        (porque esas vacantes no se adjudicaron en verano).

   b. En :ref:`filtrado <panel-filtros>`:

      + Utilice el filtro "*Adjudicatario de referencia*" poniendo sus propios
        datos: el colectivo por el que participa y su tiempo de servicio
        (interino) o escalafón (resto de funcionarios).

   Listo. Deberían pervivir en el mapa sólo los centros en que en el pasado
   procedimiento pudieron adjudicarle puesto.

   .. note:: También puede probar a poner su tiempo de servicio con un año más.
      A fin de cuentas, esas son las condiciones con las que partipará este
      año.

#. **Mi prioridad es dormir en casa, ¿cómo elimino centros que estén muy lejos?**

   Usando :ref:`las isocronas <isocronas>`.

#. **Me interesan centros que estén alejados hasta una hora y media de mi casa,
   pero la aplicación sólo genera hasta la isocrona de 60 minutos. ¿Qué hago?**

   `Esperar sentado <https://openrouteservice.org/restrictions/>`_.

#. **Soy interino bilingüe y no me interesan ni las enseñanzas no bilingües ni
   los puestos de la bolsa normal, ¿tengo forma de eliminar toda la información
   inútil?**

   Sí hay forma. Habiendo aprendido *latín* que, en este caso, habría consistido
   en:

   + Cerciorarse de que en :ref:`ajustes <panel-ajustes>` está marcada la opción
     "*Filtrar centros sin oferta*".
   + Elegir en :ref:`filtrado <panel-filtros>` la enseñanza bilingüe correspondiente.

#. **¿Por qué está deshabilitado el filtro de vacantes telefónicas?**

   Muy probablemente porque en :ref:`ajustes <panel-ajustes>` no se ha marcado
   "*Incluir vacantes telefónicas*".

#. **¿Cómo hago para conocer las vacantes de septiembre que no se ofertaron en
   el procedimiento de verano?**

   a. En :ref:`ajustes <panel-ajustes>` cerciórese de que están marcadas las
      opciones "*Filtrar centros sin adjudicaciones*" y "*Incluir vacantes
      telefónicas*".
      
   #. En :ref:`filtrado <panel-filtros>`, aplique la corrección  "*Vacantes
      telefónicas*".

#. **¿Por qué en** :ref:`ajustes <panel-ajustes>` **no puedo incluir las vacantes
   telefónicas o las correcciones del concurso?**

   Porque los datos no incorporan información sobre las unas, sobre el otro o
   sobre ambos. Échele un vistazo al :ref:`panel de información
   <panel-informacion>`.

#. **El programa tiene un bug, ha dejado de funcionar correctamete, pero por
   más que abro y cierro el navegador, no consigo limpiar el mapa y empezar de nuevo.
   ¿Qué hago?**

   En :ref:`ajustes <panel-ajustes>` desmarque la opción "*Recordar el estado
   del mapa*"; y, por supuesto, procure reproducir el fallo y advertir de él
   a los desarrolladores para que lo subsanen.

#. **¿Puedo usar ilimitadamente el mapa?**

   Evidentemente, sí, pero no debería. No hay limitación en la visita al mapa,
   ni en la consulta de la información de los centros o en la aplicación o
   remoción de filtros y correcciones a los datos; pero las isocronas, el
   cálculo de rutas y la obtención de la dirección postal del origen usan la
   |API| de OpenRouteService_ que sí tiene `restricciones al uso
   <https://openrouteservice.org/plans/>`_. En la sección de estadísticas del
   :ref:`panel de información <panel-informacion>` hay un contador con las
   consultas que hemos hecho durante la sesión a la |API| de OpenRouteService_.
   Moderarse en el uso de estas consultas es conveniente para que no se alcance
   la limitación diaria.

#. **¿Qué fiabilidad tiene esto?**

   Ninguna: "Rentabilidades pasadas no garantizan rentabilidades futuras". Esto
   es lo mismo, pero sin apropiarse en el ínterin de dinero alguno.

.. raw:: html

   <blockquote lang="la" style="text-align: right">Pro bono malum.</blockquote>


.. rubric:: Notas al pie

.. [#] La principal diferencia con otras herramientas como `Google Maps
   <https://www.google.com>`_ es que un doble click derecho sobre el mapa no
   aleja la vista, sino que apra ello hay que hacer doble click mientras se
   pulsa la tecla :kbd:`Shift`.
.. [#] El limite de **60** minutos está impuesto por la |API| de
   OpenRouteService_.
.. [#] Excepcionalmente, el centro sin oferta apropiada puede aparecer si
   hubo una adjudicación propia de la especialidad.

.. |FAQ| replace:: :abbr:`FAQ (Frequently Asked Questions)`
.. |URL| replace:: :abbr:`URL (Uniform Resource Locator)`
.. |API| replace:: :abbr:`API (Application Programming Interface)`
.. |ESO| replace:: :abbr:`ESO (Enseñanza Secundaria Obligatoria)`
.. |CGT| replace:: :abbr:`CGT (Concurso General de Traslados)`
.. _OpenRouteService: https://openrouteservice.org
