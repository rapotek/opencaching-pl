function createOCMarkerFeature(type, id, ocData, ocMarker, layerId = "--DEFAULT--") {
    var feature = new ol.Feature({
        geometry: new ol.geom.Point(
            ol.proj.fromLonLat([parseFloat(ocData.lon), parseFloat(ocData.lat)])
        ),
        ocData: {
            markerType: type,
            markerId: id
        },
    });
    feature.setId(layerId + '_' + type + '_' + ocData.id);
    if (typeof ocMarker["getFeatureStyle"] === "function") {
        ocMarker.feature = feature;
        feature.set('ocMarker', ocMarker);
        feature.setStyle(function(feature, resolution) {
            return ocMarker.getFeatureStyle(resolution)
        });
    }
    return feature;
}

function OCMarker(map, ocData) {
    this.map = map;
    this.ocData = ocData;
    this.feature = undefined;
    this.currentStyle = undefined;
}

OCMarker.prototype.computePopupOffsetY = function() {
    if (
        this.currentStyle != undefined
        && typeof(this.currentStyle["style"]) !== "undefined"
    ) {
        if (typeof(this.currentStyle.style["length"]) !== "undefined") {
            var self = this;
            this.currentStyle.style.forEach(function(s) {
                var im  = s.getImage();
                if (im && im instanceof ol.style.Icon) {
                    var anchor = im.getAnchor();
                    var scale = im.getScale();
                    var cOfsY = -(anchor[1] * scale)
                    if (
                        typeof(self.currentStyle["popupOffsetY"]) === "undefined"
                        || self.currentStyle.popupOffsetY > cOfsY
                    ) {
                        self.currentStyle.popupOffsetY = cOfsY;
                    }
                }
            });
        } else if (typeof(this.currentStyle.style["getImage"]) == "function") {
            var im  = this.currentStyle.style.getImage();
            if (im && im instanceof ol.style.Icon) {
                var anchor = im.getAnchor();
                this.currentStyle.popupOffsetY = -(anchor[1] * im.getScale());
            }
        }
    }
}

function OCZoomDepMarker(map, ocData) {
    OCMarker.call(this, map, ocData);
    this.zoomRanges = {};
    this.zoomStyles = [];
    this.captionStyle;
}

OCZoomDepMarker.prototype = Object.create(OCMarker.prototype);

OCZoomDepMarker.prototype.constructor = OCZoomDepMarker;

OCZoomDepMarker.prototype.getZoomRange = function(zoom) {
    var result;
    var self = this;
    Object.keys(this.zoomRanges).some(function(r) {
        if (
            self.zoomRanges[r][0] <= zoom
            && self.zoomRanges[r][1] >= zoom
        ) {
            result = {
                name: r,
                range: self.zoomRanges[r],
            };
            return true;
        }
    });
    return result;
}

OCZoomDepMarker.prototype.getCachedZoomStyle = function (
    zoom, newStyleCallback
) {
    var markerStyle =
        (typeof(this.zoomStyles[zoom]) !== "undefined")
        ? this.zoomStyles[zoom]
        : undefined;
    if (markerStyle == undefined) {
        var showCaption = this.canShowCaption(zoom);
        if (showCaption && this.captionStyle !== undefined) {
            markerStyle = this.captionStyle;
        } else if (!showCaption) {
            var zoomRange = this.getZoomRange(zoom);
            this.zoomStyles.some(function(s, z) {
                if (
                    zoomRange.range[0] <= z
                    && zoomRange.range[1] >= z
                    && s !== this.captionStyle
                ) {
                    markerStyle = s;
                    return true;
                }
            });
        }
        if (markerStyle == undefined) {
            markerStyle = newStyleCallback.call(this, zoom, showCaption);
            if (showCaption) {
                this.captionStyle = markerStyle;
            }
        }
        this.zoomStyles[zoom] = markerStyle;
    }
    this.currentStyle = markerStyle;
    return markerStyle.style;
}


function OkapiBasedMarker(map, ocData) {
    OCZoomDepMarker.call(this, map, ocData);
    this.zoomRanges = {
        'tiny': [0, 8],
        'medium': [9, 13],
        'large': [14, 1000],
    };
}

OkapiBasedMarker.prototype = Object.create(OCZoomDepMarker.prototype);

OkapiBasedMarker.prototype.constructor = OkapiBasedMarker;


OkapiBasedMarker.prototype.canShowCaption = function(zoom) {
    var result = (zoom >= 5);
    if (result) {
        var ocLayers = this.map.getLayerGroup().getLayersArray().filter(
            function(layer) {
                return (/^oc_[^_].*/.test( layer.get('ocLayerName')))
            }
        );
        if (typeof(ocLayers.length) != "undefined" && ocLayers.length) {
            var coords = this.feature.getGeometry().getCoordinates();
            var featurePx = this.map.getPixelFromCoordinate(coords);
            var closestPx;
            var minDist;
            var self = this;
            ocLayers.forEach(function(ocLayer) {
                var s = ocLayer.getSource();
                var candidate;
                if (typeof(s["getClosestFeatureToCoordinate"]) === "function") {
                    candidate = s.getClosestFeatureToCoordinate(
                        coords, function(f) {
                            var fc = f.getGeometry().getCoordinates();
                            return (fc[0] != coords[0] || fc[1] != coords[1]);
                        }
                    );
                }
                if (candidate) {
                    var candidatePx = self.map.getPixelFromCoordinate(
                        candidate.getGeometry().getCoordinates()
                    );
                    var candidateDist =
                        Math.sqrt(
                            (featurePx[0] - candidatePx[0])^2
                            +
                            (featurePx[1] - candidatePx[1])^2
                        );
                    if (minDist == undefined || candidateDist < minDist) {
                        closestPx = candidatePx;
                        minDist = candidateDist;
                    }
                }
            });
            if (closestPx != undefined) {
                result = (
                    Math.abs(
                        ((closestPx[0] + 64) >> 5) - ((featurePx[0] + 64) >> 5)
                    ) > 1
                    &&
                    Math.abs(
                        ((closestPx[1] + 64) >> 5) - ((featurePx[1] + 64) >> 5)
                    ) > 1
                );
            }
        }
    }
    return result;
}

OkapiBasedMarker.prototype.getFeatureStyle = function(resolution) {
    var zoom = this.map.getView().getZoom();
    return this.getCachedZoomStyle(
        zoom, this.computeNewStyle
    );
}

OkapiBasedMarker.prototype.computeNewStyle = function(zoom, showCaption) {
    // TODO: implement higher level (map level) styles caching
    var result = {
        style: undefined,
        popupOffsetY: undefined
    }
    var zoomRange = this.getZoomRange(zoom);
    if (showCaption) {
        result.style = this.getLargeImage(true);
    } else {
        switch(zoomRange.name) {
            case 'tiny': result.style = this.getTinyImage(); break;
            case 'medium': result.style = this.getMediumImage(); break;
            default: result.style = this.getLargeImage(); break;
        }
    }
    return result;
}

OkapiBasedMarker.prototype.isRecommended = function() {
    return (
        this.ocData.ratingId > 4
        && this.ocData.founds > 6
        && (this.ocData.recommendations / this.ocData.founds) > 0.3
    );
}

OkapiBasedMarker.prototype.getSuffix = function(value, suffixFunction)
{
    var result = '';
    if (value != undefined) {
        var suffix = this[suffixFunction](value);
        if (suffix != undefined) {
            result = "_" + suffix;
        }
    }
    return result;
}

OkapiBasedMarker.prototype.wordwrap = function(
    font, maxWidth, maxHeight, lineHeight, text
) {
    var result = '';
    var ctx = this.map.get('wordWrapCtx');
    if (!ctx) {
        var canvas = document.createElement("canvas");
        if (canvas) {
            canvas.width = maxWidth;
            canvas.height = maxHeight;
            ctx = canvas.getContext('2d');
            ctx.font = font;
            ctx.fillStyle = '#960000';
            this.map.set('wordWrapCtx', ctx);
        }
    }
    if (ctx && text) {
        var words = text.split(" ");
        var lines = [];
        var line = '';
        var reminder = '';
        for (var i = 0; (i < words.length || reminder.length > 0); i++) {
            var word = (typeof(words[i]) !== "undefined" ? words[i] : "");
            if (reminder.length > 0) {
                word = reminder + " " + word;
            }
            reminder = "";
            var mStatus = false;
            while (!mStatus) {
                var metrics = ctx.measureText(line + word);
                if (metrics.width <= maxWidth) {
                    line += word + " ";
                    mStatus = true;
                } else if (line.length > 0) {
                    lines.push(line.trim());
                    line = "";
                } else {
                    reminder = word.substr(word.length - 1) + reminder;
                    word = word.substr(0, word.length - 1);
                }
            }
        }
        if (line.length > 0) {
            lines.push(line.trim());
        }
        while ((lines.length * lineHeight) > maxHeight && lines.length > 0) {
            lines.pop();
        }
        result = lines.join("\n");
    }
    return result;
}
