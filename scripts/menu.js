$(document).ready(function () {
    $('#sidebarCollapse').on('click', toogleSidebar);
    $('.close').on('click', toogleSidebar);
});

function toogleSidebar() {
    $('#sidebar').toggleClass('active');
    $('#sidebarCollapse').toggleClass('invisible');
}

//Evitar propagación del zoom sobre la barra
var sidebar = L.DomUtil.get('sidebar');
L.DomEvent.disableClickPropagation(sidebar);
L.DomEvent.on(sidebar, 'mousewheel', L.DomEvent.stopPropagation);