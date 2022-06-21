<?php
/**
 * The'observers' array contains full paths of classes implementing interfaces
 * which extends '\src\Utils\Observer\OCObserverInterface'.
 * The class path can be either key or value of 'observers' array. If the class
 * path is a key and a value is an array, this value array is passed as a
 * parameter to 'OCObserverInterface::setOptions' method call of instantiated
 * class.
 * Bear in mind that the order of appearance of given class path in the
 * 'observers' array determines the order of runtime updating observers about a
 * notification. Even if you redefine an optionless class path to a one with
 * options, the order stays the same.
 *
 * Examples:
 * $observers = [
 *     '\src\Utils\Observer\Observers\ExampleObserver1',
 *     '\src\Utils\Observer\Observers\ExampleObserver2' => [
 *         'option' => 'optionValue',
 *     ],
 * ];
 * $observers[] = '\src\Utils\Observer\Observers\ExampleObserver3';
 * $observers['\src\Utils\Observer\Observers\ExampleObserver4'] = [];
 * $observers['\src\Utils\Observer\Observers\ExampleObserver5'] = [
 *     'option2' => 1234,
 *     'option3' => true,
 * ];
 */
$observers = [
    '\src\Utils\Observer\Observers\UserStatpicDeletingObserver' => [],
    '\src\Utils\Observer\Observers\GeoCacheNotifyNewObserver' => [],
];
