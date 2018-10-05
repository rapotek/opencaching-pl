function CacheMarker(map, ocData) {
    OkapiBasedMarker.call(this, map, ocData);
    this.iconsDir = '/images/map_markers_okapi/cache/';
}

CacheMarker.prototype = Object.create(OkapiBasedMarker.prototype);

CacheMarker.prototype.constructor = CacheMarker;

CacheMarker.prototype.getTypeSuffix = function(type) {
    var result;
    switch (type) {
        case 1: result = 'unknown'; break;
        case 2: result = 'traditional'; break;
        case 3: result = 'multi'; break;
        case 4: result = 'virtual'; break;
        case 5: result = 'webcam'; break;
        case 6: result = 'event'; break;
        case 7: result = 'quiz'; break;
        case 8: result = 'moving'; break;
        case 10: result = 'own'; break;
        default: result = 'other';
    }
    return result;
}

CacheMarker.prototype.getStatusSuffix = function(status) {
    var result;
    switch (status) {
        case 2: result = 'unavailable'; break;
        case 3: result = 'archived';
    }
    return result;
}

CacheMarker.prototype.getRatingSuffix = function(rating) {
    var result;
    if (rating > 4) {
        result = 'excellent';
    }
    return result;
}

CacheMarker.prototype.getRecommendedSuffix = function(recommended) {
    var result;
    if (recommended) {
        result = 'recommended';
    }
    return result;
}

CacheMarker.prototype.getFlagSuffix = function(flag) {
    var result;
    switch (flag) {
        case 1: result = 'own'; break;
        case 2: result = 'found'; break;
        case 3: result = 'new';
    }
    return result;
}

CacheMarker.prototype.getCaptionSuffix = function(caption) {
    var result;
    if (caption) {
        result = 'caption';
    }
    return result;
}

CacheMarker.prototype.getIconFileName = function(
    sizePrefix, statOrType, type, status, rating, recommended, flag, caption
) {
    var name = sizePrefix;
    if (statOrType) {
        part = this.getSuffix(status, "getStatusSuffix");
        if (part) {
            name += part;
        } else {
            name += this.getSuffix(type, "getTypeSuffix");
        }
    } else {
        name += this.getSuffix(type, "getTypeSuffix");
        name += this.getSuffix(status, "getStatusSuffix");
    }
    name += this.getSuffix(rating, "getRatingSuffix");
    name += this.getSuffix(recommended, "getRecommendedSuffix");
    name += this.getSuffix(flag, "getFlagSuffix");
    name += this.getSuffix(caption, "getCaptionSuffix");
    name += ".png";
    return name;
}

CacheMarker.prototype.getTinyImage = function() {
    var result = [];
    result.push(
        new ol.style.Style({
            image: new ol.style.Icon({
                src: this.iconsDir
                    + this.getIconFileName(
                        'tiny',
                        true,
                        this.ocData.cacheType,
                        this.ocData.cacheStatus
                    ),
            }),
        })
    );
    return result;
}

CacheMarker.prototype.getMediumImage = function() {
    var result = [];
    result.push(
        new ol.style.Style({
            image: new ol.style.Icon({
                src: this.iconsDir
                    + this.getIconFileName(
                        'medium',
                        true,
                        this.ocData.cacheType,
                        this.ocData.cacheStatus,
                        (this.ocData.cacheStatus == 1 ? this.ocData.ratingId : undefined),
                        (this.ocData.cacheStatus == 1 ? this.isRecommended() : undefined),
                        (this.ocData.isOwner ? 1 : (this.ocData.isFound ? 2 : undefined)),
                        false
                    ),
            }),
        })
    );
    return result;
}

CacheMarker.prototype.getLargeImage = function(showCaption) {
    var result = [];
    var caption;
    if (showCaption) {
        caption = this.generateCaptionStyle();
    }
    result.push(
        new ol.style.Style({
            image: new ol.style.Icon({
                anchorOrigin: 'bottom-left',
                anchorXUnits: 'pixel',
                anchorYUnits: 'pixel',
                anchor: [ 13,  6 ],
                src: this.iconsDir
                    + this.getIconFileName(
                        'large',
                        false,
                        this.ocData.cacheType,
                        this.ocData.cacheStatus,
                        (this.ocData.cacheStatus == 1 ? this.ocData.ratingId : undefined),
                        (this.ocData.cacheStatus == 1 ? this.isRecommended() : undefined),
                        (this.ocData.isOwner ? 1 : (this.ocData.isFound ? 2 : undefined)),
                        (this.ocData.isFound ? showCaption : undefined)
                    ),
            }),
            text: caption,
        })
    );
    return result;
}
