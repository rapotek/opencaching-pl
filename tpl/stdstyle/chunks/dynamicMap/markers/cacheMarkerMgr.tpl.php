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
    markerFactory: function(map, type, id, ocData, section = "_DEFAULT_"){
        return createOCMarkerFeature(
            type, id, ocData, new CacheMarker(map, ocData), section
        );
    },

}
