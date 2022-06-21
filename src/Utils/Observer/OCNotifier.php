<?php

namespace src\Utils\Observer;

use Exception;
use ReflectionClass;
use ReflectionException;
use src\Models\GeoCache\GeoCache;
use src\Models\GeoCache\GeoCacheLog;
use src\Models\OcConfig\OcConfig;

/**
 * A central point of the observer functionality. Creates and configures
 * instances of observers, filters out and updates observers about changed
 * objects. Intended for use in a static way only.
 */
abstract class OCNotifier
{
    /** @var bool set to true when observers initialization is done */
    protected static $initialized = false;

    /**
     * @var array classpaths of observers, verified as having a valid class,
     *            classified by implemented interface
     */
    protected static $verifiedObservers = [
        GeoCacheObserverInterface::class => [],
        GeoCacheLogObserverInterface::class => [],
    ];

    /**
     * @var array supported subject classes with corresponding interfaces and
     *            their applies and updateAbout method names
     */
    protected static $subjectMethods = [
        GeoCache::class => [
            'interface' => GeoCacheObserverInterface::class,
            'applies' => 'appliesGeoCache',
            'updateAbout' => 'updateAboutGeoCache',
        ],
        GeoCacheLog::class => [
            'interface' => GeoCacheLogObserverInterface::class,
            'applies' => 'appliesGeoCacheLog',
            'updateAbout' => 'updateAboutGeoCacheLog',
        ],
    ];

    /** @var array instances of observers, to reuse for notification updates */
    protected static $obInstances = [];

    /**
     * This method should be invoked by any high-level (f.ex. Controller) code,
     * changing subject. When using existing subject, it is recommended to
     * serialize it first before changes, do required changes and then pass
     * the modified subject as $current argument and the unserialized one as
     * $original argument.
     *
     * @param object $current a subject instance which state, attributes etc.
     *                        changes raised the notification update
     * @param object $original a subject before changes, preferrably
     *                         serialized before performing operations causing
     *                         the notification and unserialized while
     *                         calling this method
     * @param array $extras an array of additional items, which may be useful
     *                      for observers
     */
    public static function notify(
        object $current,
        object $original = null,
        array $extras = null
    ) {
        $subjectClass = get_class($current);

        if (! empty($original) && get_class($original) !== $subjectClass) {
            // A case of different class for $current and $original
            // is not supported
            return;
        }

        static::initialize();

        if (! isset(static::$subjectMethods[$subjectClass])) {
            // Subject of this type (class) is not supported
            return;
        }

        foreach (
            static::$verifiedObservers[
                static::$subjectMethods[$subjectClass]['interface']
            ] as $observerClass
        ) {
            $obInstance = static::getObserverInstance($observerClass);

            if ($obInstance) {
                $applies = static::$subjectMethods[$subjectClass]['applies'];
                $updateAbout = static::$subjectMethods[$subjectClass][
                    'updateAbout'
                ];

                // if applies, update
                if ($obInstance->{$applies}(
                    $current,
                    $original,
                    $extras
                )) {
                    // In future implementations instead of an immediate update,
                    // an instance may be added to a queue, orderer, prioritized
                    // etc
                    $obInstance->{$updateAbout}(
                        $current,
                        $original,
                        $extras
                    );
                }
            }
        }
    }

    /**
     * When not initialized before, fills $subjectMethods with supported subject
     * classes and corresponding interfaces, then fills up $verifiedObservers
     * array basing on configuration
     */
    protected static function initialize()
    {
        if (! static::$initialized) {
            foreach (
                OcConfig::instance()->getObservers() as $observer => $options
            ) {
                if (is_int($observer) && is_string($options)) {
                    $observer = $options;
                    unset($options);
                }

                try {
                    $cls = new ReflectionClass($observer);

                    if ($cls->isInstantiable()) {
                        foreach (static::$verifiedObservers as $inf => $obs) {
                            if (
                                $cls->implementsInterface($inf)
                                && ! in_array($cls->getName(), $obs)
                            ) {
                                static::$verifiedObservers[$inf][]
                                    = $cls->getName();
                            }
                        }
                    }
                } catch (ReflectionException $ex) {
                    error_log(static::class . ': ' . $ex);
                }
            }

            static::$initialized = true;
        }
    }

    /**
     * Creates or reuses an instance of $observerClass observer, When created,
     * the instance is stored in $obInstances array
     *
     * @param string $observerClass a classpath of an observer to instantiate
     *
     * @return object|null created instance or null in case of not found or
     *                     error
     */
    protected static function getObserverInstance(string $observerClass)
    {
        $obInstance = static::$obInstances[$observerClass] ?? null;

        // if there is no registered instance, instantiate and register
        if (! $obInstance) {
            try {
                $obInstance = new $observerClass();
                $options = (
                    OcConfig::instance()->getObservers()
                )[$observerClass] ?? null;

                // if there are options configured, set them in instance
                if (is_array($options)) {
                    $obInstance->setOptions($options);
                }

                static::$obInstances[$observerClass] = $obInstance;
            } catch (Exception $ex) {
                error_log(static::class . ': ' . $ex);
            }
        }

        return $obInstance;
    }
}
