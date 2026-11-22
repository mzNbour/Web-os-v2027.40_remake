import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  Pause,
  Sliders,
  Table as TableIcon,
  HelpCircle,
  Download,
  Share2,
  Sparkles,
  Layers,
  Activity,
  ChevronDown,
  X,
} from 'lucide-react';

interface EquationItem {
  id: string;
  rawExpression: string; // e.g. "a * x^2 + b * x + c"
  color: string;
  visible: boolean;
  showDerivative?: boolean;
  name?: string;
}

interface VariableParam {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  isPlaying: boolean;
  speed: number;
}

interface GraphingCalculatorAppProps {
  onClose?: () => void;
  isOverlay?: boolean;
}

const PRESET_FORMULAS = [
  { name: '二次関数 (放物線)', expr: 'a * x^2 + b * x + c', desc: 'y = ax² + bx + c' },
  { name: '三角関数 (正弦波)', expr: 'a * sin(b * x + c)', desc: 'y = a·sin(bx + c)' },
  { name: '三角関数 (余弦波)', expr: 'a * cos(b * x) + c', desc: 'y = a·cos(bx) + c' },
  { name: '三次関数 (変曲点)', expr: 'a * x^3 - 3 * a * x + b', desc: 'y = ax³ - 3ax + b' },
  { name: 'ガウス分布 (正規分布)', expr: 'a * exp(-b * x^2)', desc: 'y = a·e^(-bx²)' },
  { name: '減衰振動 (物理波動)', expr: 'a * exp(-0.2 * x) * sin(b * x)', desc: 'y = a·e^(-0.2x)·sin(bx)' },
  { name: 'フーリエ合成波 (矩形波風)', expr: 'sin(x) + (1/3)*sin(3*x) + (1/5)*sin(5*x)', desc: '高調波の重ね合わせ' },
  { name: '対数関数 (Log)', expr: 'a * ln(x) + b', desc: 'y = a·ln(x) + b' },
  { name: '反比例 (双曲線)', expr: 'a / (x - b) + c', desc: 'y = a/(x - b) + c' },
  { name: '上半円 (円の方程式)', expr: 'sqrt(max(0, a^2 - x^2))', desc: 'x² + y² = a²' },
  { name: 'カージオイド (心臓形波)', expr: '2 * sin(x) - sin(2 * x)', desc: '心臓形曲線 (近似)' },
];

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
];

// Mathematical expression compiler into a fast JavaScript function
function compileExpression(exprStr: string): (x: number, vars: Record<string, number>) => number {
  if (!exprStr || !exprStr.trim()) {
    return () => NaN;
  }

  try {
    let clean = exprStr.toLowerCase().trim();

    // Replace constants
    clean = clean.replace(/\bpi\b/g, 'Math.PI');
    clean = clean.replace(/\be\b/g, 'Math.E');

    // Replace math functions
    const mathFuncs = [
      'sin', 'cos', 'tan',
      'asin', 'acos', 'atan',
      'sinh', 'cosh', 'tanh',
      'sqrt', 'cbrt', 'abs',
      'exp', 'floor', 'ceil', 'round', 'sign', 'min', 'max'
    ];

    mathFuncs.forEach((fn) => {
      const reg = new RegExp(`\\b${fn}\\(`, 'g');
      clean = clean.replace(reg, `Math.${fn}(`);
    });

    // Replace ln with Math.log, log/log10 with Math.log10
    clean = clean.replace(/\bln\(/g, 'Math.log(');
    clean = clean.replace(/\blog10\(/g, 'Math.log10(');
    clean = clean.replace(/\blog\(/g, 'Math.log10(');

    // Power operator ^ to **
    clean = clean.replace(/\^/g, '**');

    // Handle implicit multiplication like 2x, 3a, 4sin(x), a(x+1), (x+1)(x-1)
    clean = clean.replace(/(\d+)([a-zA-Z(])/g, '$1 * $2');
    clean = clean.replace(/([a-zA-Z])([a-zA-Z])/g, (match, p1, p2) => {
      // Avoid breaking Math keywords
      if (match.startsWith('Math')) return match;
      return `${p1} * ${p2}`;
    });
    clean = clean.replace(/\)(\()/g, ') * (');
    clean = clean.replace(/\)([a-zA-Z0-9])/g, ') * $1');

    // Build function using Function constructor
    // Argument vars contains { a, b, c, d, k, t }
    const fn = new Function(
      'x',
      'vars',
      `
      try {
        const a = vars.a ?? 1;
        const b = vars.b ?? 1;
        const c = vars.c ?? 0;
        const d = vars.d ?? 0;
        const k = vars.k ?? 1;
        const t = vars.t ?? 0;
        const res = (${clean});
        return typeof res === 'number' ? res : NaN;
      } catch(e) {
        return NaN;
      }
    `
    ) as (x: number, vars: Record<string, number>) => number;

    return fn;
  } catch (e) {
    return () => NaN;
  }
}

export const GraphingCalculatorApp: React.FC<GraphingCalculatorAppProps> = ({
  onClose,
  isOverlay = false,
}) => {
  const [equations, setEquations] = useState<EquationItem[]>([
    { id: '1', rawExpression: 'a * sin(b * x) + c', color: '#3b82f6', visible: true, name: 'f(x)' },
    { id: '2', rawExpression: '0.2 * x^2 - 2', color: '#ef4444', visible: true, name: 'g(x)' },
  ]);

  const [variables, setVariables] = useState<Record<string, VariableParam>>({
    a: { name: 'a', value: 2, min: -10, max: 10, step: 0.1, isPlaying: false, speed: 1 },
    b: { name: 'b', value: 1.5, min: -5, max: 5, step: 0.1, isPlaying: false, speed: 1 },
    c: { name: 'c', value: 0, min: -10, max: 10, step: 0.1, isPlaying: false, speed: 1 },
    d: { name: 'd', value: 0, min: -5, max: 5, step: 0.1, isPlaying: false, speed: 1 },
    k: { name: 'k', value: 1, min: 0.1, max: 5, step: 0.1, isPlaying: false, speed: 1 },
  });

  const [activeTab, setActiveTab] = useState<'equations' | 'variables' | 'table' | 'evaluate'>('equations');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [showLegend, setShowLegend] = useState<boolean>(true);
  const [evalX, setEvalX] = useState<string>('2');
  const [tableStart, setTableStart] = useState<number>(-5);
  const [tableEnd, setTableEnd] = useState<number>(5);
  const [tableStep, setTableStep] = useState<number>(1);

  // Viewport Coordinates Range
  const [viewport, setViewport] = useState({
    xMin: -10,
    xMax: 10,
    yMin: -7,
    yMax: 7,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; vp: typeof viewport }>({
    x: 0,
    y: 0,
    vp: { ...viewport },
  });
  const mousePosRef = useRef<{ x: number; y: number; mathX: number; mathY: number } | null>(null);

  // Compile expressions
  const compiledFns = useMemo(() => {
    return equations.map((eq) => ({
      ...eq,
      fn: compileExpression(eq.rawExpression),
    }));
  }, [equations]);

  // Variables values plain object
  const currentVarValues = useMemo(() => {
    const res: Record<string, number> = {};
    Object.keys(variables).forEach((k) => {
      res[k] = variables[k].value;
    });
    return res;
  }, [variables]);

  // Animation Loop for variable sliders
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      let hasPlaying = false;
      const playingVars = Object.keys(variables).filter((k) => variables[k].isPlaying);
      if (playingVars.length > 0) {
        hasPlaying = true;
        setVariables((prev) => {
          const next = { ...prev };
          playingVars.forEach((k) => {
            const v = next[k];
            let newVal = v.value + v.speed * delta * 2;
            if (newVal > v.max) {
              newVal = v.min;
            }
            next[k] = { ...v, value: parseFloat(newVal.toFixed(3)) };
          });
          return next;
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [variables]);

  // Render Canvas Graph
  const renderGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#09090b'; // zinc-950
    ctx.fillRect(0, 0, width, height);

    const { xMin, xMax, yMin, yMax } = viewport;
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;

    const toScreenX = (mathX: number) => ((mathX - xMin) / xRange) * width;
    const toScreenY = (mathY: number) => height - ((mathY - yMin) / yRange) * height;

    const toMathX = (screenX: number) => xMin + (screenX / width) * xRange;
    const toMathY = (screenY: number) => yMax - (screenY / height) * yRange;

    // Calculate grid step size based on zoom level
    const getGridStep = (range: number) => {
      const rawStep = range / 10;
      const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
      const normalized = rawStep / magnitude;
      if (normalized < 1.5) return magnitude;
      if (normalized < 3.5) return magnitude * 2;
      if (normalized < 7.5) return magnitude * 5;
      return magnitude * 10;
    };

    const gridStepX = getGridStep(xRange);
    const gridStepY = getGridStep(yRange);

    // Draw Grid Lines
    if (showGrid) {
      // Sub-grid (minor)
      const subStepX = gridStepX / 2;
      const subStepY = gridStepY / 2;

      ctx.lineWidth = 1;
      ctx.strokeStyle = '#18181b'; // zinc-900
      ctx.beginPath();
      const firstSubX = Math.floor(xMin / subStepX) * subStepX;
      for (let x = firstSubX; x <= xMax; x += subStepX) {
        const sx = toScreenX(x);
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
      }
      const firstSubY = Math.floor(yMin / subStepY) * subStepY;
      for (let y = firstSubY; y <= yMax; y += subStepY) {
        const sy = toScreenY(y);
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
      }
      ctx.stroke();

      // Major Grid
      ctx.strokeStyle = '#27272a'; // zinc-800
      ctx.lineWidth = 1;
      ctx.beginPath();
      const firstMajorX = Math.floor(xMin / gridStepX) * gridStepX;
      for (let x = firstMajorX; x <= xMax; x += gridStepX) {
        const sx = toScreenX(x);
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
      }
      const firstMajorY = Math.floor(yMin / gridStepY) * gridStepY;
      for (let y = firstMajorY; y <= yMax; y += gridStepY) {
        const sy = toScreenY(y);
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
      }
      ctx.stroke();
    }

    // Draw Axes (X and Y)
    if (showAxes) {
      const originX = toScreenX(0);
      const originY = toScreenY(0);

      ctx.strokeStyle = '#71717a'; // zinc-500
      ctx.lineWidth = 1.5;

      // X Axis
      ctx.beginPath();
      ctx.moveTo(0, originY);
      ctx.lineTo(width, originY);
      ctx.stroke();

      // Y Axis
      ctx.beginPath();
      ctx.moveTo(originX, 0);
      ctx.lineTo(originX, height);
      ctx.stroke();

      // Axis Ticks and Numbers
      ctx.fillStyle = '#a1a1aa'; // zinc-400
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';

      // X Numbers
      const startX = Math.floor(xMin / gridStepX) * gridStepX;
      for (let x = startX; x <= xMax; x += gridStepX) {
        if (Math.abs(x) < 1e-6) continue;
        const sx = toScreenX(x);
        const yPos = Math.max(15, Math.min(height - 6, originY + 14));
        ctx.textAlign = 'center';
        ctx.fillText(Number(x.toFixed(4)).toString(), sx, yPos);
      }

      // Y Numbers
      const startY = Math.floor(yMin / gridStepY) * gridStepY;
      for (let y = startY; y <= yMax; y += gridStepY) {
        if (Math.abs(y) < 1e-6) continue;
        const sy = toScreenY(y);
        const xPos = Math.max(25, Math.min(width - 15, originX - 8));
        ctx.textAlign = 'right';
        ctx.fillText(Number(y.toFixed(4)).toString(), xPos, sy + 3);
      }

      // Origin 0 label
      if (originX >= 10 && originX <= width - 10 && originY >= 10 && originY <= height - 10) {
        ctx.textAlign = 'right';
        ctx.fillText('0', originX - 6, originY + 12);
      }
    }

    // Plot Curves
    const numPoints = Math.min(width * 2, 2000);
    const step = width / numPoints;

    compiledFns.forEach((eq) => {
      if (!eq.visible) return;

      ctx.save();
      ctx.strokeStyle = eq.color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.beginPath();
      let isDrawing = false;
      let prevMathY = 0;

      for (let px = 0; px <= width; px += step) {
        const mathX = toMathX(px);
        const mathY = eq.fn(mathX, currentVarValues);

        if (isNaN(mathY) || !isFinite(mathY)) {
          isDrawing = false;
          continue;
        }

        // Asymptote jump check (e.g. for tan(x) or 1/x)
        if (isDrawing && Math.abs(mathY - prevMathY) > yRange * 1.5 && Math.sign(mathY) !== Math.sign(prevMathY)) {
          isDrawing = false;
        }

        const py = toScreenY(mathY);

        if (!isDrawing) {
          ctx.moveTo(px, py);
          isDrawing = true;
        } else {
          ctx.lineTo(px, py);
        }
        prevMathY = mathY;
      }
      ctx.stroke();

      // Plot numerical derivative curve if enabled
      if (eq.showDerivative) {
        ctx.strokeStyle = `${eq.color}88`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        let isDerivDrawing = false;
        const dx = 1e-4;

        for (let px = 0; px <= width; px += step * 2) {
          const mathX = toMathX(px);
          const y1 = eq.fn(mathX + dx, currentVarValues);
          const y0 = eq.fn(mathX - dx, currentVarValues);
          const deriv = (y1 - y0) / (2 * dx);

          if (isNaN(deriv) || !isFinite(deriv)) {
            isDerivDrawing = false;
            continue;
          }
          const py = toScreenY(deriv);
          if (!isDerivDrawing) {
            ctx.moveTo(px, py);
            isDerivDrawing = true;
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
      }

      ctx.restore();
    });

    // Crosshair and Curve Snapping
    if (mousePosRef.current) {
      const { x: mx, y: my } = mousePosRef.current;
      const mathX = toMathX(mx);

      // Draw dashed crosshair lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      ctx.beginPath();
      ctx.moveTo(mx, 0);
      ctx.lineTo(mx, height);
      ctx.moveTo(0, my);
      ctx.lineTo(width, my);
      ctx.stroke();
      ctx.setLineDash([]);

      // Find nearest curve point and draw highlighted dot
      compiledFns.forEach((eq) => {
        if (!eq.visible) return;
        const curveY = eq.fn(mathX, currentVarValues);
        if (!isNaN(curveY) && isFinite(curveY)) {
          const cy = toScreenY(curveY);
          if (cy >= 0 && cy <= height) {
            ctx.fillStyle = eq.color;
            ctx.beginPath();
            ctx.arc(mx, cy, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Label tooltip
            const label = `(${mathX.toFixed(2)}, ${curveY.toFixed(2)})`;
            ctx.font = 'bold 11px ui-monospace, monospace';
            const textWidth = ctx.measureText(label).width;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(mx + 8, cy - 20, textWidth + 12, 22);
            ctx.strokeStyle = eq.color;
            ctx.lineWidth = 1;
            ctx.strokeRect(mx + 8, cy - 20, textWidth + 12, 22);

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.fillText(label, mx + 14, cy - 5);
          }
        }
      });
    }

    ctx.restore();
  }, [compiledFns, currentVarValues, viewport, showGrid, showAxes]);

  // Request Animation / Canvas redraw whenever state changes
  useEffect(() => {
    renderGraph();
  }, [renderGraph]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      renderGraph();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderGraph]);

  // Canvas Mouse Controls (Pan & Zoom)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      vp: { ...viewport },
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const mathX = viewport.xMin + (screenX / rect.width) * (viewport.xMax - viewport.xMin);
      const mathY = viewport.yMax - (screenY / rect.height) * (viewport.yMax - viewport.yMin);
      mousePosRef.current = { x: screenX, y: screenY, mathX, mathY };
    }

    if (isDraggingRef.current && canvasRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const width = canvasRef.current.clientWidth;
      const height = canvasRef.current.clientHeight;

      const xSpan = dragStartRef.current.vp.xMax - dragStartRef.current.vp.xMin;
      const ySpan = dragStartRef.current.vp.yMax - dragStartRef.current.vp.yMin;

      const mathDx = (dx / width) * xSpan;
      const mathDy = (dy / height) * ySpan;

      setViewport({
        xMin: dragStartRef.current.vp.xMin - mathDx,
        xMax: dragStartRef.current.vp.xMax - mathDx,
        yMin: dragStartRef.current.vp.yMin + mathDy,
        yMax: dragStartRef.current.vp.yMax + mathDy,
      });
    } else {
      renderGraph();
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
    mousePosRef.current = null;
    renderGraph();
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.85 : 1.15;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const mathMouseX = viewport.xMin + (mouseX / rect.width) * (viewport.xMax - viewport.xMin);
    const mathMouseY = viewport.yMax - (mouseY / rect.height) * (viewport.yMax - viewport.yMin);

    setViewport((prev) => {
      const newXSpan = (prev.xMax - prev.xMin) * zoomFactor;
      const newYSpan = (prev.yMax - prev.yMin) * zoomFactor;

      const mouseRatioX = mouseX / rect.width;
      const mouseRatioY = 1 - mouseY / rect.height;

      return {
        xMin: mathMouseX - newXSpan * mouseRatioX,
        xMax: mathMouseX + newXSpan * (1 - mouseRatioX),
        yMin: mathMouseY - newYSpan * mouseRatioY,
        yMax: mathMouseY + newYSpan * (1 - mouseRatioY),
      };
    });
  };

  // Zoom Controls
  const handleZoom = (factor: number) => {
    setViewport((prev) => {
      const cx = (prev.xMin + prev.xMax) / 2;
      const cy = (prev.yMin + prev.yMax) / 2;
      const halfW = ((prev.xMax - prev.xMin) * factor) / 2;
      const halfH = ((prev.yMax - prev.yMin) * factor) / 2;
      return {
        xMin: cx - halfW,
        xMax: cx + halfW,
        yMin: cy - halfH,
        yMax: cy + halfH,
      };
    });
  };

  const handleResetView = () => {
    setViewport({ xMin: -10, xMax: 10, yMin: -7, yMax: 7 });
  };

  // Formula Management
  const handleAddEquation = () => {
    const nextColor = DEFAULT_COLORS[equations.length % DEFAULT_COLORS.length];
    const newId = Date.now().toString();
    setEquations((prev) => [
      ...prev,
      {
        id: newId,
        rawExpression: 'sin(x)',
        color: nextColor,
        visible: true,
        name: `f${prev.length + 1}(x)`,
      },
    ]);
  };

  const handleUpdateEquation = (id: string, partial: Partial<EquationItem>) => {
    setEquations((prev) => prev.map((eq) => (eq.id === id ? { ...eq, ...partial } : eq)));
  };

  const handleDeleteEquation = (id: string) => {
    if (equations.length <= 1) return;
    setEquations((prev) => prev.filter((eq) => eq.id !== id));
  };

  const handleApplyPreset = (expr: string) => {
    if (equations.length > 0) {
      handleUpdateEquation(equations[0].id, { rawExpression: expr });
    } else {
      setEquations([{ id: '1', rawExpression: expr, color: '#3b82f6', visible: true }]);
    }
  };

  const handleExportPNG = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `graph-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  // Table Data Generator
  const tableRows = useMemo(() => {
    const rows = [];
    const step = Math.max(0.01, tableStep);
    for (let x = tableStart; x <= tableEnd; x += step) {
      const cleanX = parseFloat(x.toFixed(4));
      const values: Record<string, number> = {};
      compiledFns.forEach((eq) => {
        values[eq.id] = eq.fn(cleanX, currentVarValues);
      });
      rows.push({ x: cleanX, values });
    }
    return rows;
  }, [tableStart, tableEnd, tableStep, compiledFns, currentVarValues]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex flex-col bg-zinc-950 text-zinc-100 select-none overflow-hidden font-sans ${
        isOverlay ? 'fixed inset-0 z-[9999999]' : 'relative'
      }`}
      id="graphing-calculator-app"
    >
      {/* Top Main Navigation Bar */}
      <div className="h-12 bg-zinc-900/90 border-b border-zinc-800 px-4 flex items-center justify-between shrink-0 select-none backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-zinc-100 tracking-tight">関数グラフ電卓 (Graphing Calculator)</span>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-mono">
                Interactive 2D Engine
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPNG}
            className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg flex items-center gap-1.5 transition-colors border border-zinc-700"
            title="グラフ画像を保存 (PNG Export)"
            id="graph-btn-export"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">画像保存</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1 text-xs bg-red-600/90 hover:bg-red-500 text-white rounded-lg flex items-center gap-1.5 font-bold shadow-md shadow-red-950/40 transition-all active:scale-95 border border-red-400/30"
              title="元の画面に戻る (Cキー または Esc)"
              id="graph-btn-close-screen"
            >
              <X className="w-3.5 h-3.5" />
              <span>元の画面に戻る (C)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Split (Left: Formula/Variables Panel, Right: Graph Viewport) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Side: Formula & Variable Controls Panel */}
        <div className="w-full md:w-[380px] lg:w-[420px] bg-zinc-900/95 border-r border-zinc-800 flex flex-col shrink-0 overflow-hidden z-10">
          {/* Tabs Selector */}
          <div className="flex items-center border-b border-zinc-800 bg-zinc-950/40 p-1.5 gap-1 shrink-0">
            <button
              onClick={() => setActiveTab('equations')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'equations'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
              id="graph-tab-equations"
            >
              <span>数式 f(x)</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">{equations.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('variables')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'variables'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
              id="graph-tab-variables"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>パラメータ</span>
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'table'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
              id="graph-tab-table"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>値の表</span>
            </button>
          </div>

          {/* Tab Body Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* ─── TAB 1: EQUATIONS ─── */}
            {activeTab === 'equations' && (
              <div className="space-y-4">
                {/* Presets Quick Picker */}
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="font-bold flex items-center gap-1.5 text-zinc-300">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      代表的な関数プリセット
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PRESET_FORMULAS.slice(0, 6).map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleApplyPreset(preset.expr)}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-blue-500/50 text-[11px] transition-colors"
                        title={preset.desc}
                      >
                        <div className="font-semibold text-zinc-200 truncate">{preset.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono truncate">{preset.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Equation Items List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">入力中の数式一覧</span>
                    <button
                      onClick={handleAddEquation}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold hover:underline"
                      id="graph-btn-add-equation"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>数式を追加</span>
                    </button>
                  </div>

                  {equations.map((eq, index) => (
                    <div
                      key={eq.id}
                      className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-2.5 shadow-sm hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {/* Visibility Toggle */}
                        <button
                          onClick={() => handleUpdateEquation(eq.id, { visible: !eq.visible })}
                          className={`p-1.5 rounded-md transition-colors ${
                            eq.visible ? 'text-zinc-200 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-800'
                          }`}
                          title={eq.visible ? '非表示' : '表示'}
                        >
                          {eq.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>

                        {/* Color Picker Indicator */}
                        <div
                          className="w-4 h-4 rounded-full border border-white/20 shrink-0 cursor-pointer shadow-sm"
                          style={{ backgroundColor: eq.color }}
                          title="カラー"
                        />

                        {/* Formula Input Box */}
                        <div className="flex-1 flex items-center bg-zinc-900 border border-zinc-800 focus-within:border-blue-500 rounded-lg px-2.5 py-1">
                          <span className="text-xs font-bold font-mono text-zinc-400 mr-2">y =</span>
                          <input
                            type="text"
                            value={eq.rawExpression}
                            onChange={(e) => handleUpdateEquation(eq.id, { rawExpression: e.target.value })}
                            placeholder="例: a * sin(x) + c"
                            className="w-full bg-transparent text-xs font-mono text-zinc-100 outline-none placeholder-zinc-600"
                            id={`equation-input-${eq.id}`}
                          />
                        </div>

                        {/* Delete Button */}
                        {equations.length > 1 && (
                          <button
                            onClick={() => handleDeleteEquation(eq.id)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-md transition-colors"
                            title="削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Options Toolbar for this curve */}
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-850 px-1">
                        <label className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-200">
                          <input
                            type="checkbox"
                            checked={!!eq.showDerivative}
                            onChange={(e) => handleUpdateEquation(eq.id, { showDerivative: e.target.checked })}
                            className="rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-0 text-xs"
                          />
                          <span>導関数 f'(x) を表示</span>
                        </label>
                        <span className="text-[10px] text-zinc-600 font-mono">ID: #{index + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Math Syntax Hint Card */}
                <div className="p-3 bg-blue-950/20 border border-blue-900/30 rounded-xl space-y-1.5 text-xs text-zinc-300">
                  <div className="font-bold text-blue-400 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>使える記号・関数</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
                    四則演算: <span className="text-zinc-200">+ - * / ^ (べき乗)</span><br />
                    関数: <span className="text-zinc-200">sin, cos, tan, sqrt, abs, exp, ln, log</span><br />
                    定数 & 変数: <span className="text-zinc-200">x, pi, e, a, b, c, d, k</span>
                  </p>
                </div>
              </div>
            )}

            {/* ─── TAB 2: PARAMETERS / SLIDERS ─── */}
            {activeTab === 'variables' && (
              <div className="space-y-4">
                <div className="text-xs text-zinc-400">
                  数式内に含まれる変数（<span className="font-mono text-blue-400">a, b, c, d, k</span>）の値をスライダーや数値入力でリアルタイムに変更できます。再生ボタンを押すと滑らかに自動アニメーションします。
                </div>

                <div className="space-y-3">
                  {Object.keys(variables).map((key) => {
                    const v = variables[key];
                    return (
                      <div
                        key={key}
                        className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-2.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-mono font-bold text-blue-400 text-xs">
                              {v.name}
                            </span>
                            <span className="text-xs font-bold text-zinc-200">変数 {v.name}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setVariables((prev) => ({
                                  ...prev,
                                  [key]: { ...v, isPlaying: !v.isPlaying },
                                }));
                              }}
                              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all ${
                                v.isPlaying
                                  ? 'bg-amber-500 text-black border-amber-400 font-bold'
                                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                              }`}
                              title={v.isPlaying ? '一時停止' : 'アニメーション再生'}
                            >
                              {v.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              <span className="text-[10px]">{v.isPlaying ? '停止' : '再生'}</span>
                            </button>

                            {/* Direct Number Input */}
                            <input
                              type="number"
                              step={v.step}
                              value={v.value}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) {
                                  setVariables((prev) => ({
                                    ...prev,
                                    [key]: { ...v, value: val },
                                  }));
                                }
                              }}
                              className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-xs text-right font-mono text-blue-300 font-bold outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>

                        {/* Slider Bar */}
                        <div className="space-y-1">
                          <input
                            type="range"
                            min={v.min}
                            max={v.max}
                            step={v.step}
                            value={v.value}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setVariables((prev) => ({
                                ...prev,
                                [key]: { ...v, value: val },
                              }));
                            }}
                            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                          <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                            <span>min: {v.min}</span>
                            <span className="text-zinc-400">現在値: {v.value}</span>
                            <span>max: {v.max}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── TAB 3: TABLE OF VALUES ─── */}
            {activeTab === 'table' && (
              <div className="space-y-4">
                {/* Table Range Controls */}
                <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-2 text-xs">
                  <div className="font-bold text-zinc-300">表の計算範囲設定</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-400">開始 X</label>
                      <input
                        type="number"
                        value={tableStart}
                        onChange={(e) => setTableStart(parseFloat(e.target.value) || 0)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400">終了 X</label>
                      <input
                        type="number"
                        value={tableEnd}
                        onChange={(e) => setTableEnd(parseFloat(e.target.value) || 0)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400">ステップ刻み</label>
                      <input
                        type="number"
                        step="0.1"
                        value={tableStep}
                        onChange={(e) => setTableStep(parseFloat(e.target.value) || 1)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Table Data */}
                <div className="max-h-[340px] overflow-y-auto border border-zinc-800 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-zinc-900 text-zinc-400 font-mono uppercase text-[10px] sticky top-0 border-b border-zinc-800">
                      <tr>
                        <th className="px-3 py-2">X</th>
                        {compiledFns.map((eq, i) => (
                          <th key={eq.id} className="px-3 py-2" style={{ color: eq.color }}>
                            y{i + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850 font-mono text-[11px]">
                      {tableRows.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className="hover:bg-zinc-900/60">
                          <td className="px-3 py-1.5 font-bold text-zinc-300">{row.x}</td>
                          {compiledFns.map((eq) => {
                            const val = row.values[eq.id];
                            return (
                              <td key={eq.id} className="px-3 py-1.5 text-zinc-400">
                                {isNaN(val) ? '未定義' : Number(val.toFixed(4)).toString()}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Interactive 2D Graph Canvas */}
        <div className="flex-1 flex flex-col bg-zinc-950 relative overflow-hidden">
          {/* Canvas Viewport Toolbar Overlay (Top-Right) */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-zinc-900/80 backdrop-blur-md p-1 rounded-xl border border-zinc-800/80 shadow-lg">
            <button
              onClick={() => handleZoom(0.8)}
              className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              title="ズームイン (+)"
              id="graph-btn-zoomin"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom(1.25)}
              className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              title="ズームアウト (-)"
              id="graph-btn-zoomout"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-zinc-700 my-auto" />
            <button
              onClick={handleResetView}
              className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              title="原点 (0, 0) と初期視点にリセット"
              id="graph-btn-reset-view"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                showGrid ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-zinc-800'
              }`}
              title="グリッド線の表示切替"
            >
              グリッド
            </button>
          </div>

          {/* Graph Legend Overlay (Top-Left) */}
          <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 bg-zinc-900/80 backdrop-blur-md p-2 rounded-xl border border-zinc-800/80 shadow-lg pointer-events-none max-w-xs">
            <div className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">アクティブ関数</div>
            {compiledFns.map((eq, i) => (
              <div key={eq.id} className="flex items-center gap-2 text-xs font-mono">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: eq.color }} />
                <span className="text-zinc-200 truncate">{eq.rawExpression || 'f(x)'}</span>
              </div>
            ))}
          </div>

          {/* Bottom Coordinate Bar & Hint */}
          <div className="absolute bottom-3 left-3 z-20 flex items-center gap-3 bg-zinc-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800/80 text-[11px] font-mono text-zinc-400 pointer-events-none">
            <span>ドラッグ: 平行移動</span>
            <span>•</span>
            <span>ホイール: 拡大縮小</span>
            <span>•</span>
            <span className="text-blue-400 font-bold">Cキー: 戻る</span>
          </div>

          {/* HTML5 Canvas Element */}
          <div className="flex-1 w-full h-full relative cursor-crosshair">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onWheel={handleWheel}
              className="w-full h-full block"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
