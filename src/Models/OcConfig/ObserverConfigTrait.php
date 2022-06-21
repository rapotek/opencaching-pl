<?php

namespace src\Models\OcConfig;

/**
 * Loads configuration from ibserver.*.php.
 * Loaded variable name is 'observers'.
 *
 * @mixin OcConfig
 */
trait ObserverConfigTrait
{
    protected $observerConfig = null;

    /**
     * Returns an observers array from configuration or an empty array if
     * anything goes wrong
     */
    public function getObservers(): array
    {
        return self::instance()->getObserverConfig() ?? [];
    }

    private function getObserverConfig(): array
    {
        if (! $this->observerConfig) {
            $this->observerConfig = self::getConfig(
                'observer',
                'observers'
            );
        }

        return $this->observerConfig;
    }
}
