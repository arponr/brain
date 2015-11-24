Brain.Graph = function(ui) {
    var graph = this;
    graph.ui = ui;

    initGraph();
    
    graph.svg.on('mousedown', mousedown)
        .on('mousemove', mousemove)
        .on('mouseup', mouseup);
    d3.select('.site__global')
        .on('keydown', keydown)
        .on('keyup', keyup);
    graph.restart();

    function initGraph() {
        graph.width = 500;
        graph.height = 500;
        
        graph.svg = d3.select('.site__global')
            .append('svg')
            .attr("preserveAspectRatio", "xMidYMid meet")
            .attr("viewBox", "0 0 " + graph.width + " " + graph.height)

        // set up initial nodes and links
        //  - nodes are known by 'id', not by index in array.
        //  - links are always source < target; edge directions are set by 'left' and 'right'.
        graph.nodes = [];
        graph.links = [];

        // init D3 force layout
        graph.force = d3.layout.force()
            .nodes(graph.nodes)
            .links(graph.links)
            .size([graph.width, graph.height])
            .linkDistance(100)
            .charge(-400)
            .on('tick', tick);

        // define arrow markers for graph links
        graph.svg.append('svg:defs').append('svg:marker')
            .attr('id', 'end-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 6)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#000');

        graph.svg.append('svg:defs').append('svg:marker')
            .attr('id', 'start-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 4)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M10,-5L0,0L10,5')
            .attr('fill', '#000');

        // line displayed when dragging new nodes
        graph.dragLine = graph.svg.append('svg:path')
            .attr('class', 'link dragline hidden')
            .attr('d', 'M0,0L0,0');

        // handles to link and node element groups
        graph.path = graph.svg.append('svg:g').selectAll('path'),
        graph.circle = graph.svg.append('svg:g').selectAll('g');

        graph.radius = 8;

        graph.baseColor = "#aaaaaa";
        graph.selectColor = "#000000";
        graph.openColor  = "#aa0000";
        graph.grad = graph.svg.append("defs").append("linearGradient").attr("id", "grad")
            .attr("x1", "0%").attr("x2", "0%").attr("y1", "100%").attr("y2", "0%");
        graph.grad.append("stop").attr("offset", "50%").style("stop-color", graph.selectColor);
        graph.grad.append("stop").attr("offset", "50%").style("stop-color", graph.openColor);

        // mouse event vars
        graph.openedNode = null;
        graph.selectedNode = null;
        graph.selectedLink = null;
        graph.mousedownLink = null;
        graph.mousedownNode = null;
        graph.mouseupNode = null;
    }

    // update force layout (called automatically each iteration)
    function tick() {
        // draw directed edges with proper padding from node centers
        graph.path.attr('d', function(d) {
            var deltaX = d.target.x - d.source.x,
                deltaY = d.target.y - d.source.y,
                dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
                normX = deltaX / dist,
                normY = deltaY / dist,
                sourcePadding = (d.left ? 1.2 : 1) * graph.radius,
                targetPadding = (d.right ? 1.2 : 1) *  graph.radius,
                sourceX = d.source.x + (sourcePadding * normX),
                sourceY = d.source.y + (sourcePadding * normY),
                targetX = d.target.x - (targetPadding * normX),
                targetY = d.target.y - (targetPadding * normY);
            return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
        });

        graph.circle.attr('transform', function(d) {
            return 'translate(' + d.x + ',' + d.y + ')';
        });
    }

    function mousedown() {
        // prevent I-bar on drag
        //d3.event.preventDefault();

        // because :active only works in WebKit?
        graph.svg.classed('active', true);

        if (d3.event.ctrlKey || graph.mousedownNode || graph.mousedownLink) return;

        // insert new node at point
        graph.ui.requestNewNode();
        
        // var point = d3.mouse(this);

        // node = {id: ++graph.lastNodeId, reflexive: false};
        // node.x = point[0];
        // node.y = point[1];
        // graph.nodes.push(node);

        // graph.restart();
    }

    function mousemove() {
        if(!graph.mousedownNode) return;

        // update drag line
        graph.dragLine.attr(
            'd',
            'M' + graph.mousedownNode.x + ',' + graph.mousedownNode.y + 'L'
                + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);

        graph.restart();
    }

    function mouseup() {
        if (graph.mousedownNode) {
            // hide drag line
            graph.dragLine
                .classed('hidden', true)
                .style('marker-end', '');
        }

        // because :active only works in WebKit?
        graph.svg.classed('active', false);

        // clear mouse event vars
        graph.resetMouseVars();
    }

    function spliceLinksForNode(node) {
        var toSplice = graph.links.filter(function(l) {
            return (l.source === node || l.target === node);
        });
        toSplice.map(function(l) {
            graph.links.splice(graph.links.indexOf(l), 1);
        });
    }

    // only respond once per keydown
    var lastKeyDown = -1;

    function keydown() {
        d3.event.preventDefault();

        if (lastKeyDown !== -1) return;
        lastKeyDown = d3.event.keyCode;

        // ctrl
        if (d3.event.keyCode === 17) {
            graph.circle.call(graph.force.drag);
            graph.svg.classed('ctrl', true);
        }

        if (!graph.selectedNode && !graph.selectedLink) return;
        switch (d3.event.keyCode) {
        case 8: // backspace
        case 46: // delete
            if (graph.selectedNode) {
                graph.nodes.splice(graph.nodes.indexOf(graph.selectedNode), 1);
                spliceLinksForNode(graph.selectedNode);
            } else if (graph.selectedLink) {
                graph.links.splice(graph.links.indexOf(graph.selectedLink), 1);
            }
            graph.selectedLink = null;
            graph.selectedNode = null;
            graph.restart();
            break;
        case 66: // B
            if (graph.selectedLink) {
                // set link direction to both left and right
                graph.selectedLink.left = true;
                graph.selectedLink.right = true;
            }
            graph.restart();
            break;
        case 76: // L
            if (graph.selectedLink) {
                // set link direction to left only
                graph.selectedLink.left = true;
                graph.selectedLink.right = false;
            }
            graph.restart();
            break;
        case 82: // R
            if (graph.selectedNode) {
                // toggle node reflexivity
                graph.selectedNode.reflexive = !graph.selectedNode.reflexive;
            } else if (graph.selectedLink) {
                // set link direction to right only
                graph.selectedLink.left = false;
                graph.selectedLink.right = true;
            }
            graph.restart();
            break;
        }
    }

    function keyup() {
        lastKeyDown = -1;

        // ctrl
        if(d3.event.keyCode === 17) {
            graph.circle
                .on('mousedown.drag', null)
                .on('touchstart.drag', null);
            graph.svg.classed('ctrl', false);
        }
    }
};

Brain.Graph.prototype.resetMouseVars = function() {
    this.mousedownNode = null;
    this.mouseupNode = null;
    this.mousedownLink = null;
};

// update graph (called when needed)
Brain.Graph.prototype.restart = function() {
    var graph = this;
    
    // path (link) group
    graph.path = graph.path.data(graph.links);

    // update existing links
    graph.path
        .classed('selected', function(d) { return d === graph.selectedLink; })
        .style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
        .style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; });

    // add new links
    graph.path.enter().append('svg:path')
        .attr('class', 'link')
        .classed('selected', function(d) { return d === graph.selectedLink; })
        .style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
        .style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; })
        .on('mousedown', function(d) {
            if(d3.event.ctrlKey) return;

            // select link
            graph.mousedownLink = d;
            if (graph.mousedownLink === graph.selectedLink) {
                graph.selectedLink = null;
            } else {
                graph.selectedLink = graph.mousedownLink;
            }
            graph.selectedNode = null;
            graph.restart();
        });

    // remove old links
    graph.path.exit().remove();

    // circle (node) group
    // NB: the function arg is crucial here! nodes are known by id, not by index!
    graph.circle = graph.circle.data(graph.nodes, function(d) { return d.id; });

    function nodeFill(d) {
        if (d === graph.selectedNode) {
            if (d === graph.openedNode) return "url(#grad)";
            return graph.selectColor;
        } else if (d === graph.openedNode) {
            return graph.openColor;
        }
        return graph.baseColor;
    }
    
    // update existing nodes (reflexive & selected visual states)
    graph.circle.selectAll('circle')
        .style('fill', nodeFill)
        .classed('reflexive', function(d) { return d.reflexive; });

    // add new nodes
    var g = graph.circle.enter().append('svg:g');
    
    g.append('svg:circle')
        .attr('class', 'node')
        .attr('r', graph.radius)
        .style('fill', nodeFill)
        // .style('stroke', function(d) { return "#000000"; })
        .classed('reflexive', function(d) { return d.reflexive; })
        .on('dblclick', function(d) {
            graph.openedNode = d;
            graph.ui.requestNode(d.id);
            graph.restart();
        })
        .on('mouseover', function(d) {
            if(!graph.mousedownNode || d === graph.mousedownNode) return;
            // enlarge target node
            d3.select(this).attr('transform', 'scale(1.1)');
        })
        .on('mouseout', function(d) {
            if(!graph.mousedownNode || d === graph.mousedownNode) return;
            // unenlarge target node
            d3.select(this).attr('transform', '');
        })
        .on('mousedown', function(d) {
            if(d3.event.ctrlKey) return;

            // select node
            graph.mousedownNode = d;
            if (graph.mousedownNode === graph.selectedNode) {
                graph.selectedNode = null;
            } else {
                graph.selectedNode = graph.mousedownNode;
            }
            graph.selectedLink = null;

            // reposition drag line
            graph.dragLine
                .style('marker-end', 'url(#end-arrow)')
                .classed('hidden', false)
                .attr(
                    'd',
                    'M' + graph.mousedownNode.x + ',' + graph.mousedownNode.y + 'L'
                        + graph.mousedownNode.x + ',' + graph.mousedownNode.y);

            graph.restart();
        })
        .on('mouseup', function(d) {
            if (!graph.mousedownNode) return;

            // needed by FF
            graph.dragLine
                .classed('hidden', true)
                .style('marker-end', '');

            // check for drag-to-self
            graph.mouseupNode = d;
            if (graph.mouseupNode === graph.mousedownNode) {
                graph.resetMouseVars();
                return;
            }

            // unenlarge target node
            d3.select(this).attr('transform', '');

            // add link to graph (update if exists)
            // NB: links are strictly source < target; arrows separately specified by booleans
            var source, target, direction;
            if(graph.mousedownNode.id < graph.mouseupNode.id) {
                source = graph.mousedownNode;
                target = graph.mouseupNode;
                direction = 'right';
            } else {
                source = graph.mouseupNode;
                target = graph.mousedownNode;
                direction = 'left';
            }

            var link;
            link = graph.links.filter(function(l) {
                return (l.source === source && l.target === target);
            })[0];

            if (link) {
                link[direction] = true;
            } else {
                link = {source: source, target: target, left: false, right: false};
                link[direction] = true;
                graph.links.push(link);
            }

            // select new link
            graph.selectedLink = link;
            graph.selectedNode = null;
            graph.restart();
        });

    // show node IDs
    g.append('svg:text')
        .attr('x', 0)
        .attr('y', 2.5 * graph.radius)
        .attr('class', 'id')
        .text(function(d) { return d.title; });

    // remove old nodes
    graph.circle.exit().remove();

    // set the graph in motion
    graph.force.start();
};
