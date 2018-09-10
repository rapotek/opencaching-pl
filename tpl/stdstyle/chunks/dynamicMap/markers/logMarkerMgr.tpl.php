<?php
/**
 * This is JS object containing functions used to handle markers
 * - markerFactory - creates marker based on data row
 * - infoWindowFactory - creates inforWindow based on row data
 * - data - data rows of this type
 *
 * All functions are used from within dynamic map chunk.
 */

?>
{
    markerFactory: function( map, type, id, ocData ){
        var iconFeature = new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.fromLonLat([parseFloat(ocData.lon), parseFloat(ocData.lat)])),
            ocData: {
                markerType: type,
                markerId: id,
                logIcon: ocData.log_icon
            }
        });

        var mgr = this;
        iconFeature.setStyle(function(feature, resolution) {
            return mgr.getIconStyle(map, feature);
        });
        return iconFeature;
    },

    getIconStyle: function(map, icon) {
        var featureStyles = [];
        var scale;
        if (map.getView().getZoom() <= 8) {
            scale = 0.6;
        } else if (map.getView().getZoom() <= 13) {
            scale = 0.7;
        } else {
            scale = 1;
        }
        featureStyles.push(new ol.style.Style({
            image: new ol.style.Icon( {
                anchor: [0.5, 0.5],
                anchorXUnits: 'fraction',
                anchorYUnits: 'fraction',
                src: icon.get('ocData').logIcon,
                imgSize: [ 16 ,16 ],
                scale: scale,
            })
        }));
        return featureStyles;
    },
}
