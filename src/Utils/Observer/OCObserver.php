<?php

namespace src\Utils\Observer;

/**
 * A helper class implementing OCObserverInterface, intended to be extended
 * by classes potentially using options and implementing more specific observer
 * interfaces
 */
abstract class OCObserver implements OCObserverInterface
{
    /** @var ?array options from configuration, may be null */
    protected ?array $options;

    /**
     * Implements OCObserverInterface method, setting the $options attribute
     */
    public function setOptions(array $options = null)
    {
        $this->options = $options;
    }
}
