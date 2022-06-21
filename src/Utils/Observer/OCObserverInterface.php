<?php

namespace src\Utils\Observer;

/**
 * Top level interface for observers.
 * More specific interfaces extending this one should define methods following
 * pattern:
 * public function applies{SubjectClass}(
 *      {SubjectClass} $current,
 *      {SubjectClass} $original = null,
 *      array $extras = null
 * );
 * public function updateAbout{SubjectClass}(
 *      {SubjectClass} $current,
 *      {SubjectClass} $original = null,
 *      array $extras = null
 * );
 * where above names are not restricted, but argument types and order are
 * required by OCNotifier.
 */
interface OCObserverInterface
{
    /**
     * This method is used by OCNotifier for passing options defined in
     * configuration to the instance of class implementing interface.
     */
    public function setOptions(array $options = null);
}
