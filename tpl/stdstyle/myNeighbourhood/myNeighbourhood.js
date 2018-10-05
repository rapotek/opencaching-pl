$(".nbh-sort-list").sortable({
    handle : ".nbh-block-header",
    opacity : 0.7,
    placeholder : "nbh-block-placeholder",
    update : function(event, ui) {
        let postData = $(this).sortable("serialize");

        if (typeof(dynamicMapParams_nbhmap) !== "undefined") {
            // get current order of sections
            var orders = {};
            var n = 0;
            $(this).sortable("toArray").forEach(function(v) {
                orders[v.replace('item_', '')] = n++;
            });
            // reorder map sections to move the highest section features to front
            dynamicMapParams_nbhmap.map.reorderSections(orders);
        }

        $.ajax({
            url : changeOrderUri,
            type : "post",
            data : {
                order : postData
            }
        });
    }
});

$(".nbh-hide-toggle").on("click", function() {
    let icon = $(this);
    icon.closest(".nbh-block").find(".nbh-block-content").toggleClass(
        'nbh-nodisplay');
    let hidden = icon.closest(".nbh-block").find(".nbh-block-content")
        .hasClass("nbh-nodisplay");
    let itemId = icon.closest(".nbh-block").attr('id');
    let section = icon.closest(".nbh-block").attr('section');
    $.ajax({
        url : changeDisplayAjaxUri,
        type : "post",
        data : {
            hide : hidden,
            item : itemId
        }
    })
    if (this.id == "nbh-map-hide") {
        dynamicMapParams_nbhmap.map.updateSize();
    } else if (
        typeof(dynamicMapParams_nbhmap) !== "undefined"
    ) {
        dynamicMapParams_nbhmap.map.toggleSectionVisibility(section);
    }
});

$(".nbh-size-toggle").on("click", function() {
	let icon = $(this);
	icon.closest(".nbh-block").toggleClass("nbh-half nbh-full");
	let sizeClass = icon.closest(".nbh-block").hasClass("nbh-full");
	let itemId = icon.closest(".nbh-block").attr('id');
	$.ajax({
		url : changeSizeAjaxUri,
		type : "post",
		data : {
			size : sizeClass,
			item : itemId
		}
	});
	if (this.id == "nbh-map-resize") {
		dynamicMapParams_nbhmap.map.updateSize();
	}
});
