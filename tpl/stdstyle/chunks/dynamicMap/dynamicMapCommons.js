
/**
 * This function is a DynamicMap-chunk entrypoint
 *
 * @param params - JS object with properites of dynamicMap-chunk
 */
function dynamicMapEntryPoint( params ) {

  var prefix = params.prefix;
  var mapDiv = $('#'+params.targetDiv);

  mapDiv.addClass("dynamicMap_cursor");

  params.map = new ol.Map({
    target: params.targetDiv,
    view: new ol.View({
      center: ol.proj.fromLonLat(
          [params.centerOn.lon, params.centerOn.lat]
          ),
      zoom: params.mapStartZoom,
    }),
    controls: ol.control.defaults({
      attributionOptions:
      { // attribution can't be display in custom control :( -
        // there is no simple way to get attribution from layer
        className: 'ol-attribution dynamicMap_attribution',
        collapsible: false,
      },
      zoom: false,
      rotate: false,
    }).extend([
      // note: scaleLine has two css OL classes: .ol-scale-line .ol-scale-line-inner
      new ol.control.ScaleLine({ minWidth: 100 })]
    ),
  });

  if(params.startExtent){
    // fit map to given extent
    var ex = params.startExtent;
    var sw = ol.proj.fromLonLat([ex.sw.lon, ex.sw.lat]);
    var ne = ol.proj.fromLonLat([ex.ne.lon, ex.ne.lat]);

    params.map.getView().fit([sw[0], sw[1], ne[0], ne[1]], { nearest:true });
  } else if (params.initRadius && parseInt(params.initRadius) > 0) {
      params.map.getView().fit(
          new ol.geom.Circle(
              ol.proj.fromLonLat([params.centerOn.lon, params.centerOn.lat]),
              parseInt(params.initRadius)
          ),
          { nearest:true }
      );
  }
  // init layer switcher
  layerSwitcherInit(params);

  // init zoom controls
  mapZoomControlsInit(params);

  // init map compass (north-up reset button)
  compassControlInit(params);

  // init localization control
  gpsLocatorInit(params);

  // init mouse position coords
  cordsUnderCursorInit(params);

  // init infoMessage control
  infoMessageInit(params);

  // initialize markers on map
  loadMarkers(params);
}

function layerSwitcherInit( params ) {
  var switcherDiv = $("<div class='ol-control dynamicMap_layerSwitcher'></div>");

  // prepare dropdown object
  var switcherDropdown = $('<select></select>');

  switcherDiv.append(switcherDropdown);

  // add layers from config to map
  $.each( params.mapLayersConfig, function(key, layer) {

    OcLayerServices.setOcLayerName(layer, key);
    layer.set('wrapX', true)
    layer.set('zIndex', 1)

    if (key == params.selectedLayerKey) {
      switcherDropdown.append('<option value='+key+' selected>'+key+'</option>');
      layer.setVisible(true);
    } else {
      switcherDropdown.append('<option value='+key+'>'+key+'</option>');
      layer.setVisible(false);
    }
    params.map.addLayer(layer);
  })

  // add switcher to map
  params.map.addControl(new ol.control.Control(
      {
        element: switcherDiv[0],
      }
  ));

  // wrap dropdow in div
  switcherDropdown.wrap('<div class="ol-control dynamicMap_layerSwitcher"></div>')

  // init switcher change callback
  switcherDropdown.change(function(evt) {

    var selectedLayerName = switcherDropdown.val();

    params.map.getLayers().forEach(function(layer) {
        // first skip OC-internal layers (prefix oc_)
        if ( ! OcLayerServices.isOcInternalLayer(layer) ) {

          // this is external layer (like OSM)
          if ( OcLayerServices.getOcLayerName(layer) == selectedLayerName ) {
            layer.setVisible(true);
          } else {
            layer.setVisible(false);
          }
        } else { // this is OC-generated layer
          if ( layer.getVisible() != true) {
            layer.setVisible(true);
          }
        }
    })

    // run callback if present
    if ( typeof params.layerSwitchCallbacks !== 'undefined' ) {
      $.each(params.layerSwitchCallbacks, function(key, callback){
        callback(selectedLayerName);
      });
    }

  });
}

function gpsLocatorInit(params) {

  if (!("geolocation" in navigator)) {
    console.log('Geolocation not supported by browser.')
    return;
  }

  gpsDiv = $("<div class='ol-control dynamicMap_gpsLocator'></div>");
  gpsImg = $('<img id="dynamicMap_gpsPositionImg" src="/images/icons/gps.svg" alt="gps">');

  gpsDiv.append(gpsImg);

  params.map.addControl(new ol.control.Control(
      {
        element: gpsDiv[0],
      }
  ))

  var geolocationObj = new GeolocationOnMap(params.map, '.dynamicMap_gpsLocator');
  gpsImg.click(function() {
    geolocationObj.getCurrentPosition();
  });

}

function mapZoomControlsInit(params) {

  var zoomDiv = $('<div class="ol-control dynamicMap_mapZoom"></div>');
  var zoomIn = $('<img src="/images/icons/plus.svg" alt="+">');
  var zoomOut = $('<img src="/images/icons/minus.svg" alt="-">');

  zoomDiv.append(zoomIn);
  zoomDiv.append(zoomOut);

  params.map.addControl(new ol.control.Control(
      {
        element: zoomDiv[0],
      }
  ))

  zoomIn.click(function() {
    var view = params.map.getView()
    var zoom = view.getZoom()
    view.setZoom(zoom + 1)
  })

  zoomOut.click(function() {
    var view = params.map.getView()
    var zoom = view.getZoom()
    view.setZoom(zoom - 1)
  })

}

function compassControlInit(params) {

  var compassDiv = $('<div class="ol-control dynamicMap_compassDiv"></div>');
  var compass = $('<img src="/images/icons/arrow.svg" alt="+">');
  //var compass = $('<span class="dynamicMap_compass">⇧</span>');
  compassDiv.append(compass);

  params.map.addControl(new ol.control.Control(
      {
        element: compassDiv[0],
      }
  ));

  compassDiv.click(function() {
    params.map.getView().setRotation(0);
  });

  params.map.on('moveend', function (evt){
    var roatation = evt.map.getView().getRotation()
    compass.css('transform', 'rotate('+roatation+'rad)');
  });

}

/* this is util used fo coords formatting */
var CoordinatesUtil = {

    FORMAT: Object.freeze({
      DECIMAL: 1,     /* decimal degrees: N 40.446321° W 79.982321° */
      DEG_MIN: 2,     /* degrees decimal minutes: N 40° 26.767′ W 79° 58.933′ */
      DEG_MIN_SEC: 3, /* degrees minutes seconds: N 40° 26′ 46″ W 79° 58′ 56″ */
    }),

    cmp: function(coordsA, coordsB) {
      return (
          Array.isArray(coordsA) &&
          Array.isArray(coordsB) &&
          coordsA[0] == coordsB[0] &&
          coordsA[1] == coordsB[1]);
    },

    toWGS84: function (map, coords, outFormat) {

      if (outFormat == undefined) {
        // set default output format
        outFormat = this.FORMAT.DEG_MIN;
      }

      // convert coords from map coords to WGS84
      mapCoordsCode = map.getView().getProjection().getCode();
      wgs84Coords = ol.proj.transform(coords,mapCoordsCode,'EPSG:4326');
      lon = wgs84Coords[0];
      lat = wgs84Coords[1];

      lonHemisfere = (lon < 0)?"W":"E";
      latHemisfere = (lat < 0)?"S":"N";

      lonParts = this.getParts(lon);
      latParts = this.getParts(lat);

      switch(outFormat) {
      case this.FORMAT.DEG_MIN:
        return latHemisfere + " " + Math.floor(latParts.deg) + "° " +
                  latParts.min.toFixed(3) + "' " +
               lonHemisfere + " " + Math.floor(lonParts.deg) + "° " +
                  lonParts.min.toFixed(3) + "'";

      case this.FORMAT.DECIMAL:
        return latHemisfere + " " + lonParts.deg.toFixed(5) + "° " +
               lonHemisfere + " " + lonParts.deg.toFixed(5) + "°";

      case this.FORMAT.DEG_MIN_SEC:
        return latHemisfere + " " + Math.floor(latParts.deg) + "° " +
                  Math.floor(latParts.min) + "' " +
                  latParts.sec.toFixed(2) + '" ' +
               lonHemisfere + " " + Math.floor(lonParts.deg) + "° " +
                  Math.floor(lonParts.min) + "' " +
                  lonParts.sec.toFixed(2) + '"';
      }
    },

    getParts: function(coordinate) {
      var deg = Math.abs(coordinate);
      var min = 60 * (deg - Math.floor(deg));
      var sec = 60 * (min - Math.floor(min));
      return {deg: deg, min: min, sec: sec};
    },
  };

function cordsUnderCursorInit(params) {

  if( jQuery(window).width() < 800 ){
    console.log('CordsUnderCursor control skipped because of window width.')
    return;
  }

  params.curPos = {};
  params.curPos.positionDiv = $('<div class="ol-control dynamicMap_mousePosition"></div>');

  params.map.addControl(new ol.control.Control(
      {
        element: params.curPos.positionDiv[0],
      }
  ));

  params.curPos.lastKnownCoords = null;
  params.curPos.coordsFormat = CoordinatesUtil.FORMAT.DEG_MIN;

  params.map.on('pointermove', function(event) {

    if (!CoordinatesUtil.cmp(params.curPos.lastKnownCoords, event.coordinate)) {
      params.curPos.lastKnownCoords = event.coordinate

      params.curPos.positionDiv.html(
          CoordinatesUtil.toWGS84(params.map, params.curPos.lastKnownCoords, params.curPos.coordsFormat));
    }
  });

  // switch coords format on dbl-click
  params.curPos.positionDiv.dblclick( function() {
    switch(params.curPos.coordsFormat) {
    case CoordinatesUtil.FORMAT.DEG_MIN:
      params.curPos.coordsFormat = CoordinatesUtil.FORMAT.DEG_MIN_SEC;
      break;
    case CoordinatesUtil.FORMAT.DEG_MIN_SEC:
      params.curPos.coordsFormat = CoordinatesUtil.FORMAT.DECIMAL;
      break;
    case CoordinatesUtil.FORMAT.DECIMAL:
      params.curPos.coordsFormat = CoordinatesUtil.FORMAT.DEG_MIN;
      break;
    default:
      params.curPos.coordsFormat = CoordinatesUtil.FORMAT.DEG_MIN;
    }
  });

}

function infoMessageInit(params) {

  var $infoMsgId = params.prefix+'_infoMsg';

  $msgDiv = $('<div id="'+$infoMsgId+'" class="ol-control dynamicMap_infoMsg"></div>');
  $closeBtn = $('<div class="dynamicMap_infoMsgClose">✖</div>');
  $msgDiv.append($closeBtn);

  params.map.addControl( new ol.control.Control( { element: $msgDiv[0] } ));

  if( params.infoMessage ){
    $msgDiv.prepend(params.infoMessage);
    $msgDiv.show();
  }else{
    $msgDiv.hide(0);
  }

  $closeBtn.click(function(){
    $('#'+$infoMsgId).hide();
  });

}

// base Z index for markers layers
var markersBaseZIndex = 100;

function loadMarkers(params) {

    if (!params.markerData || params.markerData.length == 0) {
        return;
    }

    //add background layer
    var backgroundLayer = new ol.layer.Tile({
        source: new ol.source.TileImage({
            url: "{x: {x}, y: {y}, z: {z}}",
            tileLoadFunction: function(imageTile, src) {
                var im = imageTile.getImage();
                im.src="/images/map_markers_okapi/background_layer.png";
            }
        }),
        opacity: 0,
        zIndex: 50,
        ocLayerName: 'oc__background',
    });

    params.map.addLayer(backgroundLayer);

    var frontViewFeatures = {};
    var sources = {};
    var currentZIndex = markersBaseZIndex;
    var allExtent;
    var renderOrderingReverse = true;
    Object.keys(params.markerData).forEach(function(section) {
        var featuresArr = [];
        var props =
            typeof(params["sectionsProperties"]) != "undefined"
            && typeof(params["sectionsProperties"][section]) != "undefined"
            ? params["sectionsProperties"][section]:
            undefined;
        var zIndex = currentZIndex;
        if (props && typeof(props["order"]) !== "undefined") {
            zIndex = markersBaseZIndex - parseInt(props["order"]);
        } else {
            currentZIndex++;
        }
        var visible =
            props && typeof(props["visible"]) != "undefined"
            ? props["visible"]
            : true;
        Object.keys(params.markerData[section]).forEach(function(markerType) {
            params.markerData[section][markerType].forEach(
                function(markerData, id) {
                    var feature = params.markerMgr[markerType].markerFactory(
                        params.map, markerType, id, markerData, section
                    );
                    if (visible) {
                        var geom = feature.getGeometry();
                        if (typeof(geom["getCoordinates"]) === "function") {
                            var coords = geom.getCoordinates();
                            var key = "" + coords[0] + "," + coords[1];
                            var isFirst = (
                                typeof(frontViewFeatures[key]) === "undefined"
                            );
                            if (
                                !isFirst
                                && (
                                    renderOrderingReverse
                                    ? frontViewFeatures[key].zIndex < zIndex
                                    : frontViewFeatures[key].zIndex <= zIndex
                                )
                            ) {
                                frontViewFeatures[key].feature.set(
                                    "isFirst", false
                                );
                                isFirst = true;
                            }
                            if (isFirst) {
                                feature.set("isFirst", true);
                                frontViewFeatures[key] = {
                                    feature: feature,
                                    zIndex: zIndex
                                }
                            }
                        }
                    }
                    featuresArr.push(feature);
                }
            );
        });
        sources[section] = {
            src: new ol.source.Vector({ features: featuresArr }),
            zIndex: zIndex,
            visible: visible
        }
        if (!allExtent) {
            allExtent = sources[section].src.getExtent();
        } else {
            allExtent = ol.extent.extend(
                allExtent, sources[section].src.getExtent()
            );
        }
    });


    /*Object.keys(sources).forEach(function(section) {
        var source = sources[section];
        source.src.forEachFeature(function(f) {
            var txt = f.getId() + '__isFirst=';
            if (f.get('isFirst') != undefined) {
                txt += (f.get('isFirst') ? "true" : "false")
            } else {
                txt += "false";
            }
            if (f.get('ocData') != undefined) {
                txt += '__' + f.get('ocData').markerType;
            }
            if (f.get('ocMarker') != undefined) {
                var ocData = f.get('ocMarker').ocData;
                txt += '__' + ocData.name;
                if (typeof(ocData["logText"]) !== "undefined") {
                    txt += '__' + ocData.logText;
                }
            }
            console.log(txt);
        });
    });*/

    Object.keys(sources).forEach(function(section) {
        var source = sources[section];
        var markersLayer = new ol.layer.Vector ({
            zIndex: source.zIndex,
            visible: source.visible,
            source: source.src,
            ocLayerName: 'oc_markers_' + section,
            renderOrder: function(f1, f2) {
                return renderOrderingReverse
                    ? (f1["ol_uid"] > f2["ol_uid"]) ? -1 : +(f1["ol_uid"] < f2["ol_uid"])
                    : (f1["ol_uid"] < f2["ol_uid"]) ? -1 : +(f1["ol_uid"] > f2["ol_uid"])
                ;
            }
        });
        params.map.addLayer( markersLayer );
    });

    //zoom map to see all markers
    if(!params.forceMapZoom && !ol.extent.isEmpty(allExtent)){
        if (params.initRadius && parseInt(params.initRadius) > 0) {
            var c = new ol.geom.Circle(
                ol.extent.getCenter(allExtent),
                // alternative: ol.proj.fromLonLat([params.centerOn.lon, params.centerOn.lat]),
                parseInt(params.initRadius) / 10
            );
            ol.extent.extend(allExtent, c.getExtent());
        }
        params.map.getView().fit(allExtent, { nearest: true, maxZoom: 21 });
    }

    params["foregroundSource"] = new ol.source.Vector();
  
    var foregroundLayer = new ol.layer.Vector ({
        zIndex: 500,
        visible: true,
        source: params["foregroundSource"],
        ocLayerName: 'oc__foreground',
    });
    
    params.map.addLayer(foregroundLayer);

    // popup init.
    var popup = new ol.Overlay({
        element: $('<div class="dynamicMap_mapPopup"></div>')[0],
        positioning: 'bottom-center',
        stopEvent: true,
        insertFirst: false,
        offset: [0, -50],
        autoPan: true,
        autoPanAnimation: {
            duration: 250
        },
        offsetYAdjusted: false,
    });

    params.map.addOverlay(popup);

    params.map.on('click', function(evt) {
        // clear the featureIndex if it was set previously
        popup.unset('featureIndex', true);
        // clear the popup vertical adjustment info if it was set previously
        popup.set('offsetYAdjusted', false);

        var features = [];
        var fCoords;
        params.map.forEachFeatureAtPixel(evt.pixel, function(feature) {
            if ((feature.get('ocData')) != undefined) {
                var canAdd = true;
                if (fCoords == undefined) {
                    // save the first feature coordinates
                    fCoords = feature.getGeometry().getCoordinates();
                } else {
                    // add another features only if coordinates match the first one
                    var nfCoords = feature.getGeometry().getCoordinates();
                    canAdd = (
                        (
                            (nfCoords[0] == fCoords[0])
                            && (nfCoords[1] == fCoords[1])
                        )
                        || feature.getGeometry().intersectsCoordinate(fCoords)
                    );
                }
                if (canAdd) {
                    features.push(feature);
                }
            }
        });

        if (features.length > 0) {
            switchPopupContent(popup, params, features, true);
        } else {
            popup.setPosition(undefined);
        }
    });

    params.map.on('moveend', function(evt) {
        var zoom = params.map.getView().getZoom();
        var opacity = 1 - (127 - ((zoom >= 13) ? 15 : Math.max(0, zoom * 2 - 14))) / 127;
        backgroundLayer.setOpacity(opacity);
    });

    params.map.reorderSections = function (orders) {
        params.map.getLayerGroup().getLayersArray().forEach(function(layer) {
            var match = /^oc_markers_(.+)/.exec(layer.get('ocLayerName'));
            if (match != null) {
                var section= match[1];
                if (orders[section] !== undefined) {
                    layer.setZIndex(markersBaseZIndex - orders[section]);
                }
            }
        });
        params.map.renderSync();
    };

    params.map.toggleSectionVisibility = function(section) {
        params.map.getLayerGroup().getLayersArray().some(function(layer) {
            var match = /^oc_markers_(.+)/.exec(layer.get('ocLayerName'));
            if (match != null && match[1] == section) {
                layer.setVisible(!layer.getVisible());
                return true;
            }
        });
    };

    /*params.map.getViewport().addEventListener('contextmenu', function(evt) {
        var printed =false;
        params.map.forEachFeatureAtPixel([evt.layerX, evt.layerY], function(feature) {
            if ((feature.get('ocData')) != undefined) {
                console.log("id="+feature.getId()+", isFirst="+feature.get("isFirst"));
                printed = true;
            }
        });
        if (printed) {
            console.log("====");
        }
    });*/
}

function getPopupOffsetY(features) {
    var result;

    features.forEach(function(feature) {
        var ocData = feature.get("ocData");

        var ocMarker = feature.get('ocMarker');
        if (
            ocMarker != undefined
            && typeof(ocMarker['currentStyle']) != "undefined"
        ) {
            if (typeof(ocMarker.currentStyle['popupOffsetY']) === "undefined") {
                ocMarker.computePopupOffsetY();
            }
            if (typeof(ocMarker.currentStyle['popupOffsetY']) !== "undefined") {
                if (
                    result == undefined
                    || result > ocMarker.currentStyle.popupOffsetY
                ) {
                    result = ocMarker.currentStyle.popupOffsetY;
                }
            }
        } else {
            var im;
            var s = feature.getStyle();
            if (typeof(s["getImage"]) == "function") {
                im = s.getImage();
            }
            if (im && im instanceof ol.style.Icon) {
                var anc = im.getAnchor();
                var offset = -(anc[1] * im.getScale()) - 2;
                if (result == undefined || result > offset) {
                    result = offset;
                }
            }
        }
    });

    return result;
}

/**
 * Selects the next or previous feature from features being under a popup point
 * when the map was clicked. The selection depends on a 'forward' parameter
 * value. If there is no feature previously selected, the first one on choosen.
 * Next, the content and position of popup is set according to the selected
 * feature values.
 */
function switchPopupContent(popup, params, features, forward) {
    var i = popup.get('featureIndex');
    var oldFeature;
    if (i == undefined) {
        i = 0;
    } else {
        oldFeature = features[i];
        // (+/-1) modulo features.length, negative value workaround
        i = (
                ((forward ? (i + 1) : (i - 1)) % features.length)
                + features.length
            ) % features.length;
    }
    
    var feature = features[i];
    var ocData = feature.get("ocData");

    if (!popup.get('offsetYAdjusted')) {
        var popupOffsetY = getPopupOffsetY(features);
        if (popupOffsetY) {
            popup.setOffset([0, popupOffsetY]);
        }
        popup.set('offsetYAdjusted', true);
    }

    // move currect feature to the foreground layer, replacing the previous one
    if (feature.getId()) {
        var featureId = feature.getId();
        params.map.getLayerGroup().getLayersArray().some(function(layer) {
            if (/^oc_[^_].*/.test( layer.get('ocLayerName') )) {
                var s = layer.getSource();
                if (s.getFeatureById(featureId) === feature) {
                    if (oldFeature != undefined) {
                        var oldSource = popup.get('oldFeatureSource');
                        if (oldSource != undefined) {
                            params["foregroundSource"].removeFeature(oldFeature);
                            oldFeature.set("isFirst", false);
                            oldSource.addFeature(oldFeature);
                        }
                    }
                    s.removeFeature(feature);
                    feature.set("isFirst", true);
                    params["foregroundSource"].addFeature(feature);
                    popup.set('oldFeatureSource', s);
                    return true;
                }
            }
        });
    }
    
    var markerSection = ocData.markerSection;
    var markerType = ocData.markerType;
    var markerId = ocData.markerId;

    if(!params.compiledPopupTpls[markerType]){
        var popupTpl =
            $('script[type="text/x-handlebars-template"].' + markerType).html();
        params.compiledPopupTpls[markerType] = Handlebars.compile(popupTpl);
    }

    var markerContext = params.markerData[markerSection][markerType][markerId];
    if (features.length > 1) {
        markerContext['showNavi'] = true;
    } else {
        markerContext['showNavi'] = undefined;
    }
    $(popup.getElement()).html(
        params.compiledPopupTpls[markerType](markerContext)
    );

    $(".dmp-closer").click(function(evt) {
        popup.setPosition(undefined);
    });

    if (features.length > 1) {
        $(".dmp-navi .dmp-backward > img").click(function(evt) {
            switchPopupContent(popup, params, features, false);
        });
        $(".dmp-navi .dmp-forward > img").click(function(evt) {
            switchPopupContent(popup, params, features, true);
        });
    }

    popup.set('featureIndex', i);
    popup.setPosition(feature.getGeometry().getCoordinates());
}

/**
 * Object used in processing geolocation on the map
 * It allows to show current position read from GPS
 */
function GeolocationOnMap(map, iconSelector) {

    this.map = map
    this.positionMarkersCollection = new ol.Collection();
    this.positionMarkersLayer = null;

    this.STATUS = Object.freeze({
      INIT:              '', /* initial state */
      IN_PROGRESS:       'rgb(255,255,177,.5)', /* position reading in progress */
      POSITION_ACQUIRED: 'rgb(170,255,127,.5)', /* positions has been read */
      ERROR:             'rgb(0,255,255,.5)', /* some error occured */
    })


    this.getCurrentPosition = function() {
        console.log('get position...')

        if (!("geolocation" in navigator)) {
          console.error('Geolocation not supported by browser!');
          this.changeGeolocIconStatus(obj.STATUS.ERROR);
          return;
        }

        this.changeGeolocIconStatus(this.STATUS.IN_PROGRESS);

        navigator.geolocation.getCurrentPosition(
                this.getSuccessCallback(),
                this.getErrorCallback(),
                { enableHighAccuracy: true }
        );
    }

    // set new status and its icon
    this.changeGeolocIconStatus = function(newStatus) {
        $(iconSelector).css('background-color', newStatus);
    }

    this.getSuccessCallback = function() {

        var obj = this;

        return function(position) {
            console.log('position read: ', position);

            obj.changeGeolocIconStatus(obj.STATUS.POSITION_ACQUIRED);

            lat = position.coords.latitude;
            lon = position.coords.longitude;

            currCoords = ol.proj.fromLonLat([lon, lat]);
            accuracy = position.coords.accuracy;

            view = obj.map.getView();
            view.setCenter(currCoords);
            view.setZoom(obj.calculateZoomForAccuracy(accuracy));

            // draw position marker
            var accuracyFeature = new ol.Feature({
              geometry: new ol.geom.Circle(currCoords, accuracy),
            });

            accuracyFeature.setStyle([
                new ol.style.Style({ //circle
                    stroke: new ol.style.Stroke({
                      color: DynamicMapServices.styler.fgColor,
                      width: 2}),
                }),
                new ol.style.Style({ //center marker
                  geometry: function(feature){
                    return new ol.geom.Point(feature.getGeometry().getCenter());
                  },
                  image: new ol.style.RegularShape({
                    stroke: new ol.style.Stroke({
                      color: DynamicMapServices.styler.fgColor,
                      width: 2
                    }),
                    points: 4,
                    radius: 10,
                    radius2: 0,
                    angle: Math.PI / 4
                  })
                }),
                ]
            )

            obj.positionMarkersCollection.clear();
            obj.positionMarkersCollection.push(accuracyFeature);

            if (obj.positionMarkersLayer == null) {
              obj.positionMarkersLayer = new ol.layer.Vector({
                map: obj.map,
                source: new ol.source.Vector({
                  features: obj.positionMarkersCollection,
                }),
              });
            }
        }
    }

    this.getErrorCallback = function() {
        var obj = this;

        return function(positionError) {
            console.error('OC Map: positions reading error!', positionError);

            if (positionError.code === 1) { // Permission denied
                // User has denied geolocation - return to initial state
                obj.changeGeolocIconStatus(obj.STATUS.INIT);
            } else {
                // Indicate actual problem with getting position
                obj.changeGeolocIconStatus(obj.STATUS.ERROR);
            }
        }
    }

    this.calculateZoomForAccuracy = function(accuracy) {
        // accuracy is in meters

        if (accuracy <   300) return 16;
        if (accuracy <   600) return 15;
        if (accuracy <  1200) return 14;
        if (accuracy <  2400) return 13;
        if (accuracy <  5000) return 12;
        if (accuracy < 10000) return 11;
        return 10; // otherwise
    }

    return this;
}


/**
 * This is global interface to DynamicMapChunk
 */
var DynamicMapServices = {

  /**
   * returns OpenLayers map object used as a base of this chunk instance
   */
  getMapObject: function (mapId){
    return window['dynamicMapParams_'+mapId].map;
  },

  /**
   * returns the name of currently selected map (layer) name
   */
  getSelectedLayerName: function (mapId){

    map = this.getMapObject(mapId);

    var visibleLayers = [];
    map.getLayers().forEach(function(layer){

      if ( !OcLayerServices.isOcInternalLayer(layer)
           && layer.getVisible()) {

        visibleLayers.push(OcLayerServices.getOcLayerName(layer));
      }
    });

    if (visibleLayers.lenght <= 0){
      console.err('--- no visible layer ?! ---');
      return '';
    }

    if (visibleLayers.lenght > 1){
      console.err('--- many visible layers ?! ---');
    }

    return visibleLayers.pop();
  },

  /**
   * add callback which wil be call on map layer change
   * callback should be function with one input parameter: "selectedLayerName"
   */
  addMapLayerSwitchCallback: function (mapId, callback){
    if(typeof mapId === undefined){
      console.error('mapId is required!');
    }

    if(typeof callback !== 'function'){
      console.error('callback must be a function!');
    }

    params = window['dynamicMapParams_'+mapId];

    if( ! params.layerSwitchCallbacks ) {
      params.layerSwitchCallbacks = [];
    }

    params.layerSwitchCallbacks.push(callback);
  },

  styler: { // styles in OL format
    fgColor: [100, 100, 255, 1], // main foreground color in OL format
    bgColor: [238, 238, 238, 0.4], // main background color in OL fomrat
  }

};

var OcLayerServices = {

    isOcInternalLayer: function (layer){
      return ( /^oc_.*/.test( layer.get('ocLayerName') ));
    },

    setOcLayerName: function (layer, name){
      layer.set('ocLayerName', name);
    },

    getOcLayerName: function(layer) {
      return layer.get('ocLayerName');
    }

};

