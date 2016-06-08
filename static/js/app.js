function Brain($, marked) {
    marked.setOptions({ smartypants: true });

    var root = { id: 0 };

    var browser = [
        { node: root, children: [], selected: undefined, active: undefined },
        { node: {}, children: [], selected: undefined },
    ];
    
    var compileTimeout = 0,
        updateTimeout = 0;

    var editGroups,
        focusCycle,
        modeCycle;

    var focusInd = 0,
        modeInd = 0;

    $(document).ready(function() {
        initBrowser();
        initEdit();
        initFocus();
        initModes();
    });

    function initBrowser() {
        browser[0].el = $('.global__parent');
        browser[1].el = $('.global__child');
        
        getChildren(root.id, function(children) {
            browser[0].children = children;
            refreshBrowser(0);
            selectNode(0, 0);
        });

        var j = 106,
            k = 107,
            plus = 61,
            minus = 45,
            enter = 13,
            lbrak = 91;

        for (var level = 0; level < browser.length; level++) {
            (function(level) {
                browser[level].el.keypress(function(e) {
                    switch (e.charCode) {
                    case j:
                        scrollBrowser(level, 1);
                        break;
                    case k:
                        scrollBrowser(level, -1);
                        break;
                    case plus:
                        newNode(level);
                        break;
                    case minus:
                        if (browser[level].selected !== undefined &&
                            confirm("sure you want to delete this?"))
                            deleteNode(level);
                        break;
                    case enter:
                        if (browser[level].selected !== undefined) {
                            loadNode(level);
                        }
                        break;
                    case lbrak:
                        directoryUp();
                        break;
                    default:
                        return;
                    }    
                });
            })(level);
        }
    }

    function getNode(id, cb) {
        $.ajax({
            method: 'POST',
            url: 'data/getnode',
            dataType: 'json',
            data : JSON.stringify({ id: id }),
        }).done(function(msg) {
            cb(msg.node);
        });
    }

    function getChildren(parentId, cb) {
        $.ajax({
            method: 'POST',
            url: 'data/getchildren',
            dataType: 'json',
            data : JSON.stringify({ parentId: parentId }),
        }).done(function(msg) {
            cb(msg.children);
        });
    }

    function updateNode(data) {
        var b = browser[1];
        if (!b.node.id) return;
        
        for (k in data) {
            b.node[k] = data[k];
        }
        if (data.title) {
            b.node.el.text(data.title);
        }
        
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(function() {
            $.ajax({
                method: 'POST',
                url: 'data/updatenode',
                dataType: 'json',
                data : JSON.stringify({ node: b.node }),
            });
        }, 1000);
    }

    function deleteNode(level) {
        var b = browser[level];
        $.ajax({
            method: 'POST',
            url: 'data/deletenode',
            dataType: 'json',
            data : JSON.stringify({ id: b.children[b.selected].id }),
        }).done(function() {
            getChildren(b.node.id, function(children) {
                if (level === 0) {
                    if (children.length === 0) {
                        directoryUp();
                        return;
                    }
                    
                    if (b.active === b.selected) {
                        browser[1].node = {};
                        browser[1].children = [];
                        refreshBrowser(1);
                        b.active = undefined;
                    }
                }
                
                b.children = children;
                refreshBrowser(level);
                if (children.length > 0) {
                    selectNode(level, 0);
                } else {
                    b.selected = undefined;
                }
            });
        });
    }

    function newNode(level) {
        if (browser[level].node.id === undefined) {
            return;
        }
        
        $.ajax({
            method: 'POST',
            url: 'data/newnode',
            dataType: 'json',
            data : JSON.stringify({ parentId: browser[level].node.id }),
        }).done(function(msg) {
            var node = msg.node;
            browser[level].children.unshift(node);
            if (browser[level].selected !== undefined)
                browser[level].selected++;
            if (browser[level].active !== undefined)
                browser[level].active++;
            prependNode(level, node);
            selectNode(level, 0);
            loadNode(level);
        });
    }

    function prependNode(level, node) {
        node.el = $('<li></li>').text(node.title)
            .addClass('node-' + node.id)
            .prependTo(browser[level].el);
    }

    function selectNode(level, selection) {
        var b = browser[level];
        b.el.find("li").removeClass('selected');
        b.children[selection].el.addClass('selected');
        b.selected = selection;
    }

    function refreshBrowser(level) {
        var b = browser[level];
        b.el.find('li').remove();
        for (var i = b.children.length - 1; i >= 0 ; i--) {
            prependNode(level, b.children[i]);
        }

        if (level === 0) {
            b.active = undefined;
        }

        if (level === 1) {
            $('.edit__title').val(b.node.title).show();
            $('.edit__tag').val(b.node.tag).hide();
            $('.edit__content').val(b.node.content).show();
            $('.edit__preamble').val(b.node.preamble).hide();
            compile();
        }
    }
    
    function scrollBrowser(level, dir) {
        var b = browser[level];
        if (b.selected === undefined)
            return;
        selectNode(
            level,
            (b.selected + dir + b.children.length) % b.children.length
        );
    }

    function browserClone(from, to) {
        for (k in browser[from]) {
            if (k != "el")
                browser[to][k] = browser[from][k];
        }
    }

    function activateSelectedNode() {
        var b0 = browser[0];
        if (b0.active !== undefined)
            b0.children[b0.active].el.removeClass("active");
        b0.children[b0.selected].el.addClass("active");
        b0.active = b0.selected;
    }
    
    function loadNode(level) {
        var b0 = browser[0],
            b1 = browser[1];

        if (level === 1) {
            browserClone(1, 0);
            refreshBrowser(0);
            selectNode(0, b0.selected);
        } else if (b0.active === b0.selected) {
            return;
        }

        b1.node = b0.children[b0.selected];
        activateSelectedNode();
        switchFocusTo(0);

        getChildren(b1.node.id, function(children) {
            b1.children = children;
            refreshBrowser(1);
            if (children.length > 0) {
                selectNode(1, 0);
            } else {
                b1.selected = undefined;
            }
        });
    }

    function directoryUp() {
        var b0 = browser[0], b1 = browser[1];
        if (b0.node.id === root.id) {
            b1.node = {};
            b1.children = [];
            refreshBrowser(1);
            refreshBrowser(0);
            selectNode(0, b0.selected);
            return;
        }

        browserClone(0, 1);
        refreshBrowser(1);
        selectNode(1, b0.selected);

        var parentId = b0.node.parentId;        
        if (parentId === root.id) {
            b0.node = root;
        } else {
            getNode(parentId, function(node) {
                b0.node = node;
            });
        }
        
        getChildren(parentId, function(children) {
            b0.children = children;
            refreshBrowser(0);
            for (var i = 0; i < children.length; i++)
                if (children[i].id === b1.node.id) {
                    selectNode(0, i);
                    break;
                }
            activateSelectedNode();
        });
    }

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

    function initEdit() {
        $('.edit__title').on('input', function(e) {
            updateNode({ title: e.target.value });
            compile();
        });
        $('.edit__tag').on('input', function(e) {
            updateNode({ tag: e.target.value });
            compile();
        });
        $('.edit__content').on('input', function(e) {
            updateNode({ content: e.target.value });
            compile();
        });
        $('.edit__preamble').on('input', function(e) {
            updateNode({ preamble: e.target.value });
            compile();
        });

        var ctrli = 9,
            ctrlu = 21;

        editGroups = [
            { vis: $('.edit__title'), hid: $('.edit__tag') },
            { vis: $('.edit__content'), hid: $('.edit__preamble') },
        ];

        for (var i = 0; i < editGroups.length; i++) {
            (function(i) {
                $.each(editGroups[i], function(k,v) {
                    v.keypress(function(e) {
                        if (e.ctrlKey) {
                            switch (e.charCode) {
                            case ctrlu:
                                editGroups[i ^ 1].vis.focus();
                                break;
                            case ctrli:
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
            {   // global__parent
                visible: true,
                focus: function() { $('.global__parent').focus(); }
            },
            {   // global__child
                visible: true,
                focus: function() { $('.global__child').focus(); }
            },
            {   // site__edit
                visible: false,
                focus: function() { editGroups[1].vis.focus(); }
            },
        ];

        focusCycle[focusInd].focus();

        var ctrlc = 3;
        $('.site').keypress(function(e) {
            if (e.ctrlKey && e.charCode === ctrlc) {
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
                $.each([$('.site__edit'), $('.site__view')], function(i, o) {
                    o.removeClass('grid__col-2-4').addClass('grid__col-3-4');
                });

                $('.site__global').show();
                $('.site__view').show();
                $('.site__edit').hide();

                focusCycle[0].visible = focusCycle[1].visible = true;
                focusCycle[2].visible = false;
                if (focusInd == 2) switchFocus();
            },
            // browse + edit
            function() {
                $.each([$('.site__edit'), $('.site__view')], function(i, o) {
                    o.removeClass('grid__col-2-4').addClass('grid__col-3-4');
                });

                $('.site__global').show();
                $('.site__view').hide();
                $('.site__edit').show();

                focusCycle[0].visible = focusCycle[1].visible = true;
                focusCycle[2].visible = true;
            },
            // edit + view
            function() {
                $.each([$('.site__edit'), $('.site__view')], function(i, o) {
                    o.removeClass('grid__col-3-4').addClass('grid__col-2-4');
                    o.show();
                });

                $('.site__global').hide();
                $('.site__view').show();
                $('.site__edit').show();

                focusCycle[0].visible = focusCycle[1].visible = false;
                focusCycle[2].visible = true;
                if (focusInd == 0 || focusInd == 1) switchFocus();
            },
        ];

        modeCycle[modeInd]();

        var ctrlm = 13;
        $('.site').keypress(function(e) {
            if (e.ctrlKey && e.charCode === ctrlm) {
                switchMode();
                e.preventDefault();
            }
        });
    }

    
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

Brain.prototype.toTag = function(tag) {
    var top = $('.site__view').scrollTop();
    var delta = $('#' + tag).offset().top - $('.site__view').offset().top
    $('.site__view').scrollTop(top + delta);
}

var brain = new Brain(jQuery, marked);
