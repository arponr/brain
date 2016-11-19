var macros = {
    iso: "\\simeq",
    inj: "\\hookrightarrow",
    lblto: ["\\xrightarrow{#1}", 1],
    isoto: "\\xrightarrow{\\sim}",
    shimplies: "\\Rightarrow",
    c: "\\colon",
    lc: ":\\!",
    ce: "\\mathrel{:=}",
    ec: "\\mathrel{=:}",
    l: "\\left",
    r: "\\right",
    f: "\\frac",
    bar: "\\overline",
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
        scale: 100,
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
