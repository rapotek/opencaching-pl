function createOCMarkerFeature(type, id, ocData, ocMarker, section = "_DEFAULT_") {
    var feature = new ol.Feature({
        geometry: new ol.geom.Point(
            ol.proj.fromLonLat([parseFloat(ocData.lon), parseFloat(ocData.lat)])
        ),
        ocData: {
            markerSection: section,
            markerType: type,
            markerId: id
        },
    });
    feature.setId(section + '_' + type + '_' + ocData.id);
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
    this.noCaptionStyle;
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
    //console.log("zoom="+zoom+", name="+this.ocData.name+", isFirst="+this.feature.get("isFirst"))
    var markerStyle;
    var markerStyle =
        (typeof(this.zoomStyles[zoom]) !== "undefined")
        ? this.zoomStyles[zoom]
        : undefined;
    if (
        markerStyle == this.captionStyle
        && !this.feature.get("isFirst")
        && this.noCaptionStyle != undefined
    ) {
        markerStyle = this.noCaptionStyle;
    } else if (markerStyle == undefined) {
        var newMarkerStyle;
        var showCaption = this.canShowCaption(zoom);
        if (showCaption && this.captionStyle !== undefined) {
            newMarkerStyle = this.captionStyle;
        } else if (!showCaption) {
            var zoomRange = this.getZoomRange(zoom);
            this.zoomStyles.some(function(s, z) {
                if (
                    zoomRange.range[0] <= z
                    && zoomRange.range[1] >= z
                    && s !== this.captionStyle
                ) {
                    newMarkerStyle = s;
                    return true;
                }
            });
        }
        if (newMarkerStyle == undefined) {
            newMarkerStyle = newStyleCallback.call(
                this, zoom, showCaption ? 2 : 0
            );
            if (showCaption) {
                this.captionStyle = newMarkerStyle;
                this.noCaptionStyle = newStyleCallback.call(this, zoom, 1);
            }
        }
        this.zoomStyles[zoom] = newMarkerStyle;
        if (showCaption && !this.feature.get("isFirst")) {
            markerStyle = this.noCaptionStyle;
        } else {
            markerStyle = newMarkerStyle;
        }
    }
    this.currentStyle = markerStyle;
    //console.log(markerStyle.style[0].getImage().getSrc());
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
            var closestCandidate; //
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
                            (featurePx[0] - candidatePx[0]) ** 2
                            +
                            (featurePx[1] - candidatePx[1]) ** 2
                        );
                    if (minDist == undefined || candidateDist < minDist) {
                        closestPx = candidatePx;
                        minDist = candidateDist;
                        closestCandidate = candidate;
                    }
                }
            });
            if (closestPx != undefined) {
                /*
                 // does not work as expected, why?
                 result = (
                    Math.abs(
                        ((closestPx[0] + 64) >> 5) - ((featurePx[0] + 64) >> 5)
                    ) > 1
                    ||
                    Math.abs(
                        ((closestPx[1] + 64) >> 5) - ((featurePx[1] + 64) >> 5)
                    ) > 1
                );*/
                result = (
                    Math.abs(closestPx[0] - featurePx[0]) > 64
                    ||
                    Math.abs(closestPx[1] - featurePx[1]) > 64
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

OkapiBasedMarker.prototype.getCachedIconStyle = function(zoomRangeName, captionLevel) {
    var src;
    var size = captionLevel > 0 ? 'large' : zoomRangeName;
    src = this.getIconSrc(size);
    var cachedStyle;
    var ocIconStyles = this.map.get('_ocIconStyles');
    if (ocIconStyles != undefined) {
        cachedStyle =
            typeof(ocIconStyles[src]) !== "undefined"
            ? ocIconStyles[src]
            : undefined;
    }
    if (!cachedStyle) {
        cachedStyle = this.getIconStyle(size, src);
        if (ocIconStyles == undefined) {
            ocIconStyles = {};
        }
        ocIconStyles[src] = cachedStyle;
        this.map.set('_ocIconStyles', ocIconStyles);
    }
    return cachedStyle;
}

OkapiBasedMarker.prototype.getCommonIconStyle =  function(size, src) {
    var result;
    if (size == 'medium') {
        result = new ol.style.Style({
            image: new ol.style.Icon({
                anchorOrigin: 'bottom-left',
                anchorXUnits: 'pixel',
                anchorYUnits: 'pixel',
                anchor: [ 7,  7 ],
                src: src,
            }),
        });
    }
    if (size == 'large') {
        result = new ol.style.Style({
            image: new ol.style.Icon({
                anchorOrigin: 'bottom-left',
                anchorXUnits: 'pixel',
                anchorYUnits: 'pixel',
                anchor: [ 13,  6 ],
                src: src,
            }),
        });
    } else {
        result = new ol.style.Style({
            image: new ol.style.Icon({
                src: src,
            }),
        });
    }
    return result;
}

OkapiBasedMarker.prototype.computeNewStyle = function(zoom, captionLevel) {
    var result = {
        style: undefined,
        popupOffsetY: undefined
    }

    var zoomRange = this.getZoomRange(zoom);
    result.style = [];
    result.style.push(this.getCachedIconStyle(zoomRange.name, captionLevel));
    if (captionLevel > 0) {
        var captionStyle = this.getCaptionStyle(captionLevel > 1);
        if (captionStyle) {
            result.style.push(captionStyle);
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

OkapiBasedMarker.prototype.getSuffix = function(value, suffixFunction) {
    var result = '';
    if (value != undefined) {
        var suffix = this[suffixFunction](value);
        if (suffix != undefined) {
            result = "_" + suffix;
        }
    }
    return result;
}

OkapiBasedMarker.prototype.generateCaptionStyle = function(caption) {
    var font = "26pt Tahoma,Geneva,sans-serif";
    return new ol.style.Text({
        font: font,
        stroke: new ol.style.Stroke({
            color: [ 255, 255, 255, 1 - 20/127],
            width: 12,
        }),
        fill: new ol.style.Fill({
            color: [ 150, 0, 0, 1 - 40/127],
        }),
        textBaseline: "top",
        scale: 0.25,
        offsetY: 15,
        text: this.wordwrap(font, 64*4, 26*4, 34, caption),
    });
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
