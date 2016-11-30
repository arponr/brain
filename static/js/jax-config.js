var macros = {
    abs: ["\\l|#1\\r|", 1],
    Aut: "\\operatorname{Aut}",
    bar: "\\overline",
    c: "\\colon",
    ce: "\\mathrel{:=}",
    cofib: "\\operatorname*{cofib}",
    coker: "\\operatorname*{coker}",
    colim: "\\operatorname*{colim}",
    del: "\\partial",
    ec: "\\mathrel{=:}",
    f: "\\frac",
    from: "\\leftarrow",
    Fun: "\\operatorname{Fun}",
    goesto: "\\rightsquigarrow",
    Hom: "\\operatorname{Hom}",
    id: "\\mathrm{id}",
    inj: "\\hookrightarrow",
    iso: "\\simeq",
    isoto: "\\xrightarrow{\\sim}",
    l: "\\left",
    lblto: ["\\xrightarrow{#1}", 1],
    Map: "\\operatorname{Map}",
    op: "\\mathrm{op}",
    r: "\\right",
    shimplies: "\\Rightarrow",
    shimplied: "\\Leftarrow",
    til: "\\tilde",
    und: "\\underline",
}

for (var i = 'A'.charCodeAt(0); i <= 'Z'.charCodeAt(0); i++) {
    var x = String.fromCharCode(i);
    macros["r"+x] = "\\mathrm{" + x + "}";
    macros["b"+x] = "\\mathbf{" + x + "}";
    macros["l"+x] = "\\mathbb{" + x + "}";
    macros["c"+x] = "\\mathcal{" + x + "}";
    macros["s"+x] = "\\mathscr{" + x + "}";
    macros["k"+x] = "\\mathfrak{" + x + "}";
}

for (var i = 'a'.charCodeAt(0); i <= 'z'.charCodeAt(0); i++) {
    var x = String.fromCharCode(i);
    macros["k"+x] = "\\mathfrak{" + x + "}";
}



MathJax.Hub.Config({
    extensions: ["tex2jax.js"],
    tex2jax: {
        inlineMath: [["$", "$"]],
    },
    jax: ["input/TeX", "output/HTML-CSS"],
    "HTML-CSS": {
        imageFont: null,
        webFont: "STIX-Web",
        scale: 98,
        linebreaks: {
            automatic: true,
            width: "75% container"
        }
    },
    showMathMenu: false,
    TeX: {
        extensions: ["AMSmath.js", "AMSsymbols.js", "begingroup.js", "/js/xypic.js"],
        TagSide: "left",
        TagIndent: "0em",
        Macros: macros,
    }
});

MathJax.Ajax.loadComplete("/js/jax-config.js");
