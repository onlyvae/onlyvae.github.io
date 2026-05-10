(() => {
  const finePointer = matchMedia("(any-hover: hover) and (any-pointer: fine)");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const forcedColors = matchMedia("(forced-colors: active)");
  const root = document.documentElement;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return;

  canvas.className = "cursor-signal";
  canvas.setAttribute("aria-hidden", "true");

  const colors = ["#68ecff", "#ff81b0"];
  const particleScale = 1.2;
  let fragments = [];
  let previous;
  let selectionPointer;
  let selectionChanged = false;
  let lastSelectionEmission = -Infinity;
  let frame = 0;
  let width = 0;
  let height = 0;
  let density = 0;

  function mouseEvent(event) {
    return finePointer.matches && !forcedColors.matches && event.pointerType === "mouse";
  }

  function resize() {
    if (!canvas.isConnected) return;
    density = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(height * density);
    context.setTransform(density, 0, 0, density, 0, 0);
  }

  function draw(time) {
    frame = 0;
    context.clearRect(0, 0, width, height);
    fragments = fragments.filter((fragment) => time - fragment.born < fragment.duration);

    for (const fragment of fragments) {
      const age = Math.max(0, time - fragment.born);
      const fade = 1 - age / fragment.duration;
      const x = fragment.x + fragment.vx * age;
      const y = fragment.y + fragment.vy * age;
      const fragmentWidth = Math.max(1, fragment.width * fade) * particleScale;
      const fragmentHeight = fragment.height * particleScale;
      context.fillStyle = fragment.color;
      context.globalAlpha = fade * fragment.opacity;
      if (fragment.rotation === undefined) {
        context.fillRect(x, y, fragmentWidth, fragmentHeight);
      } else {
        context.save();
        context.translate(x, y);
        context.rotate(fragment.rotation);
        context.fillRect(-fragmentWidth / 2, -fragmentHeight / 2, fragmentWidth, fragmentHeight);
        context.restore();
      }
    }

    if (fragments.length) frame = requestAnimationFrame(draw);
  }

  function wake() {
    if (!canvas.isConnected) document.body.append(canvas);
    if (density !== Math.min(window.devicePixelRatio || 1, 2)) resize();
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function emitTrail(x, y, index, time, direction) {
    const lag = 3 + index % 7;
    const offset = (index % 9 - 4) * 2;
    addFragment({
      x: x - direction.x * lag - direction.y * offset,
      y: y - direction.y * lag + direction.x * offset,
      width: 5 + index % 5 * 4,
      height: index % 4 === 0 ? 3 : 1.5,
      vx: -direction.x * .036,
      vy: -direction.y * .036,
      rotation: direction.angle,
      color: colors[index % 2],
      opacity: .66,
      born: time,
      duration: 210,
    });
  }

  function addFragment(fragment) {
    fragments.push(fragment);
    if (fragments.length > 160) fragments.shift();
  }

  function emitClick(x, y) {
    const count = 20;
    const time = performance.now();
    const turn = Math.PI * 2;
    const rotation = Math.random() * turn;

    for (let i = 0; i < count; i++) {
      const angle = rotation + (i + Math.random()) * turn / count;
      const radius = 4 + Math.random() * 14;
      const speed = .09 + Math.random() * .17;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle) * .68;
      addFragment({
        x: x + dx * radius,
        y: y + dy * radius,
        width: 5 + Math.random() * 32,
        height: i % 4 === 0 ? 3 : 1.5,
        vx: dx * speed,
        vy: dy * speed,
        rotation: angle + (Math.random() - .5) * Math.PI / 3,
        color: colors[i % 2],
        opacity: .9,
        born: time,
        duration: 230 + Math.random() * 130,
      });
    }
    wake();
  }

  function emitLinkEntry(x, y) {
    const time = performance.now();
    for (let i = 0; i < 7; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      addFragment({
        x: x + side * (3 + i),
        y: y + (i % 3 - 1) * 3,
        width: 3 + i % 3 * 2,
        height: 1.4,
        vx: side * (.045 + i * .009),
        vy: -.014 - i * .003,
        rotation: side * .18,
        color: colors[i % 2],
        opacity: .82,
        born: time,
        duration: 160 + i * 12,
      });
    }
    wake();
  }

  function emitSelection(selection, time, released) {
    const caret = document.createRange();
    caret.setStart(selection.focusNode, selection.focusOffset);
    caret.collapse(true);
    const edge = caret.getBoundingClientRect();
    const x = edge.height ? edge.left : selectionPointer.x;
    const height = edge.height || 16;
    const top = edge.height ? edge.top : selectionPointer.y - height / 2;
    const count = released ? 18 : 5;

    for (let i = 0; i < count; i++) {
      const angle = i * 2.4 + time / 70;
      const speed = (released ? .12 : .045) * (.45 + (i % 5) / 5);
      const size = i % 5 === 0 ? 3 : 2;
      addFragment({
        x: x + Math.sin(angle) * 3,
        y: top + height * ((i + .5) / count),
        width: size,
        height: size,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - .035,
        color: i % 7 === 0 ? "#e9fcff" : colors[i % 2],
        opacity: released ? .95 : .76,
        born: time,
        duration: (released ? 340 : 240) + (i % 4) * 32,
      });
    }
    wake();
  }

  document.addEventListener("pointerover", (event) => {
    if (!mouseEvent(event) || reducedMotion.matches || event.buttons !== 0) return;
    const link = event.target.closest("a[href]");
    if (link && !link.contains(event.relatedTarget)) emitLinkEntry(event.clientX, event.clientY);
  }, { passive: true });

  document.addEventListener("pointermove", (event) => {
    if (!mouseEvent(event)) return;
    const x = event.clientX;
    const y = event.clientY;
    const time = performance.now();
    if (selectionPointer) selectionPointer = { x, y };
    if (reducedMotion.matches) return;

    if (!previous || time - previous.time > 100) {
      previous = { x, y, time };
      return;
    }

    const dx = x - previous.x;
    const dy = y - previous.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 4) return;

    const direction = { x: dx / distance, y: dy / distance, angle: Math.atan2(dy, dx) };
    const segments = Math.min(10, Math.ceil(distance / 8));
    const phase = Math.floor(time / 16);
    for (let i = 1; i <= segments; i++) {
      const fraction = i / segments;
      emitTrail(
        previous.x + dx * fraction,
        previous.y + dy * fraction,
        phase + i,
        time,
        direction
      );
    }
    previous = { x, y, time };
    wake();
  }, { passive: true });

  document.addEventListener("pointerdown", (event) => {
    if (!mouseEvent(event) || event.button !== 0) return;
    selectionPointer = { x: event.clientX, y: event.clientY };
    selectionChanged = false;
    lastSelectionEmission = -Infinity;
    if (!reducedMotion.matches) emitClick(event.clientX, event.clientY);
  }, { passive: true });

  document.addEventListener("selectionchange", () => {
    if (!selectionPointer) return;
    const selection = document.getSelection();
    selectionChanged = Boolean(selection?.focusNode && !selection.isCollapsed);
    root.classList.toggle("cursor-selecting", selectionChanged);
    const time = performance.now();
    if (!selectionChanged || reducedMotion.matches || time - lastSelectionEmission < 36) return;

    lastSelectionEmission = time;
    emitSelection(selection, time, false);
  });

  document.addEventListener("pointerup", (event) => {
    if (!mouseEvent(event) || event.button !== 0) return;
    root.classList.remove("cursor-selecting");
    const selection = document.getSelection();
    if (!reducedMotion.matches && selectionChanged && selection?.focusNode && !selection.isCollapsed) {
      selectionPointer = { x: event.clientX, y: event.clientY };
      emitSelection(selection, performance.now(), true);
    }
    selectionPointer = undefined;
    selectionChanged = false;
  }, { passive: true });

  function clear() {
    root.classList.remove("cursor-selecting");
    previous = undefined;
    selectionPointer = undefined;
    selectionChanged = false;
    fragments.length = 0;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (canvas.isConnected) canvas.remove();
    density = 0;
  }

  root.addEventListener("pointerleave", clear);
  document.addEventListener("pointercancel", clear);
  document.addEventListener("dragstart", clear);
  document.addEventListener("contextmenu", clear);
  window.addEventListener("blur", clear);
  window.addEventListener("resize", resize);
  finePointer.addEventListener("change", clear);
  reducedMotion.addEventListener("change", clear);
  forcedColors.addEventListener("change", clear);
})();
