$(document).ready(function () {
    $('#sidebarCollapse').on('click', toogleSidebar);
    $('.close').on('click', toogleSidebar);
});

function toogleSidebar() {
    $('#sidebar').toggleClass('active');
    $('#sidebarCollapse').toggleClass('invisible');
}

//Evitar propagación del zoom sobre la barra
var div = L.DomUtil.get('sidebar');
L.DomEvent.disableClickPropagation(div);
L.DomEvent.on(div, 'mousewheel', L.DomEvent.stopPropagation);