<?php
/**
 * Applies all sql scripts in current directory to the service database
 *
 * Requirements and assumptions:
 * - this script is run from command-line only, for security reasons
 * - all applied file names starts with yyyy-mm-dd followed by '-' or '_', where
 *   'yyyy' is a four-digit year, 'mm' is atwo digit month starting from 01,
 *   'dd' is a two-digit day of month
 * - each file in directory with name matching the above contains valid SQL
 *   script
 * - only files with 'yyyy' greater than 2005 are applied
 * - files are applied in alphabetical order, i.e. filenames with earlier 'date'
 *   are processed first
 * - files are applied forcibly, ignoring errors in single SQL commands 
 * - output from each file processing is passed through to this script stdout
 *   along with information about currently applied files
 * - OcConfig object along with setting initialization are used only to avoid
 *   separate definition of db access parameters
 */
use lib\Objects\OcConfig\OcConfig;

$GLOBALS['rootpath'] = "../";
require_once(__DIR__.'/../lib/common.inc.php');

if (php_sapi_name() === 'cli') {

    if (ob_get_level()) {
        ob_flush();
        ob_end_clean();
    }

    $conf = OcConfig::instance();

    foreach (
        glob(__DIR__."/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9][\-_]*")
        as $filename
    ) {
        if (
            preg_match(
                "/\/(?P<year>\d{4})-(\d{2})-(\d{2})[\-_].*$/",
                $filename,
                $matches
            )
            &&
            intval($matches["year"]) > 2005
           ) {
            print "Applying " . $filename . " ...\n";
            $output = [];
            // shell_exec is not used only to ensure command runs in bash
            exec(
                "/bin/bash -c 'MYSQL_PWD=" . $conf->getDbPass()
                . " mysql --force -h " . $conf->getDbHost()
                . " -u " . $conf->getDbUser() . " " . $conf->getDbName()
                . " < " . $filename . "' 2>&1", $output
            );
            foreach ($output as $line) {
                print "$line\n";
            }
            print "Applying " . $filename . " finished\n";
        }
    }
}
