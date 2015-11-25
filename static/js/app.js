(function($, markdown) {
    var root = { id: 0 };
    var parent = { node: root, children: [] }
    var child = { node: {}, children: [] };
    var compileTimeout = 0;
    var updateTimeout = 0;

    $(document).ready(function() {
        initUI();

        getChildren(root.id, function(children) {
            parent.children = children;
            parentRefresh();
        });
    });

    function initUI() {
        $('.parent__new').click(parentNewNode);
        $('.child__new').click(childNewNode);
        $('.menu__back').click(directoryUp);
        $('.menu__edit').click(function() {
            $('.site__global').toggle();
            $('.site__edit').toggle();
        });
        $('.menu__delete').click(deleteNode);

        $('.meta__switch').click(function() {
            $('.edit__title').toggle();
            $('.edit__tag').toggle();
        });
        $('.main__switch').click(function() {
            $('.edit__content').toggle();
            $('.edit__preamble').toggle();
        });
        
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
        if (!child.node.id) return;
        
        for (k in data) {
            child.node[k] = data[k];
        }
        
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(function() {
            $.ajax({
                method: 'POST',
                url: 'data/updatenode',
                dataType: 'json',
                data : JSON.stringify({ node: child.node }),
            }).done(function() {
                $('.node-' + child.node.id).text(child.node.title);
            });
        }, 1000);
    }

    function deleteNode() {
        if (!child.node.id) return;
        
        $.ajax({
            method: 'POST',
            url: 'data/deletenode',
            dataType: 'json',
            data : JSON.stringify({ id: child.node.id }),
        }).done(function() {
            getChildren(parent.node.id, function(children) {
                parent.children = children;
                directoryUp();
            });
        });
    }

    function activateNode(id) {
        $('.global__parent li').removeClass("active");
        $('.node-' + id).addClass("active");
    }

    function parentPrepend(node) {
        $('<li></li>').text(node.title)
            .addClass('node-' + node.id)
            .prependTo('.global__parent')
            .click(function() {
                child.node = node;
                activateNode(node.id)
                getChildren(node.id, function(children) {
                    child.children = children;
                    childRefresh();
                });
            });
    }

    function childPrepend(node) {
        $('<li></li>').text(node.title)
            .addClass('node-' + node.id)
            .prependTo('.global__child')
            .click(function() {
                parent = clone(child);
                parentRefresh();
                
                child.node = node;
                activateNode(node.id)
                getChildren(node.id, function(children) {
                    child.children = children;
                    childRefresh();
                });
            });
    }

    function directoryUp() {
        if (parent.node.id === root.id) {
            child = { node: {}, children: [] }
            childRefresh();
            parentRefresh();
            return;
        }
        
        child = clone(parent);
        childRefresh();

        var parentId = parent.node.parentId;        
        if (parentId === root.id) {
            parent.node = root;
        } else {
            getNode(parentId, function(node) {
                parent.node = node;
            });
        }
        
        getChildren(parentId, function(children) {
            parent.children = children;
            parentRefresh();
            activateNode(child.node.id);
        });
    }

    function parentNewNode() {
        $.ajax({
            method: 'POST',
            url: 'data/newnode',
            dataType: 'json',
            data : JSON.stringify({ parentId: parent.node.id }),
        }).done(function(msg) {
            var node = msg.node;
            parent.children.push(node);
            parentPrepend(node);
        });
    }

    function childNewNode() {
        if (!child.node.id) return;
        $.ajax({
            method: 'POST',
            url: 'data/newnode',
            dataType: 'json',
            data : JSON.stringify({ parentId: child.node.id }),
        }).done(function(msg) {
            var node = msg.node;
            child.children.push(node);
            childPrepend(node);
        });
    }

    function parentRefresh() {
        $('.global__parent li').remove();
        for (var i = parent.children.length - 1; i >= 0 ; i--) {
            parentPrepend(parent.children[i]);
        }
    }

    function childRefresh() {
        $('.edit__title').val(child.node.title);
        $('.edit__tag').val(child.node.tag);
        $('.edit__preamble').val(child.node.preamble);
        $('.edit__content').val(child.node.content);
        compile();

        $('.global__child li').remove();
        for (var i = child.children.length - 1; i >= 0; i--) {
            childPrepend(child.children[i]);
        }
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
            return "(" + tags[tag] + ")";
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
        
        return markdown(
            text.replace(reNumSec, replNumSec)
                .replace(reRef, replRef)
                .replace(reCensor, replCensor)
        ).replace(reUncensor, replUncensor);
            
    }

    function clone(obj) {
        return $.extend(true, {}, obj);
    }
})($, marked);
