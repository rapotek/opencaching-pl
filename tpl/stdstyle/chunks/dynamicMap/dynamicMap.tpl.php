<?php

use Utils\Uri\Uri;
use Utils\View\View;
use lib\Objects\ChunkModels\DynamicMap\DynamicMapModel;

/**
 * This chunk displays dynamic map with different kinds of markers.
 * Markers should be passed by $mapModel.
 *
 * OpenLayers chunk should be loaded to header by:
 *  $this->view->addHeaderChunk('openLayers5');
 *
 */
return function (DynamicMapModel $mapModel, $canvasId){

  // load chunk CSS
  View::callChunkInline('loadCssByJs',
    Uri::getLinkWithModificationTime('/tpl/stdstyle/chunks/dynamicMap/dynamicMap.css'));

  View::callChunkInline('handlebarsJs');

?>

<script src="<?=Uri::getLinkWithModificationTime(
    "/tpl/stdstyle/chunks/dynamicMap/dynamicMapCommons.js")?>"></script>

<!-- load markers scripts popup templates -->
<?php
$markerCommonsLoaded = false;
foreach($mapModel->getMarkerTypes() as $markerType) {
    if (!$markerCommonsLoaded) {
        $markerCommonsLoaded = true;
?>
<script src="<?=Uri::getLinkWithModificationTime(
    "/tpl/stdstyle/chunks/dynamicMap/markers/markerCommons.js")?>"></script>
<?php } //if-markerCommonsLoaded
    if (is_file(__DIR__ . '/markers/' . $markerType . '.js')) {
        $markerJs = Uri::getLinkWithModificationTime(
            '/tpl/stdstyle/chunks/dynamicMap/markers/' . $markerType . '.js'
        );
?>
<script type="text/javascript" src="<?=$markerJs?>"></script>
<?php } //if-is_file?>
<script type="text/x-handlebars-template" class="<?=$markerType?>" >
    <?php include(__DIR__.'/markers/'.$markerType.'Popup.tpl.php'); ?>
</script>
<?php } //foreach-scriptsAndPopupTemplates ?>
<!-- end of load markers scripts popup templates -->

<script>
//global object containing all dynamic map properties
var dynamicMapParams_<?=$canvasId?> = {
  prefix: "<?=$canvasId?>",
  targetDiv: "<?=$canvasId?>",
  centerOn: <?=$mapModel->getCoords()->getAsOpenLayersFormat()?>,
  mapStartZoom: <?=$mapModel->getZoom()?>,
  forceMapZoom: <?=$mapModel->isZoomForced()?'true':'false'?>,
  mapLayersConfig: getMapLayersConfig(), // loaded in header by openlayers5 chunk
  selectedLayerKey: "<?=$mapModel->getSelectedLayerName()?>",
  markerData: <?=$mapModel->getMarkersDataJson()?>,
  markerMgr: {
    <?php foreach($mapModel->getMarkerTypes() as $markerType) { ?>
      <?=$markerType?>: <?php include(__DIR__.'/markers/'.$markerType.'Mgr.tpl.php'); ?>,
    <?php } //foreach $markerTypes ?>
  },
  compiledPopupTpls: []
};

$(document).ready(function(){
  // initialize dynamicMap
  dynamicMapEntryPoint(dynamicMapParams_<?=$canvasId?>);
});

</script>

<?php
};
//end of chunk - nothing should be after this line
