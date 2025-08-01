<?php

use src\Models\ApplicationContainer;
use src\Models\GeoCache\CacheAttribute;
use src\Models\GeoCache\GeoCache;
use src\Models\GeoCache\GeoCacheCommons;
use src\Models\OcConfig\OcConfig;
use src\Utils\Database\OcDb;
use src\Utils\Database\XDb;
use src\Utils\Debug\Debug;
use src\Utils\Email\EmailSender;
use src\Utils\EventHandler\EventHandler;
use src\Utils\Generators\Uuid;
use src\Utils\Gis\Countries;
use src\Utils\I18n\I18n;
use src\Utils\I18n\Languages;
use src\Utils\Text\UserInputFilter;
use src\Utils\Text\Validator;

require_once __DIR__ . '/lib/common.inc.php';

$view = tpl_getView();

$view->addLocalCss('/views/editCache/editCache.css');

// user logged in?
$loggedUser = ApplicationContainer::GetAuthorizedUser();

if (! $loggedUser) {
    $target = urlencode(tpl_get_current_page());
    $view->redirect('/login.php?target=' . $target);

    exit;
}

$db = OcDb::instance();

if (isset($_REQUEST['newcache_info']) && $_REQUEST['newcache_info'] != 1) {
    // set here the template to process
    $view->setTemplate('newcache');
} else {
    // display info about register new cache
    $view->setTemplate('newcache_info');
}

if (! $loggedUser->canCreateNewCache()) {
    $view->setVar('caches_find', $loggedUser->getFoundPhysicalGeocachesCount())
        ->setVar('need_find_limit', OcConfig::getNeedFindLimit())
        ->setTemplate('newcache_beginner')
        ->buildView();

    exit();
}

// former /src/Views/newcache.inc.php' contents
$default_region = '0';
$show_all = tr('show_all');
$default_NS = 'N';
$default_EW = 'E';
$error_coords_not_ok = '<br><img src="images/misc/32x32-impressum.png" class="icon32" alt="">&nbsp;<span class="errormsg">' . tr('bad_coordinates') . '</span>';
$time_not_ok_message = '<br><img src="images/misc/32x32-impressum.png" class="icon32" alt="">&nbsp;<span class="errormsg">' . tr('time_incorrect') . '</span>';
$way_length_not_ok_message = '<br><img src="images/misc/32x32-impressum.png" class="icon32" alt="">&nbsp;<span class="errormsg">' . tr('distance_incorrect') . '</span>';
$date_not_ok_message = '<br><img src="images/misc/32x32-impressum.png" class="icon32" alt="">&nbsp;<span class="errormsg">' . tr('date_incorrect') . '</span>';
$name_not_ok_message = '<br><img src="images/misc/32x32-impressum.png" class="icon32" alt="">&nbsp;<span class="errormsg">' . tr('no_cache_name') . '</span>';
$type_not_ok_message = '<br><img src="images/misc/32x32-impressum.png" class="icon32" alt="">&nbsp;&nbsp;<span class="errormsg">' . tr('type_incorrect') . '</span>';
$size_not_ok_message = '<br><img src="images/misc/32x32-impressum.png" class="icon32" alt="">&nbsp;&nbsp;<span class="errormsg">' . tr('size_incorrect') . '</span>';
// former /src/Views/newcache.inc.php' contents ends

$rsnc = XDb::xSql('SELECT COUNT(`caches`.`cache_id`) as num_caches FROM `caches`
            WHERE `user_id` = ? AND status = 1', $loggedUser->getUserId());
$record = XDb::xFetchArray($rsnc);
$num_caches = $record['num_caches'];

$cacheLimitByTypePerUser = GeoCache::getUserActiveCachesCountByType($loggedUser->getUserId());

if ($num_caches < OcConfig::getNeedApproveLimit()) {
    if($loggedUser->getNewCachesNoLimit()){
        $needs_approvement = false;
        tpl_set_var('hide_publish_start', '');
        tpl_set_var('hide_publish_end', '');
        tpl_set_var('approvement_note', '');
    }else{
        // user needs approvement for first 3 caches to be published
        $needs_approvement = true;
        tpl_set_var('hide_publish_start', '<!--');
        tpl_set_var('hide_publish_end', '-->');
        tpl_set_var('approvement_note', '<div class="notice errormsg">' . tr('first_cache_approvement') . '</div>');
    }
} elseif ($loggedUser->getVerifyAll()) {
    $needs_approvement = true;
    tpl_set_var('hide_publish_start', '<!--');
    tpl_set_var('hide_publish_end', '-->');
    tpl_set_var('approvement_note', '<div class="notice errormsg">' . tr('all_cache_approvement') . '</div>');
} else {
    $needs_approvement = false;
    tpl_set_var('hide_publish_start', '');
    tpl_set_var('hide_publish_end', '');
    tpl_set_var('approvement_note', '');
}

// set template replacements
tpl_set_var('general_message', '');
tpl_set_var('hidden_since_message', tr('newcacheDateFormat'));
tpl_set_var('activate_on_message', tr('newcacheDateFormat'));
tpl_set_var('lon_message', '');
tpl_set_var('lat_message', '');
tpl_set_var('tos_message', '');
tpl_set_var('name_message', '');
tpl_set_var('desc_message', '');
tpl_set_var('effort_message', '');
tpl_set_var('size_message', '');
tpl_set_var('type_message', '');
tpl_set_var('diff_message', '');
tpl_set_var('region_message', '');
tpl_set_var('wp_gc_message', '');
tpl_set_var('wp_tc_message', '');
// configuration variables needed in translation strings
tpl_set_var('limits_promixity', $config['oc']['limits']['proximity']);
tpl_set_var('short_sitename', OcConfig::getSiteShortName());
$view->loadJQueryUI();

$sel_type = $_POST['type'] ?? -1;

if (! isset($_POST['size'])) {
    if ($sel_type == GeoCache::TYPE_VIRTUAL || $sel_type == GeoCache::TYPE_WEBCAM || $sel_type == GeoCache::TYPE_EVENT) {
        $sel_size = GeoCache::SIZE_NONE;
    } else {
        $sel_size = -1;
    }
} else {
    $sel_size = $_POST['size'] ?? -1;

    if ($sel_type == GeoCache::TYPE_VIRTUAL || $sel_type == GeoCache::TYPE_WEBCAM || $sel_type == GeoCache::TYPE_EVENT) {
        $sel_size = GeoCache::SIZE_NONE;
    }
}
$sel_lang = $_POST['desc_lang'] ?? I18n::getCurrentLang();
$sel_country = $_POST['country'] ?? strtoupper(I18n::getCurrentLang());
$sel_region = $_POST['region'] ?? $default_region;
$show_all_countries = $_POST['show_all_countries'] ?? 0;
$show_all_langs = $_POST['show_all_langs'] ?? 0;

// coords
$lonEW = $_POST['lonEW'] ?? $default_EW;

if ($lonEW == 'E') {
    tpl_set_var('lonWsel', '');
    tpl_set_var('lonEsel', ' selected="selected"');
} else {
    tpl_set_var('lonE_sel', '');
    tpl_set_var('lonWsel', ' selected="selected"');
}
$lon_h = $_POST['lon_h'] ?? '';
tpl_set_var('lon_h', htmlspecialchars($lon_h, ENT_COMPAT));

$lon_min = $_POST['lon_min'] ?? '';
tpl_set_var('lon_min', htmlspecialchars($lon_min, ENT_COMPAT));

$latNS = $_POST['latNS'] ?? $default_NS;

if ($latNS == 'N') {
    tpl_set_var('latNsel', ' selected="selected"');
    tpl_set_var('latSsel', '');
} else {
    tpl_set_var('latNsel', '');
    tpl_set_var('latSsel', ' selected="selected"');
}
$lat_h = $_POST['lat_h'] ?? '';
tpl_set_var('lat_h', htmlspecialchars($lat_h, ENT_COMPAT));

$lat_min = $_POST['lat_min'] ?? '';
tpl_set_var('lat_min', htmlspecialchars($lat_min, ENT_COMPAT));

// name
$name = $_POST['name'] ?? '';
tpl_set_var('name', htmlspecialchars($name, ENT_COMPAT));

// shortdesc
$short_desc = $_POST['short_desc'] ?? '';
tpl_set_var('short_desc', htmlspecialchars($short_desc, ENT_COMPAT));

// desc
$desc = $_POST['desc'] ?? '';
tpl_set_var('desc', htmlspecialchars($desc, ENT_COMPAT));

// for old versions of OCProp
if (isset($_POST['submit']) && ! isset($_POST['version2'])) {
    $_POST['submitform'] = $_POST['submit'];

    $short_desc = iconv('utf-8', 'UTF-8', $short_desc);
    $desc = iconv('utf-8', 'UTF-8', $desc);
    $name = iconv('utf-8', 'UTF-8', $name);
}

// effort
$search_time = $_POST['search_time'] ?? '0';
$way_length = $_POST['way_length'] ?? '0';

$search_time = mb_ereg_replace(',', '.', $search_time);
$way_length = mb_ereg_replace(',', '.', $way_length);

if (mb_strpos($search_time, ':') == mb_strlen($search_time) - 3) {
    $st_hours = mb_substr($search_time, 0, mb_strpos($search_time, ':'));
    $st_minutes = mb_substr($search_time, mb_strlen($st_hours) + 1);

    if (is_numeric($st_hours) && is_numeric($st_minutes)) {
        if (($st_minutes >= 0) && ($st_minutes < 60)) {
            $search_time = $st_hours + $st_minutes / 60;
        }
    }
}

$st_hours = floor($search_time);
$st_minutes = sprintf('%02d', ($search_time - $st_hours) * 60);

tpl_set_var('search_time', $st_hours . ':' . $st_minutes);
tpl_set_var('way_length', $way_length);

// hints
$hints = $_POST['hints'] ?? '';
tpl_set_var('hints', htmlspecialchars($hints, ENT_COMPAT));

// for old versions of OCProp
if (isset($_POST['submit']) && ! isset($_POST['version2'])) {
    $hints = iconv('utf-8', 'UTF-8', $hints);
}

// hidden_since
$hidden_day = $_POST['hidden_day'] ?? date('d');
$hidden_month = $_POST['hidden_month'] ?? date('m');
$hidden_year = $_POST['hidden_year'] ?? date('Y');
tpl_set_var('hidden_day', htmlspecialchars($hidden_day, ENT_COMPAT));
tpl_set_var('hidden_month', htmlspecialchars($hidden_month, ENT_COMPAT));
tpl_set_var('hidden_year', htmlspecialchars($hidden_year, ENT_COMPAT));

// activation date
$activate_day = $_POST['activate_day'] ?? date('d');
$activate_month = $_POST['activate_month'] ?? date('m');
$activate_year = $_POST['activate_year'] ?? date('Y');
tpl_set_var('activate_day', htmlspecialchars($activate_day, ENT_COMPAT));
tpl_set_var('activate_month', htmlspecialchars($activate_month, ENT_COMPAT));
tpl_set_var('activate_year', htmlspecialchars($activate_year, ENT_COMPAT));

if (isset($_POST['publish'])) {
    $publish = $_POST['publish'];

    if ($publish == 'now') {
        tpl_set_var('publish_now_checked', 'checked="checked"');
    } else {
        tpl_set_var('publish_now_checked', '');
    }

    if ($publish == 'later') {
        tpl_set_var('publish_later_checked', 'checked="checked"');
    } else {
        tpl_set_var('publish_later_checked', '');
    }

    if ($publish == 'notnow') {
        tpl_set_var('publish_notnow_checked', 'checked="checked"');
    } else {
        tpl_set_var('publish_notnow_checked', '');
    }
} else {
    // Standard
    tpl_set_var('publish_now_checked', '');
    tpl_set_var('publish_later_checked', '');
    tpl_set_var('publish_notnow_checked', 'checked="checked"');
    $publish = '';
}

// fill activate hours
$activate_hour = isset($_POST['activate_hour']) ? $_POST['activate_hour'] + 0 : date('H') + 0;
$activation_hours = '';

for ($i = 0; $i <= 23; $i++) {
    if ($activate_hour == $i) {
        $activation_hours .= '<option value="' . $i . '" selected="selected">' . $i . ':00</option>';
    } else {
        $activation_hours .= '<option value="' . $i . '">' . $i . ':00</option>';
    }
    $activation_hours .= "\n";
}
tpl_set_var('activation_hours', $activation_hours);

// log-password (no password for traditional caches)
$log_pw = (isset($_POST['log_pw']) && $sel_type != 2) ? mb_substr($_POST['log_pw'], 0, 20) : '';
tpl_set_var('log_pw', htmlspecialchars($log_pw, ENT_COMPAT));

// gc- and tc-waypoints
$wp_gc = $_POST['wp_gc'] ?? '';
tpl_set_var('wp_gc', htmlspecialchars($wp_gc, ENT_COMPAT));

$wp_tc = $_POST['wp_tc'] ?? '';
tpl_set_var('wp_tc', htmlspecialchars($wp_tc, ENT_COMPAT));

// difficulty
$difficulty = $_POST['difficulty'] ?? 1;
$difficulty_options = '<option value="1" disabled selected="selected">' . tr('choose') . '</option>';

for ($i = 2; $i <= 10; $i++) {
    if ($difficulty == $i) {
        $difficulty_options .= '<option value="' . $i . '" selected="selected">' . $i / 2 . '</option>';
    } else {
        $difficulty_options .= '<option value="' . $i . '">' . $i / 2 . '</option>';
    }
    $difficulty_options .= "\n";
}
tpl_set_var('difficulty_options', $difficulty_options);

// terrain
$terrain = $_POST['terrain'] ?? 1;
$terrain_options = '<option value="1" disabled selected="selected">' . tr('choose') . '</option>';

for ($i = 2; $i <= 10; $i++) {
    if ($terrain == $i) {
        $terrain_options .= '<option value="' . $i . '" selected="selected">' . $i / 2 . '</option>';
    } else {
        $terrain_options .= '<option value="' . $i . '">' . $i / 2 . '</option>';
    }
    $terrain_options .= "\n";
}
tpl_set_var('terrain_options', $terrain_options);

// size options
tpl_set_var('sizeoptions', buildCacheSizeSelector($sel_type, $sel_size));

if ($sel_type == GeoCache::TYPE_VIRTUAL || $sel_type == GeoCache::TYPE_WEBCAM || $sel_type == GeoCache::TYPE_EVENT) {
    tpl_set_var('is_disabled_size', 'disabled');
} else {
    tpl_set_var('is_disabled_size', '');
}

// typeoptions
$types = '<option value="-1" disabled selected="selected">' . tr('select_one') . '</option>';

foreach (GeoCacheCommons::CacheTypesArray() as $typeId) {
    // block creating forbidden cache types
    if (in_array($typeId, OcConfig::getNoNewCacheOfTypesArray())) {
        continue;
    }

    // apply cache limit by type per user
    if (isset($config['cacheLimitByTypePerUser'][$typeId], $cacheLimitByTypePerUser[$typeId])
        && $cacheLimitByTypePerUser[$typeId] >= $config['cacheLimitByTypePerUser'][$typeId]) {
        continue;
    }

    if ($typeId == $sel_type) {
        $types .= '<option value="' . $typeId . '" selected="selected">'
            . tr(GeoCacheCommons::CacheTypeTranslationKey($typeId)) . '</option>';
    } else {
        $types .= '<option value="' . $typeId . '">'
            . tr(GeoCacheCommons::CacheTypeTranslationKey($typeId)) . '</option>';
    }
}
tpl_set_var('typeoptions', $types);

if (isset($_POST['show_all_countries_submit'])) {
    $show_all_countries = 1;
} elseif (isset($_POST['show_all_langs_submit'])) {
    $show_all_langs = 1;
}

// langoptions selector
buildDescriptionLanguageSelector($show_all_langs, I18n::getCurrentLang(), $config['defaultLanguageList'], $db, $show_all);

// countryoptions
$countriesoptions = '';
$defaultCountryList = [];

if ($show_all_countries == 1) {
    tpl_set_var('show_all_countries', '1');
    tpl_set_var('show_all_countries_submit', '');

    // get all countries codes
    $defaultCountryList = Countries::getCountriesList();
} else {
    tpl_set_var('show_all_countries', '0');
    tpl_set_var('show_all_countries_submit', '<input class="btn btn-default btn-sm" type="submit" name="show_all_countries_submit" value="' . $show_all . '"/>');
    $defaultCountryList = Countries::getCountriesList(true);
}

$sortedCountries = [];

foreach ($defaultCountryList as $countryCode) {
    $sortedCountries[] = [
        'code' => $countryCode,
        'name' => tr($countryCode),
    ];
}

$currentLocale = Languages::getCurrentLocale();

if (function_exists('collator_create') && function_exists('collator_compare')) {
    $collator = collator_create($currentLocale);
    usort($sortedCountries, fn ($a, $b) => collator_compare($collator, $a['name'], $b['name']));
} else {
    Debug::errorLog('Intl extension (PHP intl) is not enabled. Sorting by locale may not be accurate.');
    usort($sortedCountries, fn ($a, $b) => strcmp($a['name'], $b['name']));
}

$countriesoptions = '';

foreach ($sortedCountries as $country) {
    $selected = $country['code'] == $sel_country ? "selected='selected'" : '';
    $countriesoptions .= "<option value='{$country['code']}' {$selected}>{$country['name']}</option>\n";
}

tpl_set_var('countryoptions', $countriesoptions);

// cache-attributes
$cache_attribs = (isset($_POST['cache_attribs']) && ! empty($_POST['cache_attribs'])) ? mb_split(';', $_POST['cache_attribs']) : [];

// cache-attributes
$cache_attrib_list = '';
$cache_attrib_array = '';
$cache_attribs_string = '';
$cacheGpxAttribs = [];

$rs = XDb::xSql('SELECT `id`, `text_long`, `icon_undef`, `icon_large` FROM `cache_attrib`
            WHERE `language`= ? ORDER BY `category`, `id`', I18n::getCurrentLang());

while ($record = XDb::xFetchArray($rs)) {
    $cacheGpxAttribs[$record['id']] = CacheAttribute::getTrKey($record['id']);
    $line = '<img id="attr{attrib_id}" src="{attrib_pic}" alt="{attrib_text}" title="{attrib_text}" onmousedown="toggleAttr({attrib_id})"> ';
    $line = mb_ereg_replace('{attrib_id}', $record['id'], $line);
    $line = mb_ereg_replace('{attrib_text}', $record['text_long'], $line);

    if (in_array($record['id'], $cache_attribs)) {
        $line = mb_ereg_replace('{attrib_pic}', $record['icon_large'], $line);
    } else {
        $line = mb_ereg_replace('{attrib_pic}', $record['icon_undef'], $line);
    }
    $cache_attrib_list .= $line;
    $line = "new Array({id}, {selected}, '{img_undef}', '{img_large}')";
    $line = mb_ereg_replace('{id}', $record['id'], $line);

    if (in_array($record['id'], $cache_attribs)) {
        $line = mb_ereg_replace('{selected}', 1, $line);
    } else {
        $line = mb_ereg_replace('{selected}', 0, $line);
    }
    $line = mb_ereg_replace('{img_undef}', $record['icon_undef'], $line);
    $line = mb_ereg_replace('{img_large}', $record['icon_large'], $line);

    if ($cache_attrib_array != '') {
        $cache_attrib_array .= ',';
    }
    $cache_attrib_array .= $line;

    if (in_array($record['id'], $cache_attribs)) {
        if ($cache_attribs_string != '') {
            $cache_attribs_string .= ';';
        }
        $cache_attribs_string .= $record['id'];
    }
}

tpl_set_var('cache_attrib_list', $cache_attrib_list);
tpl_set_var('jsattributes_array', $cache_attrib_array);
tpl_set_var('cache_attribs', $cache_attribs_string);

$view->setVar('cacheGpxAttribs', $cacheGpxAttribs);

$reactivationRuleRadio = $_POST['reactivRules'] ?? null;

if ($reactivationRuleRadio == 'Custom rulset') {
    // custom ruleset are selected - use defined rules
    $reactivationRule = $_POST['reactivRulesCustom'] ?? '';
    $view->setVar('reactivRulesCustom', $reactivationRule);
    $view->setVar('reactivRulesRadio', 'Custom rulset');
} elseif (is_null($reactivationRuleRadio)) {
    //no options selected
    $reactivationRule = '';
    $view->setVar('reactivRulesCustom', '');
    $view->setVar('reactivRulesRadio', null);
} else {
    // some predefined option is selected
    $reactivationRule = $reactivationRuleRadio;
    $view->setVar('reactivRulesCustom', '');
    $view->setVar('reactivRulesRadio', $reactivationRuleRadio);
}

if (isset($_POST['submitform'])) {
    // check the entered data
    // Prevent binary data in cache descriptions, e.g. <img src='data:...'> tags.
    if (strlen($desc) > 300000) {
        tpl_set_var('desc_message', tr('error3KCharsExcedeed'));
    }

    // check coordinates
    if ($lat_h != '' || $lat_min != '') {
        if (! mb_ereg_match('^[0-9]{1,2}$', $lat_h)) {
            tpl_set_var('lat_message', $error_coords_not_ok);
            $lat_h_not_ok = true;
        } elseif (($lat_h >= 0) && ($lat_h < 90)) {
            $lat_h_not_ok = false;
        } else {
            tpl_set_var('lat_message', $error_coords_not_ok);
            $lat_h_not_ok = true;
        }

        $latitude = 0;

        if (is_numeric($lat_min)) {
            if (($lat_min >= 0) && ($lat_min < 60)) {
                $lat_min_not_ok = false;
                $latitude = $lat_h + round($lat_min, 3) / 60;
            } else {
                tpl_set_var('lat_message', $error_coords_not_ok);
                $lat_min_not_ok = true;
            }
        } else {
            tpl_set_var('lat_message', $error_coords_not_ok);
            $lat_min_not_ok = true;
        }

        if ($latNS == 'S') {
            $latitude = -$latitude;
        }

        if ($latitude == 0) {
            tpl_set_var('lon_message', $error_coords_not_ok);
            $lat_min_not_ok = true;
        }
    } else {
        $latitude = null;
        $lat_h_not_ok = false;
        $lat_min_not_ok = false;
    }

    if ($lon_h != '' || $lon_min != '') {
        if (! mb_ereg_match('^[0-9]{1,3}$', $lon_h)) {
            tpl_set_var('lon_message', $error_coords_not_ok);
            $lon_h_not_ok = true;
        } elseif (($lon_h >= 0) && ($lon_h < 180)) {
            $lon_h_not_ok = false;
        } else {
            tpl_set_var('lon_message', $error_coords_not_ok);
            $lon_h_not_ok = true;
        }

        $longitude = 0;

        if (is_numeric($lon_min)) {
            if (($lon_min >= 0) && ($lon_min < 60)) {
                $lon_min_not_ok = false;
                $longitude = $lon_h + round($lon_min, 3) / 60;
            } else {
                tpl_set_var('lon_message', $error_coords_not_ok);
                $lon_min_not_ok = true;
            }
        } else {
            tpl_set_var('lon_message', $error_coords_not_ok);
            $lon_min_not_ok = true;
        }

        if ($lonEW == 'W') {
            $longitude = -$longitude;
        }

        if ($longitude == 0) {
            tpl_set_var('lon_message', $error_coords_not_ok);
            $lon_min_not_ok = true;
        }
    } else {
        $longitude = null;
        $lon_h_not_ok = false;
        $lon_min_not_ok = false;
    }

    $lon_not_ok = $lon_min_not_ok || $lon_h_not_ok;
    $lat_not_ok = $lat_min_not_ok || $lat_h_not_ok;

    // check effort
    $time_not_ok = true;

    if (is_numeric($search_time) || ($search_time == '')) {
        $time_not_ok = false;
    }

    if ($time_not_ok) {
        tpl_set_var('effort_message', $time_not_ok_message);
    }
    $way_length_not_ok = true;

    if (is_numeric($way_length) || ($search_time == '')) {
        $way_length_not_ok = false;
    }

    if ($way_length_not_ok) {
        tpl_set_var('effort_message', $way_length_not_ok_message);
    }

    // check hidden_since
    $hidden_date_not_ok = true;

    if (is_numeric($hidden_day) && is_numeric($hidden_month) && is_numeric($hidden_year)) {
        $hidden_date_not_ok = (checkdate($hidden_month, $hidden_day, $hidden_year) == false);
    }

    if ($hidden_date_not_ok) {
        tpl_set_var('hidden_since_message', $date_not_ok_message);
    }

    if ($needs_approvement) {
        $activation_date_not_ok = false;
    } else {
        // check date_activate if approvement is not required
        $activation_date_not_ok = true;

        if (is_numeric($activate_day) && is_numeric($activate_month) && is_numeric($activate_year) && is_numeric($activate_hour)) {
            $activation_date_not_ok = ((checkdate($activate_month, $activate_day, $activate_year) == false) || $activate_hour < 0 || $activate_hour > 23);
        }

        if ($activation_date_not_ok == false) {
            if (! ($publish == 'now' || $publish == 'later' || $publish == 'notnow')) {
                $activation_date_not_ok = true;
            }
        }

        if ($activation_date_not_ok) {
            tpl_set_var('activate_on_message', $date_not_ok_message);
        }
    }

    // name
    if ($name == '') {
        tpl_set_var('name_message', $name_not_ok_message);
        $name_not_ok = true;
    } else {
        $name_not_ok = false;
    }

    // validate region
    if ($sel_region == '0') {
        tpl_set_var(
            'region_message',
            '<br><img src="images/misc/32x32-impressum.png" class="icon32" alt="">&nbsp;&nbsp;<span class="errormsg">' . tr('region_not_ok') . '</span>'
        );
        $region_not_ok = true;
    } else {
        $region_not_ok = false;
        tpl_set_var('region_message', '');
    }
    tpl_set_var('sel_region', $sel_region);

    // html-desc?
    $desc_html_not_ok = false;

    // cache-size
    $size_not_ok = false;

    if ($sel_size == -1) {
        tpl_set_var('size_message', $size_not_ok_message);
        $size_not_ok = true;
    }

    // cache-type
    $type_not_ok = false;

    // block forbiden cache types
    if ($sel_type == -1 || in_array($sel_type, OcConfig::getNoNewCacheOfTypesArray())) {
        tpl_set_var('type_message', $type_not_ok_message);
        $type_not_ok = true;
    }

    if ($sel_size != 7 && ($sel_type == 4 || $sel_type == 5 || $sel_type == 6)) {
        if (! $size_not_ok) {
            tpl_set_var(
                'size_message',
                '<br><img src="images/misc/32x32-impressum.png" class="icon32" alt="">&nbsp;&nbsp;<span class="errormsg">' . tr('virtual_cache_size') . '</span>'
            );
        }
        $size_not_ok = true;
    }
    // difficulty / terrain
    $diff_not_ok = false;

    if ($difficulty < 2 || $difficulty > 10 || $terrain < 2 || $terrain > 10) {
        tpl_set_var(
            'diff_message',
            '<br><img src="images/misc/32x32-impressum.png" class="icon32" alt="">&nbsp;&nbsp;<span class="errormsg">' . tr('diff_incorrect') . '</span>'
        );
        $diff_not_ok = true;
    }

    // foreign waypoints
    $all_wp_ok = true;

    foreach (['gc', 'tc'] as $wpType) {
        $wpVar = 'wp_' . $wpType;

        if (${$wpVar} != '') {
            $validatedCode = Validator::xxWaypoint($wpType, ${$wpVar});

            if ($validatedCode !== false) {
                ${$wpVar} = $validatedCode;
            } else {
                $all_wp_ok = false;
                tpl_set_var('wp_' . $wpType . '_message', tr('invalid_' . $wpVar));
            }
        }
    }
    unset($wpVar);

    // no errors?
    if (! ($name_not_ok || $hidden_date_not_ok || $activation_date_not_ok || $lon_not_ok || $lat_not_ok || $desc_html_not_ok || $time_not_ok || $way_length_not_ok || $size_not_ok || $type_not_ok || $diff_not_ok || $region_not_ok || ! $all_wp_ok)) {
        // sel_status
        $now = getdate();
        $today = mktime(0, 0, 0, $now['mon'], $now['mday'], $now['year']);
        $hidden_date = mktime(0, 0, 0, $hidden_month, $hidden_day, $hidden_year);

        if ($needs_approvement) {
            $sel_status = 4;
            $activation_date = null;
        } else {
            if (($hidden_date > $today) && ($sel_type != 6)) {
                $sel_status = 2; // currently not available
            } else {
                $sel_status = 1; // available
            }

            if ($publish == 'now') {
                $activation_date = null;
            } elseif ($publish == 'later') {
                $sel_status = 5;
                $activation_date = date('Y-m-d H:i:s', mktime($activate_hour, 0, 0, $activate_month, $activate_day, $activate_year));
            } elseif ($publish == 'notnow') {
                $sel_status = 5;
                $activation_date = null;
            } else {
                // should never happen
                $activation_date = null;
            }
        }
        $cache_uuid = Uuid::create();

        // add record to cache table
        XDb::xSql(
            'INSERT INTO `caches` SET
                        `user_id` = ?, `name` = ?, `longitude` = ?, `latitude` = ?, `last_modified` = NOW(),
                        `date_created` = NOW(), `type` = ?, `status` = ?, `country` = ?, `date_hidden` = ?, `date_activate` = ?,
                        `founds` = 0, `notfounds` = 0, `watcher` = 0, `notes` = 0, `last_found` = NULL, `size` = ?, `difficulty` = ?,
                        `terrain` = ?, `uuid` = ?, `logpw` = ?, `search_time` = ?, `way_length` = ?, `wp_gc` = ?,
                        `wp_tc` = ?, `node` = ? ',
            $loggedUser->getUserId(),
            $name,
            $longitude,
            $latitude,
            $sel_type,
            $sel_status,
            $sel_country,
            date('Y-m-d', $hidden_date),
            $activation_date,
            $sel_size,
            $difficulty,
            $terrain,
            $cache_uuid,
            $log_pw,
            $search_time,
            $way_length,
            $wp_gc,
            $wp_tc,
            OcConfig::getSiteNodeId()
        );

        $cache_id = XDb::xLastInsertId();

        // insert cache_location
        $code1 = $sel_country;

        if (I18n::isTranslationAvailable($code1)) {
            $adm1 = tr($code1);
        } else {
            Debug::errorLog("Unknown country translation: {$code1}");
            $adm1 = $code1;
        }

        // check if selected country has no districts, then use $default_region
        if ($sel_region == -1) {
            $sel_region = $default_region;
        }

        if ($sel_region != '0') {
            $code3 = $sel_region;
            $adm3 = XDb::xMultiVariableQueryValue('SELECT `name` FROM `nuts_codes`
                        WHERE `code`= :1 ', 0, $sel_region);
        } else {
            $code3 = null;
            $adm3 = null;
        }
        XDb::xSql('INSERT INTO `cache_location` (cache_id,adm1,adm3,code1,code3)
                    VALUES ( ?, ?, ?, ?, ?)', $cache_id, $adm1, $adm3, $code1, $code3);

        // update cache last modified, it is for work of cache_locations update information
        XDb::xSql('UPDATE `caches` SET `last_modified`=NOW() WHERE `cache_id`= ? ', $cache_id);

        // create waypoint
        setCacheWaypoint($cache_id, $GLOBALS['oc_waypoint']);

        $desc_uuid = Uuid::create();
        // add record to cache_desc table
        $desc = UserInputFilter::purifyHtmlString($desc);

        $db->multiVariableQuery(
            'INSERT INTO `cache_desc` (
                         `cache_id`, `language`, `desc`, `hint`,
                        `short_desc`, `last_modified`, `uuid`, `node`, `rr_comment`, `reactivation_rule` )
            VALUES (:1, :2, :3, :4, :5, NOW(), :6, :7, :8, :9)',
            $cache_id,
            $sel_lang,
            $desc,
            nl2br(htmlspecialchars($hints, ENT_COMPAT)),
            $short_desc,
            $desc_uuid,
            OcConfig::getSiteNodeId(),
            '',
            $reactivationRule
        );

        GeoCache::setCacheDefaultDescLang($cache_id);

        // insert cache-attributes
        foreach ($cache_attribs as $attr) {
            XDb::xSql('INSERT INTO `caches_attributes` (`cache_id`, `attrib_id`)
                            VALUES ( ?, ?)', $cache_id, $attr);
        }

        // add cache altitude
        $geoCache = GeoCache::fromCacheIdFactory($cache_id);
        $geoCache->updateAltitude();

        // only if no approval is needed and cache is published NOW or activate_date is in the past
        if (! $needs_approvement && ($publish == 'now' || ($publish == 'later' && mktime($activate_hour, 0, 0, $activate_month, $activate_day, $activate_year) <= $today))) {
            // do event handling
            EventHandler::cacheNew($geoCache);
        }

        if ($needs_approvement) { // notify OC-Team that new cache has to be verified
            EmailSender::sendNotifyAboutNewCacheToOcTeam(__DIR__ . '/resources/email/oc_team_notify_new_cache.email.html', ApplicationContainer::GetAuthorizedUser(), $name, $cache_id, $adm3, $adm1);
        }

        // redirection
        tpl_redirect('mycaches.php?status=' . urlencode($sel_status));
    } else {
        tpl_set_var('general_message', '<div class="warning">' . tr('error_new_cache') . '</div>');
    }
}

tpl_set_var('language4js', I18n::getCurrentLang());

tpl_BuildTemplate();

function buildCacheSizeSelector($sel_type, $sel_size): string
{
    $sizes = '<option value="-1" disabled selected="selected">' . tr('select_one') . '</option>';

    foreach (GeoCacheCommons::CacheSizesArray() as $size) {
        if (! in_array($size, OcConfig::getEnabledCacheSizesArray())) {
            continue;
        }

        if ($sel_type == GeoCacheCommons::TYPE_EVENT || $sel_type == GeoCacheCommons::TYPE_VIRTUAL || $sel_type == GeoCacheCommons::TYPE_WEBCAM) {
            if ($size == GeoCacheCommons::SIZE_NONE) {
                $sizes .= '<option value="' . $size . '" selected="selected">' . tr(GeoCacheCommons::CacheSizeTranslationKey($size)) . '</option>';
            } else {
                $sizes .= '<option value="' . $size . '">' . tr(GeoCacheCommons::CacheSizeTranslationKey($size)) . '</option>';
            }
        } elseif ($size != GeoCacheCommons::SIZE_NONE) {
            if ($size == $sel_size) {
                $sizes .= '<option value="' . $size . '" selected="selected">' . tr(GeoCacheCommons::CacheSizeTranslationKey($size)) . '</option>';
            } else {
                $sizes .= '<option value="' . $size . '">' . tr(GeoCacheCommons::CacheSizeTranslationKey($size)) . '</option>';
            }
        }
    }

    return $sizes;
}

function buildDescriptionLanguageSelector($show_all_langs, $langCode, $defaultLanguageList, $db, $show_all)
{
    tpl_set_var('show_all_langs', '0');
    tpl_set_var('show_all_langs_submit', '<input class="btn btn-default btn-sm" type="submit" name="show_all_langs_submit" value="' . $show_all . '"/>');

    if ($show_all_langs == 1) {
        tpl_set_var('show_all_langs', '1');
        tpl_set_var('show_all_langs_submit', '');

        $s = $db->simpleQuery('SELECT short FROM languages');
        $dbResult = $db->dbResultFetchAll($s);

        $defaultLanguageList = [];

        foreach ($dbResult as $langTmp) {
            $defaultLanguageList[] = $langTmp['short'];
        }
    }
    $langsoptions = '';

    foreach ($defaultLanguageList as $defLang) {
        if (strtoupper($langCode) === strtoupper($defLang)) {
            $selected = 'selected="selected"';
        } else {
            $selected = '';
        }
        $langsoptions .= '<option value="' . htmlspecialchars($defLang, ENT_COMPAT) . '" ' . $selected . ' >' . htmlspecialchars(tr('language_' . strtoupper($defLang)), ENT_COMPAT) . '</option>' . "\n";
    }
    tpl_set_var('langoptions', $langsoptions);
}

// OC waypoints generator
function generateNextWaypoint($currentWP, $ocWP): string
{
    $wpCharSequence = '0123456789ABCDEFGHJKLMNPQRSTUWXYZ';

    $wpCode = mb_substr($currentWP, 2, 4);

    if (strcasecmp($wpCode, '8000') < 0) {
        // Old rule - use hexadecimal wp codes
        $nNext = dechex(hexdec($wpCode) + 1);

        while (mb_strlen($nNext) < 4) {
            $nNext = '0' . $nNext;
        }
        $wpCode = mb_strtoupper($nNext);
    } else {
        // New rule - use digits and (almost) full latin alphabet
        // as defined in $wpCharSequence
        for ($i = 3; $i >= 0; $i--) {
            $pos = strpos($wpCharSequence, $wpCode[$i]);

            if ($pos < strlen($wpCharSequence) - 1) {
                $wpCode[$i] = $wpCharSequence[$pos + 1];
                break;
            }
            $wpCode[$i] = $wpCharSequence[0];
        }
    }

    return $ocWP . $wpCode;
}

// set a unique waypoint to this cache
function setCacheWaypoint($cacheid, $ocWP)
{
    $r['maxwp'] = XDb::xSimpleQueryValue('SELECT MAX(`wp_oc`) `maxwp` FROM `caches`', null);

    if ($r['maxwp'] == null) {
        $sWP = $ocWP . '0001';
    } else {
        $sWP = generateNextWaypoint($r['maxwp'], $ocWP);
    }

    XDb::xSql('UPDATE `caches` SET `wp_oc`= ?
        WHERE `cache_id`= ? AND ISNULL(`wp_oc`)', $sWP, $cacheid);
}
