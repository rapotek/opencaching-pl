<?php

namespace src\Utils\EventHandler;

use src\Models\GeoCache\GeoCache;
use src\Models\User\User;
use src\Utils\Observer\OCNotifier;

class EventHandler
{
    public static function cacheNew(GeoCache $cache)
    {
        OCNotifier::notify($cache, null, ['action' => 'new']);
    }

    public static function cacheEdit(GeoCache $cache)
    {
        // here should be an unserialized cache before update as a second
        // parameter but it is null now to avoid editcache.php refactoring
        OCNotifier::notify($cache, null, ['action' => 'edit']);
    }

    // Old
    public static function event_change_log_type($userId)
    {
        User::deleteStatpic($userId);
    }
}
