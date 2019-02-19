function ConfigDraw(map, minRadius, maxRadius) {

    if (map == null || ! map instanceof ol.Map) {
        throw "Invalid map parameter";
    }

    this.map = map;
    this.minRadius = minRadius;
    this.maxRadius = maxRadius;

    this.configDrawCommonStyles = {
        'Circle': [
            new ol.style.Style({
                fill: new ol.style.Fill({
                    color: [255, 255, 0, 0.35]
                }),
                stroke: new ol.style.Stroke({
                    color: [0, 0, 0, 0.8],
                    width: 1
                }),
            }),
        ]
    };
    this.configDrawCommonStyles['GeometryCollection'] =
        this.configDrawCommonStyles['Circle'].concat(
            new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 5,
                    fill: new ol.style.Fill({
                        color: [255, 255, 255, 1]
                    }),
                    stroke: new ol.style.Stroke({
                        color: [0, 0, 0, 1],
                        width: 1
                    }),
                }),
            })
        );

    this.configDrawModifyStyles = {};
    var instance = this;
    Object.keys(instance.configDrawCommonStyles).forEach(function (k) {
        instance.configDrawModifyStyles[k] = instance.configDrawCommonStyles[k];
    });
    
    this.configDrawModifyStyles['Point'] = [
        new ol.style.Style({
            image: new ol.style.Circle({
                radius: 4,
                fill: new ol.style.Fill({
                    color: [255, 255, 255, 1]
                }),
                stroke: new ol.style.Stroke({
                    color: [0, 0, 0, 1],
                    width: 1
                }),
            }),
        }),
    ];

    var instance = this;
    this.configSource = new ol.source.Vector();
    this.configLayer = new ol.layer.Vector({
        source: this.configSource,
        zIndex: 1000,
        style: function(feature, resolution) {
            return instance.configDrawModifyStyles[
                feature.getGeometry().getType()
            ];
        },
    });
    this.configLayer.set('ocLayerName', 'oc_mynbh_config');

    this.modify = new ol.interaction.Modify({
        source: this.configSource,
        style: function(feature, resolution) {
            return instance.configDrawModifyStyles[
                feature.getGeometry().getType()
            ];
        },
    });

    this.snap = new ol.interaction.Snap({
        source: this.configSource
    });

    this.hooks = {};
}

ConfigDraw.prototype.setHooks = function(hooks) {
    if (hooks != null && typeof(hooks) === "object") {
        this.hooks = hooks;
    }
}

ConfigDraw.prototype.addHook = function(name, hook) {
    this.hooks[name] = hook;
}

ConfigDraw.prototype.init = function(initLatLon, initRadius) {
    this.map.addLayer(this.configLayer);
    this.map.addInteraction(this.snap);

    if (initLatLon && initRadius) {
        var currentGeometry = this._configGeometry(
            this._computeShapePoints(initLatLon, initRadius, true)
        );
        this.configSource.addFeature(new ol.Feature({
            geometry: currentGeometry,
            style: this.configDrawCommonStyles['GeometryCollection']
        }));
        this.map.getView().fit(currentGeometry.getExtent());
        this._startModifications();
    } else {
        var instance = this;
        this.draw = new ol.interaction.Draw({
            type: 'Circle',
            source: this.configSource,
            stopClick: true,
            style: function(feature, resolution) {
                return instance.configDrawCommonStyles[
                    feature.getGeometry().getType()
                ];
            },
            freehand: true,
            geometryFunction: this._configGeometry
        });

        this.draw.on("drawend", function(ev) {
            return instance._drawComplete(ev.feature);
        });
    }
}

ConfigDraw.prototype.startDrawing = function() {
    if (this.draw) {
        this.map.addInteraction(this.draw);
    }
}

ConfigDraw.prototype._configGeometry = function(coordinates, geometry) {
    var center = coordinates[0];
    var last = coordinates[1];
    var dx = center[0] - last[0];
    var dy = center[1] - last[1];
    var radius = Math.sqrt(dx * dx + dy * dy);
    if (!geometry) {
        geometry = new ol.geom.GeometryCollection();
    }
    geometry.setGeometries([
        new ol.geom.Point(center),
        new ol.geom.Circle(center, radius)
    ]);
    return geometry;
}

ConfigDraw.prototype._drawComplete = function(feature) {
    feature.setStyle(this.configDrawCommonStyles['GeometryCollection']);
    this._applyRestrictions(feature);
    this._callUpdateConfigHook(feature);
    this.map.removeInteraction(this.draw);
    this._startModifications();
}

ConfigDraw.prototype._callUpdateConfigHook = function(
    feature, newCoords, newRadius
) {
    if (typeof(this.hooks["updateConfig"]) === "function") {
        if (!newCoords || !newRadius) {
            params = this._computeNewConfigParams(feature);
            newCoords = params[0];
            newRadius = params[1];
        }
        this.hooks["updateConfig"](newCoords[0], newCoords[1], newRadius);
    }
}

ConfigDraw.prototype._getConfigShapes = function(feature, onlyCircle) {
    var circle, point;
    feature.getGeometry().getGeometries().forEach(function(g) {
        if (g.getType() == 'Circle') {
            circle = g;
        } else if (!onlyCircle && g.getType() == 'Point') {
            point = g;
        }
    });
    return onlyCircle ? circle : [ circle, point ];
}

ConfigDraw.prototype._applyRestrictions = function(feature) {
    var circle = this._getConfigShapes(feature, true);
    var radius = this._radiusToKm(circle);
    var adjust = false;
    if (radius > this.maxRadius) {
        radius = this.maxRadius;
        adjust = true;
    } else if (radius < this.minRadius) {
        radius = this.minRadius;
        adjust = true;
    }
    if (adjust) {
        feature.setGeometry(this._configGeometry(
            this._computeShapePoints(circle.getCenter(), radius, false)
        ));
    }
}

ConfigDraw.prototype._startModifications = function() {
    this.map.addInteraction(this.modify);
    var instance = this;
    this.map.on('pointermove', function(ev) {
        return instance._pointerMoveOnModify(ev);
    });
    this.modify.on('modifyend', function(ev) {
        if (ev.features.getLength() > 0) {
            var feature = ev.features.item(0);
            instance._applyRestrictions(feature);
            instance._callUpdateConfigHook(feature);
        }
    });
}

ConfigDraw.prototype._pointerMoveOnModify = function(ev) {
    var classNames = [
        'dynamicMap_cursorResize', 'dynamicMap_cursorMove'
    ];
    var c = ev.coordinate;
    var mf = this.map.getView().getResolution() * 10;

    var ft = this.configSource.getFeatures();
    if (ft.length) {
        var shapes = this._getConfigShapes(ft[0], false);
        var circle = shapes[0], point = shapes[1];
        var className, dist;
        if (circle) {
            var radius = circle.getRadius();
            dist = this._computeDist(circle.getCenter(), c);
            if (dist >= (radius - mf) && dist <= (radius + mf)) {
                className = classNames[0];
            }
        }
        if (!className && point) {
            if (!dist) {
                dist = this._computeDist(point.getCoordinates(), c);
            }
            if (dist <= mf) {
                className = classNames[1];
            }
        }
        var classAdded = false;
        var currentClasses = this.map.getTargetElement().classList;
        classNames.forEach(function(cn) {
            if (!className || className != cn) {
                currentClasses.remove(cn);
            } else {
                classAdded = (className && currentClasses.contains(cn));
            }
        });
        if (className && !classAdded) {
            currentClasses.add(className);
        }
    }
}

ConfigDraw.prototype._computeNewConfigParams = function(feature) {
    var circle = this._getConfigShapes(feature, true);
    var newCoords = this._toLatLon(circle.getCenter());
    var newRadius = this._radiusToKm(circle);
    return [ newCoords, newRadius ];
}

ConfigDraw.prototype._computeDist = function(startCoords, finalCoords) {
    var dx = startCoords[0] - finalCoords[0];
    var dy = startCoords[1] - finalCoords[1];
    return Math.sqrt(dx * dx + dy * dy);
}

ConfigDraw.prototype._computeShapePoints = function(
    centerCoords, radiusInKm, coordsAreLatLon
) {
    var centerLatLon =
        coordsAreLatLon ? centerCoords : this._toLatLon(centerCoords);
    var centerPoint =
        coordsAreLatLon ? this._fromLatLon(centerCoords) : centerCoords;
    var factor = 1/Math.cos(centerLatLon[0] * Math.PI / 180);
    var radiusPoint = ol.extent.getTopRight(
        (new ol.geom.Circle(
            centerPoint, radiusInKm * 1000 * factor
        )).getExtent()
    );
    radiusPoint[1] = centerPoint[1];
    return [ centerPoint, radiusPoint ];
}

ConfigDraw.prototype._radiusToKm = function(circle) {
    var centerLatLon = this._toLatLon(circle.getCenter());
    var factor = 1/Math.cos(centerLatLon[0] * Math.PI / 180);
    return Math.round( ( circle.getRadius() / factor ) / 1000 );
}

ConfigDraw.prototype._fromLatLon = function(latlonPoint) {
    return ol.proj.transform(
        (latlonPoint.constructor === Array)
        ? [ latlonPoint[1], latlonPoint[0] ]
        : [ latlonPoint.lon, latlonPoint.lat ],
        "EPSG:4326",
        "EPSG:3857"
    );
}

ConfigDraw.prototype._toLatLon = function(xyPoint) {
    var lonlat = ol.proj.transform(xyPoint, "EPSG:3857", "EPSG:4326");
    return [ lonlat[1], lonlat[0] ];
}
