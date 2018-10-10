/**
 * This function is a DynamicMap-chunk entrypoint
 *
 * @param params - JS object with properites of dynamicMap-chunk
 */
function dynamicMapEntryPoint( params ) {

  var prefix = params.prefix;
  var mapDiv = $('#'+params.targetDiv);

  // add attribution div
  var attributionDiv = $('<div class="dynamicMap_attribution"></div>');

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
      {
        collapsible: false,
        target: attributionDiv[0],
      },
      zoom: false
    }),

  });

  mapDiv.addClass("dynamicMap_cursor");

  // add attributions control
  params.map.addControl(new ol.control.Control(
      {
        element: attributionDiv[0],
      }
  ));

  // init layer switcher
  layerSwitcherInit(params);

  // init scaleLine
  scaleLineInit(params);

  // init zoom controls
  mapZoomControlsInit(params);

  // init mouse position coords
  cordsUnderCursorInit(params);

  // initialize markers on map
  loadMarkers(params);
}

function layerSwitcherInit(params) {

  // prepare dropdown object
  var switcherDropdown = $('<select></select>');

  // add layers from config to map
  $.each( params.mapLayersConfig, function(key, layer) {

    layer.set('ocLayerName', key)
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
        element: switcherDropdown[0],
      }
  ));

  // wrap dropdow in div
  switcherDropdown.wrap('<div class="ol-control dynamicMap_layerSwitcher"></div>')

  // init switcher change callback
  switcherDropdown.change(function(a) {

    params.map.getLayers().forEach(function(layer) {
        // first skip OC-internal layers (prefix oc_)
        if ( ! /^oc_.*/.test( layer.get('ocLayerName') )) {

          // make sure selected layer is not internal OC layer is visible
          if ( layer.get('ocLayerName') == switcherDropdown.val() ) {
            layer.setVisible(true);
            //$("#ocAttribution").html(layer.getSource().attributions_[0].html_)
            //console.log(layer.getSource().get('attributions'));
          } else {
            layer.setVisible(false);
          }

        } else {
          if ( layer.getVisible() != true) {
            layer.setVisible(true);
          }
        }
    })

    // run callback if it is present
    if ( typeof dynamicMap_layerSwitchCallback !== 'undefined'
         && $.isFunction(dynamicMap_layerSwitchCallback) ) {

      dynamicMap_layerSwitchCallback(params);
    }

  });

}

function scaleLineInit(params) {
  element = $("<div class='ol-control dynamicMap_mapScale'></div>");

  params.map.addControl(new ol.control.Control(
      {
        element: element[0],
      }
  ))
  params.map.addControl(new ol.control.ScaleLine(
      {
        className: 'customScale',
        target: element[0],
        minWidth: 100,
      }
  ))
}

function mapZoomControlsInit(params) {

  zoomDiv = $('<div class="ol-control dynamicMap_mapZoom"></div>');
  zoomIn = $('<img class="dynamicMap_mapZoomIn" src="/images/icons/plus.svg" alt="+">');
  zoomOut = $('<img class="dynamicMap_mapZoomOut" src="/images/icons/minus.svg" alt="-">');

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
          CoordinatesUtil.toWGS84(params.map, params.curPos.lastKnownCoords, params.curPos.coordsFormat)+" ["+event.pixel[0]+","+event.pixel[1]+"]");
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
        // there are markers
        params.map.getView().fit(allExtent);
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
