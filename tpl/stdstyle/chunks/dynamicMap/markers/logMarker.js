function LogMarker(map, ocData) {
    OkapiBasedMarker.call(this, map, ocData);
    this.iconsDir = '/images/map_markers_okapi/log/';
}

LogMarker.prototype = Object.create(OkapiBasedMarker.prototype);

LogMarker.prototype.constructor = LogMarker;

LogMarker.prototype.getLogTypeSuffix = function(type) {
    var result;
    switch (parseInt(type)) {
        case 1: result = 'foundit'; break;
        case 2: result = 'didnotfind'; break;
        case 3: result = 'comment'; break;
        case 4: result = 'moved'; break;
        case 5: result = 'needmaintenance'; break;
        case 6: result = 'mademaintenance'; break;
        case 7: result = 'attended'; break;
        case 8: result = 'willattend'; break;
        case 9: result = 'archived'; break;
        case 10: result = 'readytosearch'; break;
        case 11: result = 'temporaryunavailable'; break;
        case 12: result = 'adminnote';
    }
    return result;
}

LogMarker.prototype.getFlagSuffix = function(flag) {
    var result;
    switch (flag) {
        case 1: result = 'own'; break;
        case 2: result = 'found'; break;
        case 3: result = 'new';
    }
    return result;
}

LogMarker.prototype.getIconFileName = function(sizePrefix, logType, flag) {
    var name = sizePrefix + '_log';
    name += this.getSuffix(logType, "getLogTypeSuffix");
    name += this.getSuffix(flag, "getFlagSuffix");
    name += ".png";
    return name;
}

LogMarker.prototype.getTinyImage = function() {
    result = [];
    result.push(
        new ol.style.Style({
            image: new ol.style.Icon({
                src: this.iconsDir
                    + this.getIconFileName(
                        'tiny',
                        this.ocData.logType
                    ),
            }),
        })
    );
    return result;
}

LogMarker.prototype.getMediumImage = function() {
    result = [];
    result.push(
        new ol.style.Style({
            image: new ol.style.Icon({
                src: this.iconsDir
                    + this.getIconFileName(
                        'medium',
                        this.ocData.logType,
                        (this.ocData.isOwner ? 1 : (this.ocData.isFound ? 2 : undefined)),
                    ),
            }),
        })
    );
    return result;
}

LogMarker.prototype.getLargeImage = function(showCaption) {
    result = [];
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
                        this.ocData.logType,
                        (this.ocData.isOwner ? 1 : (this.ocData.isFound ? 2 : undefined)),
                    ),
            }),
            text: caption,
        })
    );
    return result;
}
