<?php

namespace src\Utils\Observer;

use src\Models\GeoCache\GeoCacheLog;

/**
 * This interface should be implemented by observers interested in GeoCacheLog
 * operations.
 */
interface GeoCacheLogObserverInterface extends OCObserverInterface
{
    /**
     * This method is called by OCNotifier to do more selective filtering of
     * observers being notified about GeoCacheLog. Implementation of this method
     * should be lightweight and fast, therefore it is recommended to use only
     * attributes being part of a GeoCacheLog __serialize method resulting
     * array. In particular, do not use any code involving DB operations,
     * many-items loops etc. while implementing.
     *
     * @param GeoCacheLog $current a GeoCacheLog instance which state,
     *                             attributes etc. changes raised
     *                             the notification update
     * @param GeoCacheLog $original a GeoCacheLog before changes, preferrably
     *                              serialized before performing operations
     *                              causing the notification and unserialized
     *                              while notyfing OCNotifier.
     *                              This argument is optional, therefore you
     *                              should always check for its presence before
     *                              use while filtering and provide correct
     *                              result in case of empty/null value
     * @param array $extras an array of additional items useful in making
     *                      filtering decisions.
     *                      This argument is optional, therefore you should
     *                      always check for its presence before use while
     *                      filtering and provide correct result in case of
     *                      empty/null value
     *
     * @return bool true if this observer should be notified about GeoCacheLog,
     *              false otherwise
     */
    public function appliesGeoCacheLog(
        GeoCacheLog $current,
        GeoCacheLog $original = null,
        array $extras = null
    ): bool;

    /**
     * This method is called by OCNotifier to do update the observer about
     * GeoCacheLog changes. All actions triggered by the GeoCacheLog changes
     * should start inside this implementation.
     *
     * @param GeoCacheLog $current a GeoCacheLog instance which state,
     *                             attributes etc. changes raised
     *                             the notification update
     * @param GeoCacheLog $original a GeoCacheLog before changes, preferrably
     *                              serialized before performing operations
     *                              causing the notification and unserialized
     *                              while notyfing OCNotifier.
     *                              This argument is optional, therefore you
     *                              should always check for its presence before
     *                              use
     * @param array $extras an array of additional items useful for performing
     *                      actions triggered by the GeoCacheLog instance.
     *                      This argument is optional, therefore you should
     *                      always check for its presence before use
     */
    public function updateAboutGeoCacheLog(
        GeoCacheLog $current,
        GeoCacheLog $original = null,
        array $extras = null
    );
}
