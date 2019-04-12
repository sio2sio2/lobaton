function aplicaCorreccion(cor, params) {
    g.Centro.apply(cor, params);
    g.Centro.invoke("refresh");
}

function deshaceCorreccion(cor) {
    g.Centro.unapply(cor);
    g.Centro.invoke("refresh");
}

function sanitizeNombreCorreccion(cor) {
    if (cor.indexOf("[") !== -1) {
        cor = cor.slice(0, -2);
    }
    return cor;
}

$(document).ready(function () {
    $(document).on("change", ".correccion", function(e) {
        //Eliminamos los paréntesis y demás elementos del nombre de la corrección
        cor = sanitizeNombreCorreccion(e.target.name);

        //if($(this).is(':checked')){
        if ($("input[name='" + e.target.name + "']").filter(":checked").length > 0) {
            let params = {
                [$(this).closest("fieldset").attr("name")]: $("input[name='" + e.target.name + "']").filter(":checked").map(function () {
                    return $(this).val();
                }).get()
            };

            aplicaCorreccion(cor, params);
        }
        else {
            deshaceCorreccion(cor);
        }
    });
});
