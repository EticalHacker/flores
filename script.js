(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const KNOT = { x: 400, y: 690 };

  const quadPoint = (p0, p1, p2, t) => ({
    x: (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t ** 2 * p2.x,
    y: (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t ** 2 * p2.y,
  });

  const quadTangentDeg = (p0, p1, p2, t) => {
    const dx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
    const dy = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };

  const el = (tag, attrs = {}) => {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  };

  const PALETTES = {
    lg: { len: 138, leaf: 118, backBase: "#E69500", backTip: "#FFE066", frontBase: "#F4B400", frontTip: "#FFF3B0" },
    md: { len: 112, leaf: 98,  backBase: "#EFA400", backTip: "#FFEB85", frontBase: "#FBC02D", frontTip: "#FFF7C4" },
    sm: { len: 90,  leaf: 80,  backBase: "#F4B400", backTip: "#FFF2A8", frontBase: "#FDD835", frontTip: "#FFFBE0" },
  };

  const gradCache = new Set();
  function ensurePetalGradients(defs, tier, pal) {
    if (gradCache.has(tier)) return;
    gradCache.add(tier);

    const makeGrad = (id, base, tip) => {
      const g = el("linearGradient", { id, x1: "0", y1: "1", x2: "0", y2: "0" });
      g.appendChild(el("stop", { offset: "0%", "stop-color": base }));
      g.appendChild(el("stop", { offset: "100%", "stop-color": tip }));
      defs.appendChild(g);
    };
    makeGrad(`grad-back-${tier}`, pal.backBase, pal.backTip);
    makeGrad(`grad-front-${tier}`, pal.frontBase, pal.frontTip);
  }

  const FLOWERS = [
    { end: { x: 155, y: 340 }, ctrl: { x: 235, y: 545 }, size: "sm" },
    { end: { x: 250, y: 235 }, ctrl: { x: 305, y: 495 }, size: "md" },
    { end: { x: 338, y: 165 }, ctrl: { x: 372, y: 440 }, size: "lg" },
    { end: { x: 400, y: 138 }, ctrl: { x: 400, y: 400 }, size: "lg" },
    { end: { x: 462, y: 165 }, ctrl: { x: 428, y: 440 }, size: "lg" },
    { end: { x: 550, y: 235 }, ctrl: { x: 495, y: 495 }, size: "md" },
    { end: { x: 645, y: 340 }, ctrl: { x: 565, y: 545 }, size: "sm" },
  ];

  function buildLeaf(stemP0, stemP1, stemP2, t, side, size, groupIndex, leafIndex) {
    const pos = quadPoint(stemP0, stemP1, stemP2, t);
    const tangent = quadTangentDeg(stemP0, stemP1, stemP2, t);
    const angle = tangent + side * 98;

    const g = el("g", {
      class: "leaf",
      transform: `translate(${pos.x.toFixed(2)},${pos.y.toFixed(2)}) rotate(${angle.toFixed(2)}) scale(${size})`,
    });
    g.style.setProperty("--li", leafIndex);

    const shape = el("use", { href: "#leaf-shape", class: "leaf-shape" });
    g.appendChild(shape);

    const vein = el("line", {
      x1: 0, y1: 0, x2: 0, y2: -1,
      class: "leaf-vein",
      "vector-effect": "non-scaling-stroke",
    });
    g.appendChild(vein);
    return g;
  }

  function buildTulipCup(pal, tier) {
    const head = el("g", { class: "flower-head" });

    const backDefs  = [{ a: -34, f: 0.92 }, { a: 0, f: 1 }, { a: 34, f: 0.92 }];
    const frontDefs = [{ a: -15, f: 0.74 }, { a: 0, f: 0.82 }, { a: 15, f: 0.74 }];

    const addLayer = (defsArr, layerClass, gradId) => {
      defsArr.forEach((d, i) => {
        const slot = el("g", { transform: `rotate(${d.a})` });
        const petalLen = pal.len * d.f;
        const scaler = el("g", { transform: `scale(${petalLen})` });

        const petal = el("use", {
          href: "#tulip-petal",
          class: `petal ${layerClass}`,
          fill: `url(#${gradId})`,
        });
        petal.style.setProperty("--pd", i);
        scaler.appendChild(petal);

        const blotch = el("ellipse", {
          cx: 0, cy: -0.22, rx: 0.13, ry: 0.19,
          class: "petal-blotch",
        });
        blotch.style.setProperty("--pd", i);
        scaler.appendChild(blotch);

        slot.appendChild(scaler);
        head.appendChild(slot);
      });
    };

    addLayer(backDefs, "back", `grad-back-${tier}`);
    addLayer(frontDefs, "front", `grad-front-${tier}`);

    return head;
  }

  function buildFlower(cfg, index, defs) {
    const pal = PALETTES[cfg.size];
    ensurePetalGradients(defs, cfg.size, pal);

    const g = el("g", { class: "flower" });
    g.style.setProperty("--i", index);

    const stem = el("path", {
      class: "stem",
      d: `M${KNOT.x},${KNOT.y} Q${cfg.ctrl.x},${cfg.ctrl.y} ${cfg.end.x},${cfg.end.y}`,
      "pathLength": "1",
    });
    g.appendChild(stem);

    const side = cfg.end.x === 400 ? (index % 2 === 0 ? -1 : 1) : (cfg.end.x < 400 ? -1 : 1);
    const t = 0.22 + (index % 2) * 0.06;
    g.appendChild(buildLeaf(KNOT, cfg.ctrl, cfg.end, t, side, pal.leaf, index, 0));

    const head = buildTulipCup(pal, cfg.size);
    head.setAttribute("transform", `translate(${cfg.end.x},${cfg.end.y})`);
    g.appendChild(head);

    return g;
  }

  function buildRibbon(delaySeconds) {
    const g = el("g", { class: "ribbon" });
    g.style.animationDelay = `${delaySeconds}s`;

    const strokeColor = "#C9922E";
    const fillColor = "#FBEBC7";

    const loopLeft = el("path", {
      d: `M${KNOT.x},${KNOT.y} C ${KNOT.x - 70},${KNOT.y - 35} ${KNOT.x - 78},${KNOT.y + 30} ${KNOT.x - 8},${KNOT.y + 18} Z`,
      fill: fillColor, stroke: strokeColor, "stroke-width": 3,
    });
    const loopRight = el("path", {
      d: `M${KNOT.x},${KNOT.y} C ${KNOT.x + 70},${KNOT.y - 35} ${KNOT.x + 78},${KNOT.y + 30} ${KNOT.x + 8},${KNOT.y + 18} Z`,
      fill: fillColor, stroke: strokeColor, "stroke-width": 3,
    });
    const tailLeft = el("path", {
      d: `M${KNOT.x - 6},${KNOT.y + 10} L${KNOT.x - 34},${KNOT.y + 68} L${KNOT.x - 12},${KNOT.y + 60} Z`,
      fill: fillColor, stroke: strokeColor, "stroke-width": 2.5,
    });
    const tailRight = el("path", {
      d: `M${KNOT.x + 6},${KNOT.y + 10} L${KNOT.x + 34},${KNOT.y + 68} L${KNOT.x + 12},${KNOT.y + 60} Z`,
      fill: fillColor, stroke: strokeColor, "stroke-width": 2.5,
    });
    const knotCircle = el("circle", {
      cx: KNOT.x, cy: KNOT.y + 6, r: 14,
      fill: "#F3D68A", stroke: strokeColor, "stroke-width": 3,
    });

    [loopLeft, loopRight, tailLeft, tailRight, knotCircle].forEach((p) => g.appendChild(p));
    return g;
  }

  function renderBouquet(svg) {
    const defs = svg.querySelector("defs");
    const scene = el("g", { id: "scene" });
    FLOWERS.forEach((cfg, i) => scene.appendChild(buildFlower(cfg, i, defs)));

    const ribbonDelay = FLOWERS.length * 0.32 + 2.1;
    scene.appendChild(buildRibbon(ribbonDelay));

    const old = svg.querySelector("#scene");
    old.replaceWith(scene);
  }

  function initMusic() {
    const audio = document.getElementById("bg-music");
    if (!audio) return;

    const tryPlay = () => audio.play().catch(() => {});
    tryPlay();

    const resumeOnInteraction = () => {
      if (audio.paused) audio.play().catch(() => {});
      window.removeEventListener("pointerdown", resumeOnInteraction);
      window.removeEventListener("keydown", resumeOnInteraction);
    };
    window.addEventListener("pointerdown", resumeOnInteraction, { once: true });
    window.addEventListener("keydown", resumeOnInteraction, { once: true });
  }

  function init() {
    const svg = document.getElementById("bouquet");
    renderBouquet(svg);
    initMusic();

    const btn = document.getElementById("replay-btn");
    btn.addEventListener("click", () => {
      const fresh = document.getElementById("bouquet").cloneNode(true);
      document.getElementById("bouquet").replaceWith(fresh);
      renderBouquet(fresh);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();