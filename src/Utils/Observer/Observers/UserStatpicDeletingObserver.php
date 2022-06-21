<?php

namespace src\Utils\Observer\Observers;

use src\Models\GeoCache\GeoCache;
use src\Models\GeoCache\GeoCacheLog;
use src\Models\User\User;
use src\Utils\Observer\GeoCacheLogObserverInterface;
use src\Utils\Observer\GeoCacheObserverInterface;
use src\Utils\Observer\OCObserver;

/**
 * Triggers deleting of user statpic in case of the user's cache modifications
 * or the user's new log.
 */
class UserStatpicDeletingObserver extends OCObserver implements GeoCacheObserverInterface, GeoCacheLogObserverInterface
{
    /**
     * Applies if there is an extra parameter 'action' and it i equal to 'new'
     * or 'edit'.
     * TODO: This filter should be reconsidered during deep refactoring
     */
    public function appliesGeoCache(
        GeoCache $current,
        GeoCache $original = null,
        array $extras = null
    ): bool {
        return is_array($extras) && isset($extras['action']) && (
            $extras['action'] == 'new' || $extras['action'] == 'edit'
        );
    }

    /**
     * Applies if there is an extra parameter 'action' and it is equal to 'new'.
     * TODO: This filter should be reconsidered during deep refactoring
     */
    public function appliesGeoCacheLog(
        GeoCacheLog $current,
        GeoCacheLog $original = null,
        array $extras = null
    ): bool {
        return is_array($extras) && isset($extras['action'])
            && $extras['action'] == 'new';
    }

    public function updateAboutGeoCache(
        GeoCache $current,
        GeoCache $original = null,
        array $extras = null
    ) {
        User::deleteStatpic($current->getOwnerId());
    }

    public function updateAboutGeoCacheLog(
        GeoCacheLog $current,
        GeoCacheLog $original = null,
        array $extras = null
    ) {
        User::deleteStatpic($current->getUserId());
    }
}
