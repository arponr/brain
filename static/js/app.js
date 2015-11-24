var Brain = {};
Brain.debug = true;

////////////////////////////////////////////////////////////////////////////////

Brain.Util = {};

Brain.Util.unJQuery = function(f) {
    return function(el) { f(el instanceof jQuery ? el[0] : el); }
};

Brain.Util.jax = Brain.Util.unJQuery(function (el) {
    MathJax.Hub.Typeset(el);
});

Brain.Util.reCensor = /\$\$[^\$]+\$\$|\$[^\$]+\$/gm;
Brain.Util.reUncensor = /\$(\d+)\$/gm;
Brain.Util.reNumSec = /^(#+)(.*)@([\w|-]+)/gm;
Brain.Util.reRef = /@([\w|-]+)/gm;

Brain.Util.texdown = function(text) {
    var math = [];
    var tags = {};
    var sec = [0, 0, 0, 0, 0, 0];
    var secDepth = 0;
    function genLabel() {
        var label = "";
        for (var i = 0; i <= secDepth; i++) {
            label += sec[i] + ".";
        }
        return label;
    }
    function replNumSec(match, hash, title, tag, offset, string) {
        var depth = hash.length - 1;
        sec[depth]++;
        for (var i = depth + 1; i <= secDepth; i++) {
            sec[i] = 0;
        }
        secDepth = depth;
        var label = genLabel(depth);
        tags[tag] = label.slice(0, -1);
        var link = '<a id="' + tag + '"></a>';
        return [hash, label, title, link].join(" ");
    }
    function replRef(match, tag, offset, string) {
        return "(" + tags[tag] + ")";
    }
    function replUncensor(match, ind, offset, string) {
        return math[parseInt(ind)];
    }
    function replCensor(match) {
        math.push(match);
        return "$" + (math.length - 1).toString() + "$";
    }
    function replUncensor(m, i, o, s) {
        return math[parseInt(i)];
    }
    labeled = text.replace(Brain.Util.reNumSec, replNumSec);
    refed = labeled.replace(Brain.Util.reRef, replRef);
    censored = refed.replace(Brain.Util.reCensor, replCensor);
    html = marked(censored);
    return html.replace(Brain.Util.reUncensor, replUncensor);
};

////////////////////////////////////////////////////////////////////////////////

function clone(obj) {
    return $.extend(true, {}, obj);
}
    
////////////////////////////////////////////////////////////////////////////////


Brain.UI = function() {
    var ui = this;
    var root = { id: 0 };
    
    $(document).ready(function() {
        $('.menu__new-parent').click(parentNewNode);
        $('.menu__new-child').click(childNewNode);
        $('.menu__back').click(directoryUp);
        $('.menu__browse').click(function() {
            $('.site__global').show();
            $('.site__edit').hide();
        });
        $('.menu__edit').click(function() {
            $('.site__global').hide();
            $('.site__edit').show();
        });
        $('.menu__delete').click(deleteNode);
        
        ui.compileTimeout = 0;
        ui.updateTimeout = 0;
        
        $('.edit__title').on('input', function(e) {
            updateNode({ title: e.target.value });
            compile();
        });
        $('.edit__preamble').on('input', function(e) {
            updateNode({ preamble: e.target.value });
            compile();
        });
        $('.edit__content').on('input', function(e) {
            updateNode({ content: e.target.value });
            compile();
        });
        
        ui.parent = { node: root, children: [] }
        ui.child = { node: {}, children: [] };
        getChildren(root.id, function(children) {
            ui.parent.children = children;
            parentRefresh();
        });
    });

    function compile() {
        clearTimeout(ui.compileTimeout);
        ui.compileTimeout = setTimeout(function() {
            var scroll = $('.site__view').scrollTop();
            $('.begingroup').html("$\\begingroup$");
            $('.endgroup').html("$\\endgroup$");
            $('.view__title')
                .text($('.edit__title').val());
            var preamble = $('.edit__preamble').val();
            preamble = $.trim(preamble) ? ("$" + preamble + "$") : "";
            $('.view__preamble').text(preamble);
            $('.view__content')
                .html(Brain.Util.texdown($('.edit__content').val()));
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, $('.site__view')[0]]);
            MathJax.Hub.Queue(function() {
                $('.site__view').scrollTop(scroll);
            });
        }, 1000);
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
        var node = ui.child.node;
        if (!node.id) return;
        for (k in data) {
            node[k] = data[k];
        }
        clearTimeout(ui.updateTimeout);
        ui.updateTimeout = setTimeout(function() {
            $.ajax({
                method: 'POST',
                url: 'data/updatenode',
                dataType: 'json',
                data : JSON.stringify({ node: node }),
            }).done(function() {
                $('.node-' + node.id).text(node.title);
            });
        }, 1000);
    }

    function deleteNode() {
        $.ajax({
            method: 'POST',
            url: 'data/deletenode',
            dataType: 'json',
            data : JSON.stringify({ id: ui.child.node.id }),
        }).done(function() {
            getChildren(ui.parent.node.id, function(children) {
                ui.parent.children = children;
                directoryUp();
            });
        });
    }

    function activateNode(id) {
        $('.global__parent li').removeClass("active");
        $('.node-' + id).addClass("active");
    }
    
    function parentAppend(node) {
        $('<li></li>').text(node.title)
            .addClass('node-' + node.id)
            .appendTo('.global__parent')
            .click(function() {
                ui.child.node = node;
                activateNode(node.id)
                getChildren(node.id, function(children) {
                    ui.child.children = children;
                    childRefresh();
                });
            });
    }
    
    function childAppend(node) {
        $('<li></li>').text(node.title)
            .addClass('node-' + node.id)
            .appendTo('.global__child')
            .click(function() {
                ui.parent = clone(ui.child);
                parentRefresh();
                
                ui.child.node = node;
                activateNode(node.id)
                getChildren(node.id, function(children) {
                    ui.child.children = children;
                    childRefresh();
                });
            });
    }

    function directoryUp() {
        if (ui.parent.node.id === root.id) {
            ui.child = { node: {}, children: [] }
            childRefresh();
            parentRefresh();
            return;
        }
        
        ui.child = clone(ui.parent);
        childRefresh();

        var parentId = ui.parent.node.parentId;        
        if (parentId === root.id) {
            ui.parent.node = root;
        } else {
            getNode(parentId, function(node) {
                ui.parent.node = node;
            });
        }
        
        getChildren(parentId, function(children) {
            ui.parent.children = children;
            parentRefresh();
            activateNode(ui.child.node.id);
        });
    }
    
    function parentNewNode() {
        $.ajax({
            method: 'POST',
            url: 'data/newnode',
            dataType: 'json',
            data : JSON.stringify({ parentId: ui.parent.node.id }),
        }).done(function(msg) {
            var node = msg.node;
            ui.parent.children.push(node);
            parentAppend(node);
        });
    }

    function childNewNode() {
        $.ajax({
            method: 'POST',
            url: 'data/newnode',
            dataType: 'json',
            data : JSON.stringify({ parentId: ui.child.node.id }),
        }).done(function(msg) {
            var node = msg.node;
            ui.child.children.push(node);
            childAppend(node);
        });
    }

    function parentRefresh() {
        $('.global__parent').empty();
        for (var i = 0; i < ui.parent.children.length; i++) {
            parentAppend(ui.parent.children[i]);
        }
    }
    
    function childRefresh() {
        $('.edit__title').val(ui.child.node.title);
        $('.edit__preamble').val(ui.child.node.preamble);
        $('.edit__content').val(ui.child.node.content);
        compile();

        $('.global__child').empty();
        for (var i = 0; i < ui.child.children.length; i++) {
            childAppend(ui.child.children[i]);
        }
    }
};

////////////////////////////////////////////////////////////////////////////////

ui = new Brain.UI;
