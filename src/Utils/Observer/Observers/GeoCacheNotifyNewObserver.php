<?php

namespace src\Utils\Observer\Observers;

use src\Models\GeoCache\GeoCache;
use src\Models\GeoCache\GeoCacheCommons;
use src\Models\Notify\Notify;
use src\Utils\Observer\GeoCacheObserverInterface;
use src\Utils\Observer\OCObserver;

/**
 * Triggers generation of notifications about a new geocache
 */
class GeoCacheNotifyNewObserver extends OCObserver implements GeoCacheObserverInterface
{
    /**
     * Applies if geocache has been published and extra parameter 'action' is
     * equal to 'new'.
     * TODO: The extra parameter should be reconsidered during deep refactoring
     */
    public function appliesGeoCache(
        GeoCache $current,
        GeoCache $original = null,
        array $extras = null
    ): bool {
        return
            in_array($current->getStatus(), [
                GeoCacheCommons::STATUS_READY,
                GeoCacheCommons::STATUS_UNAVAILABLE,
            ])
            && ! empty($current->getDatePublished())
            && is_array($extras) && isset($extras['action'])
            && $extras['action'] == 'new';
    }

    public function updateAboutGeoCache(
        GeoCache $current,
        GeoCache $original = null,
        array $extras = null
    ) {
        Notify::generateNotifiesForCache($current);
    }
}
