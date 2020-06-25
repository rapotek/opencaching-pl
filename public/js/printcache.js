 $( document ).ready(function() {
    var showlogs = $("#showlogs").val();
    if(showlogs == ''){
    } else if(showlogs == '&showlogs=4') {
        loadLogEntries(0,4);
    } else if (showlogs == '&showlogsall=y'){
        loadLogEntries(0,9999);
    }
});

function loadLogEntries(offset, limit, cacheId = null, targetId = null){
    var owner_id = $("#owner_id").val();
    var geocacheId = cacheId ? cacheId : $("#cacheid").val();
    var target = targetId ? targetId : "viewcache-logs";

    request = $.ajax({
        url: "getLogEntries.php",
        type: "post",
        data:{
                offset: offset,
                limit: limit,
                geocacheId: geocacheId,
                owner_id: owner_id,
                includeDeletedLogs: $('#includeDeletedLogs').val()
        }
    });
    request.done(function (response, textStatus, jqXHR){
        $("#" + target).html($("#" + target).html() + response);
    });
}
