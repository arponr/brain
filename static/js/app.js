function Brain($, marked) {

    var debug = true;

    // ----------------------------------------------------------------------
    
    var ws;
    $(document).ready(function() {
        ws = new WebSocket(
            (location.protocol === "https:" ? "wss://" : "ws://") + location.host + '/socket');
	ws.onopen = function() {
	    initTerm();
	};
	ws.onclose = function() {
	    // shutdown terminal
	};
	ws.onmessage = onMessage;
                
        initEdit();
        initFocus();
        initModes();
    });

    function send(m) {
        if (debug) console.log('<', m)
        ws.send(JSON.stringify(m));
    }

    function onMessage(d) {
        var m = JSON.parse(d.data);
        if (debug) console.log('>', m)
        switch (m.Action) {
        case 'cd':
            loadNode(m.Node);
            break;
        case 'rm':
            clearNode();
            break;
        case 'results':
            echoTerm(m.Id, m.Results);
            break;
        }
    }

    function loadNode(node) {
        $('.edit__tag').val(node.Tag).hide();
        $('.edit__title').val(node.Title).show();
        $('.edit__preamble').val(node.Preamble).hide();
        $('.edit__content').val(node.Content).show();
        compile();
    }

    var updateTimeout;
    function updateNode() {
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(function() {  
            send({
                Id: 0,
                Action: "update",
                Node: {
                    Tag: $('.edit__tag').val(),
                    Title: $('.edit__title').val(),
                    Preamble: $('.edit__preamble').val(),
                    Content: $('.edit__content').val(),
                },
            });
        }, 1000);
    }

    function clearNode() {
        $.each([
            $('.edit__tag'),
            $('.edit__title'),
            $('.edit__preamble'),
            $('.edit__content'),
        ], function(i, v) {
            v.val('');
        });
        $.each([
            $('.begingroup'),
            $('.view__title'),
            $('.view__preamble'),
            $('.view__content'),
            $('.endgroup'),
        ], function(i, v) {
            v.html('');
        });
    }

    // ----------------------------------------------------------------------

    var termInd;
    
    function clearTerm() {
        $('.term__output').html('');
        $('.input__cmd').val('');
    }

    function echoTerm(ind, val) {
        $('.entry-'+ind + ' .output__results').text(val);
    }
    
    function iterateTerm() {
        var outputEntry =  $('<div>')
            .addClass('term__entry').addClass('entry-'+termInd);
        $('<div>')
            .addClass('output__prompt')
            .text('>')
            .appendTo(outputEntry);
        $('<div>')
            .addClass('output__cmd')
            .text($('.input__cmd').val())
            .appendTo(outputEntry);
        $('<div>')
            .addClass('output__results')
            .appendTo(outputEntry);
        $('.term__output').append(outputEntry)

        $('.input__cmd').val('');
        termInd++;
    }

    function interpretTerm() {
        var input = $('.input__cmd').val();
        
        if (input.trim() === 'clear') {
            clearTerm();
            return;
        }

        var cmd = input.match(/\S+/g)
        if (cmd) {
            var action = cmd[0];
            var flags = [];
            var args = [];
            for (var i = 1; i < cmd.length; i++) {
                if (cmd[i].startsWith('--')) {
                    flags.push(cmd[i].substring(2));
                } else {
                    args.push(cmd[i]);
                }
            }
            send({
                Id: termInd,
                Action: action,
                Flags: flags,
                Args: args,
            });
        }

        iterateTerm();
    }
    
    function initTerm() {
        termInd = 0;
        $('.input__prompt').text('>');
        $('.term__input .term__entry').addClass('entry-'+termInd);
        termInd++;
        
        $('.term__input').keypress(function(e) {
            // console.log(e.keyCode);
            // enter key (and not ctrl+m)
            if (e.keyCode === 13 && !e.ctrlKey) {
                interpretTerm();
                e.preventDefault();
            }
        });
    }

    // ----------------------------------------------------------------------
    
    var compileTimeout;
    function compile() {
        clearTimeout(compileTimeout);
        compileTimeout = setTimeout(function() {
            var scroll = $('.site__view').scrollTop();
            
            $('.begingroup').html("$\\begingroup$");
            $('.endgroup').html("$\\endgroup$");
            
            $('.view__title').text($('.edit__title').val());
            
            var preamble = $('.edit__preamble').val();
            preamble = $.trim(preamble) ? ("$" + preamble + "$") : "";
            $('.view__preamble').text(preamble);
            
            $('.view__content').html(texdown($('.edit__content').val()));
            
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, $('.site__view')[0]]);
            MathJax.Hub.Queue(function() {
                $('.site__view').scrollTop(scroll);
            });
        }, 1000);
    }

    var editGroups;
    function initEdit() {
        editGroups = [
            { vis: $('.edit__title'), hid: $('.edit__tag') },
            { vis: $('.edit__content'), hid: $('.edit__preamble') },
        ];

        for (var i = 0; i < editGroups.length; i++) {
            (function(i) {
                $.each(editGroups[i], function(k,v) {
                    v.on('input', function(e) {
                        updateNode();
                        compile();
                    });
                    v.keypress(function(e) {
                        if (e.ctrlKey) {
                            switch (e.keyCode) {
                            case 9: // ctrl+u
                                editGroups[i ^ 1].vis.focus();
                                break;
                            case 21: // ctrl+i
                                editGroups[i].vis.hide()
                                editGroups[i].hid.show().focus()
                                var t = editGroups[i].vis;
                                editGroups[i].vis = editGroups[i].hid;
                                editGroups[i].hid = t;
                                break;
                            default:
                                return;
                            }
                        }    
                    });
                });
            })(i);
        }
    }

    // ----------------------------------------------------------------------
    
    var focusInd,
        modeInd,
        focusCycle,
        modeCycle;

    function switchFocusTo(ind) {
        if (!focusCycle[focusInd].visible) {
            return;
        }
        focusInd = ind;
        focusCycle[focusInd].focus();
    }
    
    function switchFocus() {
        do {
            focusInd = (focusInd + 1) % focusCycle.length;
        } while (!focusCycle[focusInd].visible);
        focusCycle[focusInd].focus();
    }
    
    function initFocus() {
        $('.focusable, .focusable *').focus(function() {
            o = $(this).closest('.focusable');
            if (o.css('border-top-width') === '0px') {
                o.css({
                    'border-top': '3px solid #ee9944',
                    'padding-top': '-=3px',
                });
            }
        }).blur(function() {
            o = $(this).closest('.focusable');
            if (o.css('border-top-width') !== '0px') {
                o.css({
                    'border-top': 'none',
                    'padding-top': '+=3px',
                });
            }
        });
        
        focusCycle = [
            {   // site__global
                visible: true,
                focus: function() { $('.input__cmd').focus(); }
            },
            {   // site__edit
                visible: false,
                focus: function() { editGroups[1].vis.focus(); }
            },
        ];

        focusInd = 0;
        focusCycle[focusInd].focus();

        $('.site').keypress(function(e) {
            // ctrl+c
            if (e.ctrlKey && e.charCode === 3) {
                switchFocus();
                e.preventDefault();
            }
        });
    }

    function switchMode() {
        modeInd = (modeInd + 1) % modeCycle.length;
        modeCycle[modeInd]();
    }

    function initModes() {
        modeCycle = [
            // browse + view
            function() {
                // $.each([$('.site__edit'), $('.site__view')], function(i, o) {
                //     o.removeClass('grid__col-2-4').addClass('grid__col-3-4');
                // });

                $('.site__global').show();
                $('.site__view').show();
                $('.site__edit').hide();

                focusCycle[0].visible = true;
                focusCycle[1].visible = false;
                if (focusInd === 1) switchFocus();
            },
            // browse + edit
            function() {
                // $.each([$('.site__edit'), $('.site__view')], function(i, o) {
                //     o.removeClass('grid__col-2-4').addClass('grid__col-3-4');
                // });

                $('.site__global').show();
                $('.site__view').hide();
                $('.site__edit').show();

                focusCycle[0].visible = true;
                focusCycle[1].visible = true;
            },
            // edit + view
            function() {
                // $.each([$('.site__edit'), $('.site__view')], function(i, o) {
                //     o.removeClass('grid__col-3-4').addClass('grid__col-2-4');
                //     o.show();
                // });

                $('.site__global').hide();
                $('.site__view').show();
                $('.site__edit').show();

                focusCycle[0].visible = false;
                focusCycle[1].visible = true;
                if (focusInd === 0) switchFocus();
            },
        ];

        modeInd = 0;
        modeCycle[modeInd]();

        $('.site').keypress(function(e) {
            // ctrl+v
            if (e.ctrlKey && e.keyCode === 22) {
                switchMode();
                e.preventDefault();
            }
        });
    }

    // ----------------------------------------------------------------------
    
    marked.setOptions({ smartypants: true });
    
    function texdown(text) {
        var math = [];
        var tags = {};
        var sec = [];

        // detect sections to be labeled
        var reNumSec = /^(#+)(.*)@([\w|-]+)/gm;
        function replNumSec(match, hash, title, tag, offset, string) {
            var depth = hash.length - 1;
            
            sec.splice(depth + 1, sec.length);
            for (var i = sec.length; i <= depth; i++) {
                sec.push(0);
            }
            sec[depth]++;
            
            var label = sec.join(".");
            tags[tag] = label;
            var link = '<a id="' + tag + '"></a>';
            return [hash, link, label + ".", title].join(" ");
        }

        // detects internal references
        var reRef = /@([\w|-]+)/gm;
        function replRef(match, tag, offset, string) {
            return "<a onclick=\"brain.toTag('" + tag + "')\">(" + tags[tag] + ")</a>";
        }
        
        // detects latex to be censored/saved before markdown parsing
        var reCensor = /\$\$[^\$]+\$\$|\$[^\$]+\$/gm;
        function replCensor(match) {
            math.push(match);
            return "$" + (math.length - 1).toString() + "$";
        }
        
        // detects censored latex to be refilled after markdown parsing
        var reUncensor = /\$(\d+)\$/gm;
        function replUncensor(match, ind, offset, string) {
            return math[parseInt(ind)];
        }
        
        return marked(
            text.replace(reNumSec, replNumSec)
                .replace(reRef, replRef)
                .replace(reCensor, replCensor)
        ).replace(reUncensor, replUncensor);
            
    }
}


var brain = new Brain(jQuery, marked);
