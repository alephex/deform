/* 
 * Register a top-level callback to the deform.load() function 
 * this will be called when the DOM has finished loading. No need
 * to include the call at the end of the page.
 */

$(document).ready(function(){
    deform.load();
});


var deform_loaded = false;

var deform  = {
    callbacks: [],

    addCallback: function (oid, callback) {
        deform.callbacks.push([oid, callback]);
    },

    clearCallbacks: function () {
        deform.callbacks = [];
    },

    load: function() {
      $(function() {
        if (!deform_loaded) {
            deform.processCallbacks();
            deform.focusFirstInput();
            deform_loaded = true;
      }});
    },
            

    processCallbacks: function () {
        $(deform.callbacks).each(function(num, item) {
            var oid = item[0];
            var callback = item[1];
            callback(oid);
            }
            );
        deform.clearCallbacks();
    },

    addSequenceItem: function (protonode, before) {
        // - Clone the prototype node and add it before the "before" node.
        //   Also ensure any callbacks are run for the widget.

        // In order to avoid breaking accessibility:
        //
        // - Find each tag within the prototype node with an id
        //   that has the string ``deformField(\d+)`` within it, and modify 
        //   its id to have a random component.
        // - For each label referencing an change id, change the label's
        //   for attribute to the new id.

        var fieldmatch = /deformField(\d+)/;
        var namematch = /(.+)?-[#]{3}/;
        var code = protonode.attr('prototype');
        var html = decodeURIComponent(code);
        var $htmlnode = $(html);
        var $idnodes = $htmlnode.find('[id]');
        var $namednodes = $htmlnode.find('[name]');
        var genid = deform.randomString(6);
        var idmap = {};

        // replace ids containing ``deformField`` and associated label for= 
        // items which point at them

        $idnodes.each(function(idx, node) {
            var $node = $(node);
            var oldid = $node.attr('id');
            var newid = oldid.replace(fieldmatch, "deformField$1-" + genid);
            $node.attr('id', newid);
            idmap[oldid] = newid;
            var labelselector = 'label[for=' + oldid + ']';
            var $fornodes = $htmlnode.find(labelselector);
            $fornodes.attr('for', newid);
            });

        // replace names a containing ```deformField`` like we do for ids

        $namednodes.each(function(idx, node) {
            var $node = $(node);
            var oldname = $node.attr('name');
            var newname = oldname.replace(fieldmatch, "deformField$1-" + genid);
            $node.attr('name', newname);
            });

        $htmlnode.insertBefore(before);

        $(deform.callbacks).each(function(num, item) {
            var oid = item[0];
            var callback = item[1];
            var newid = idmap[oid];
            if (newid) { 
                callback(newid);
                }
            });

        deform.clearCallbacks();
        var old_len = parseInt(before.attr('now_len')||'0', 10);
        before.attr('now_len', old_len + 1);
        // we added something to the dom, trigger a change event
        var e = jQuery.Event("change");
        $('#deform').trigger(e);
    },

    appendSequenceItem: function(node) {
        var $oid_node = $(node).closest('.deform-seq');
        var $proto_node = $oid_node.find('.deform-proto').first();
        var $before_node = $oid_node.find('.deform-insert-before').last();
        var min_len = parseInt($before_node.attr('min_len')||'0', 10);
        var max_len = parseInt($before_node.attr('max_len')||'9999', 10);
        var now_len = parseInt($before_node.attr('now_len')||'0', 10);
        var orderable = parseInt($before_node.attr('orderable')||'0', 10);
  
        if (now_len < max_len) {
          deform.addSequenceItem($proto_node, $before_node);
            deform.processSequenceButtons($oid_node, min_len, max_len, 
                                          now_len + 1, orderable);
        }
        return false;
    },

    removeSequenceItem: function(clicked) {
        var $item_node = $(clicked).closest('.deform-seq-item');
        var $oid_node = $item_node.closest('.deform-seq');
        var $before_node = $oid_node.find('.deform-insert-before').last();
        var min_len = parseInt($before_node.attr('min_len')||'0', 10);
        var max_len = parseInt($before_node.attr('max_len')||'9999', 10);
        var now_len = parseInt($before_node.attr('now_len')||'0', 10);
        var orderable = parseInt($before_node.attr('orderable')||'0', 10);
        if (now_len > min_len) {
            $before_node.attr('now_len', now_len - 1);
            $item_node.remove();
            deform.processSequenceButtons($oid_node, min_len, max_len, 
                                          now_len-1, orderable);
        }
        // we removed something from the dom, trigger a change event
        var e = jQuery.Event("change");
        $('#deform').trigger(e);
        return false;
    },

    processSequenceButtons: function(oid_node, min_len, max_len, now_len,
                                     orderable) {
        orderable = !!orderable; // convert to bool
        var has_multiple = now_len > 1;
        var $ul = oid_node.find('.deform-seq-container').not(oid_node.find('.deform-seq-container .deform-seq-container'));
        var $lis = $ul.find('.deform-seq-item').not($ul.find('.deform-seq-container .deform-seq-item'));
        var show_closebutton = now_len > min_len;
        var show_addbutton = now_len < max_len;
        $lis.find('.deform-close-button').not($lis.find('.deform-seq-container .deform-close-button')).toggle(show_closebutton);
        oid_node.find('.deform-seq-add').not(oid_node.find('.deform-seq-container .deform-seq-add')).toggle(show_addbutton);
        $lis.find('.deform-order-button').not($lis.find('.deform-seq-container .deform-order-button')).toggle(orderable && has_multiple);
     },

    focusFirstInput: function (el) {
        /* If the first form on the page has its data-deform-focus-form 
         * attribute set to 'auto', the first child input will be focused. If 
         * the attribute is set to 'manual', the first child input with its 
         * data-deform-manual-focus attribute set will be focused. Otherwise, no 
         * focusing will be performed. */
        el = el || document.body;

        /* Select the first form which does not have data-deform-focus-form=off */
        var form = $(el).find('form').filter('[data-deform-focus-form != off]').first();

        if(form) {
            if($(form).attr('data-deform-focus-form') == 'manual') {
                /* Focus on the first input with data-deform-manual-focus set */
                var input = $(form).find(':input')
                    .filter('[id ^= deformField]')
                    .filter('[type != hidden]')
                    .filter('[data-deform-manual-focus = "on"]')
                    .first();
                if (input) {
                    var raw = input.get(0);
                    if (raw) {
                        if (raw.type === 'text' || raw.type === 'file' || 
                            raw.type == 'password' || raw.type == 'text' || 
                            raw.type == 'textarea') { 
                                if (!input.hasClass("hasDatepicker")) {
                                    input.focus();
                                    return;
                                }
                        }
                    }
                }
            } else {
                /* Focus on the first element of this form (i.e. data-deform-focus-form=='auto') */
                var input = $(form).find(':input')
                    .filter('[id ^= deformField]')
                    .filter('[type != hidden]')
                    .first();
                if (input) {
                    var raw = input.get(0);
                    if (raw) {
                        if (raw.type === 'text' || raw.type === 'file' || 
                            raw.type == 'password' || raw.type == 'text' || 
                            raw.type == 'textarea') { 
                                if (!input.hasClass("hasDatepicker")) {
                                    input.focus();
                                    return;
                                }
                        }
                    }
                }
            }
        }

    },

    randomString: function (length) {
        var chr='0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz';
        chr = chr.split('');
    
        if (! length) {
            length = Math.floor(Math.random() * chr.length);
        }
    
        var str = '';
        for (var i = 0; i < length; i++) {
            str += chr[Math.floor(Math.random() * chr.length)];
        }
        return str;
    }

};
