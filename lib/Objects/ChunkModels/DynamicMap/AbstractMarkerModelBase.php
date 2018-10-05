<?php
namespace lib\Objects\ChunkModels\DynamicMap;

use \ReflectionClass;

/**
 * This is base class for all dynamic map markers.
 */
abstract class AbstractMarkerModelBase
{
    public $id;             // id of marker
    public $lat;            // lat. of marker
    public $lon;            // lon. of marker
    public $icon;           // icon of marker
    public $section;        // [optional] section the marker belongs to

    public function getMarkerTypeName(){
        $str = (new ReflectionClass(static::class))->getShortName();
        return preg_replace('/Model$/', '', lcfirst($str));
    }

    public function getMarkerJsData()
    {
        return json_encode($this, JSON_PRETTY_PRINT);
    }

    /**
     * Check if all necessary data is set in this marker class
     * @return boolean
     */
    public function checkMarkerData()
    {
        return true
        && isset($this->id)
        && isset($this->lat)
        && isset($this->lon)
        && isset($this->icon)
        ;
    }

}
