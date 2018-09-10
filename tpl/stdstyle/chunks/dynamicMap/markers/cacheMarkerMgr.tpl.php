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
                cacheType: ocData.cacheType,
                cacheStatus: ocData.cacheStatus,
                isFound: ocData.isFound,
                isOwner: ocData.isOwner,
            }
        });

        var mgr = this;
        iconFeature.setStyle(function(feature, resolution) {
            return mgr.getIconStyle(map, feature)
        });
        return iconFeature;
    },

    okapiIconsDir: '/okapi/static/tilemap/', //TODO: move to config or something similar

    getIconStyle: function(map, icon) {
        var featureStyles = [];
        var iconSize;
        var anchor = [ 0, 0];
        var anchorXUnits = 'pixel';
        var anchorYUnits = 'pixel';
        var showDetails = false;
        if (map.getView().getZoom() <= 8) {
            anchor = [ 5, 5 ];
            iconSize = 'tiny';
        } else if (map.getView().getZoom() <= 13) {
            anchor = [ 7, 7 ];
            iconSize = 'medium';
        } else {
            iconSize = 'large_inner';
            anchor = [ 8, 22 ];
            anchorXUnits = 'pixel';
            anchorYUnits = 'pixel';
            var outerIconSuffix = '';
            if (icon.get('ocData').isOwner) {
                outerIconSuffix = '_own';
            } else if (icon.get('ocData').isFound) {
                outerIconSuffix = '_found';
            }
            featureStyles.push(new ol.style.Style({
                image: new ol.style.Icon( {
                    anchor: [ 13, 26 ],
                    anchorXUnits: 'pixel',
                    anchorYUnits: 'pixel',
                    src:
                        this.okapiIconsDir + 'large_outer'
                        + outerIconSuffix + '.png'
                })
            }));
            showDetails = true;
        }
        var iconType = (function(cacheType) {
            switch(cacheType) {
                case 1: return 'unknown';
                case 2: return 'traditional';
                case 3: return 'multi';
                case 4: return 'virtual';
                case 6: return 'event';
                case 7: return 'quiz';
                default: return 'other';
            }
        })(icon.get('ocData').cacheType);
        var iconSrc = this.okapiIconsDir + iconSize + '_' + iconType + '.png';
        featureStyles.push(
            new ol.style.Style({
                image: new ol.style.Icon( {
                    anchor: anchor,
                    anchorXUnits: anchorXUnits,
                    anchorYUnits: anchorYUnits,
                    src: iconSrc
                })
            })
        );
        if (showDetails && icon.get('ocData').isFound) {
            featureStyles.push(new ol.style.Style({
                image: new ol.style.Icon( {
                    anchor: [14, 29],
                    anchorOrigin: 'top-right',
                    anchorXUnits: 'pixel',
                    anchorYUnits: 'pixel',
                    src: this.okapiIconsDir + 'found.png',
                    scale: 1
                })
            }));
        }
        return featureStyles;
    },
}
