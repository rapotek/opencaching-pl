<?php

namespace src\Utils\Observer;

use src\Models\GeoCache\GeoCache;

/**
 * This interface should be implemented by observers interested in GeoCache
 * operations.
 */
interface GeoCacheObserverInterface extends OCObserverInterface
{
    /**
     * This method is called by OCNotifier to do more selective filtering of
     * observers being notified about GeoCache. Implementation of this method
     * should be lightweight and fast, therefore it is recommended to use only
     * attributes being part of a GeoCache __serialize method resulting array.
     * In particular, do not use any code involving DB operations,
     * many-items loops etc. while implementing.
     *
     * @param GeoCache $current a GeoCache instance which state, attributes etc.
     *                          changes raised the notification update
     * @param GeoCache $original a GeoCache before changes, preferrably
     *                           serialized before performing operations causing
     *                           the notification and unserialized while
     *                           notyfing OCNotifier.
     *                           This argument is optional, therefore you should
     *                           always check for its presence before use while
     *                           filtering and provide correct result in case of
     *                           empty/null value
     * @param array $extras an array of additional items useful in making
     *                      filtering decisions.
     *                      This argument is optional, therefore you should
     *                      always check for its presence before use while
     *                      filtering and provide correct result in case of
     *                      empty/null value
     *
     * @return bool true if this observer should be notified about GeoCache,
     *              false otherwise
     */
    public function appliesGeoCache(
        GeoCache $current,
        GeoCache $original = null,
        array $extras = null
    ): bool;

    /**
     * This method is called by OCNotifier to do update the observer about
     * GeoCache changes. All actions triggered by the GeoCache changes should
     * start inside this implementation.
     *
     * @param GeoCache $current a GeoCache instance which state, attributes etc.
     *                          changes raised the notification update
     * @param GeoCache $original a GeoCache before changes, preferrably
     *                           serialized before performing operations causing
     *                           the notification and unserialized while
     *                           notyfing OCNotifier.
     *                           This argument is optional, therefore you should
     *                           always check for its presence before use
     * @param array $extras an array of additional items useful for performing
     *                      actions triggered by the GeoCache instance.
     *                      This argument is optional, therefore you should
     *                      always check for its presence before use
     */
    public function updateAboutGeoCache(
        GeoCache $current,
        GeoCache $original = null,
        array $extras = null
    );
}
