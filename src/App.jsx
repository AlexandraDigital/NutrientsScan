import { useState, useRef, useCallback } from "react";


/* ─── helpers ─────────────────────────────────────────────────── */
// Groq uses OpenAI-style image_url with full data URI
const toDataURL = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

/* ─── sub-components ──────────────────────────────────────────── */
function MacroBar({ label, value, max, color }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7a6b", marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 600, color: "#1a2e1c" }}>{value}g</span>
      </div>
      <div style={{ background: "#e8f0e3", borderRadius: 99, height: 6, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: 99, transition: "width 0.8s cubic-bezier(.4,0,.2,1)" }} />
      </div>
    </div>
  );
}

function HealthRing({ score }) {
  const r = 28, circumference = 2 * Math.PI * r;
  const pct = score / 10;
  const color = score >= 7 ? "#5cb85c" : score >= 4 ? "#f0ad4e" : "#d9534f";
  return (
    <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
      <svg width={72} height={72} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={36} cy={36} r={r} fill="none" stroke="#e8f0e3" strokeWidth={6} />
        <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${pct * circumference} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#1a2e1c", lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: "#6b7a6b", letterSpacing: "0.05em" }}>/10</span>
      </div>
    </div>
  );
}

function CalorieArc({ consumed, goal }) {
  const pct = Math.min(1, consumed / goal);
  const r = 52, cx = 70, cy = 70;
  const startAngle = Math.PI * 0.75;
  const sweep = Math.PI * 1.5;
  const endAngle = startAngle + sweep * pct;
  const px = (a) => cx + r * Math.cos(a);
  const py = (a) => cy + r * Math.sin(a);
  const trackEnd = startAngle + sweep;
  const trackPath = `M ${px(startAngle)} ${py(startAngle)} A ${r} ${r} 0 1 1 ${px(trackEnd)} ${py(trackEnd)}`;
  const arcPath = pct > 0 ? `M ${px(startAngle)} ${py(startAngle)} A ${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${px(endAngle)} ${py(endAngle)}` : null;
  const remaining = Math.max(0, goal - consumed);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={140} height={110} overflow="visible">
        <path d={trackPath} fill="none" stroke="#e8f0e3" strokeWidth={10} strokeLinecap="round" />
        {arcPath && (
          <path d={arcPath} fill="none" stroke={pct >= 1 ? "#d9534f" : "#a8d55a"}
            strokeWidth={10} strokeLinecap="round"
            style={{ transition: "all 0.8s" }} />
        )}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={22} fontWeight={700} fill="#1a2e1c">
          {consumed.toLocaleString()}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={11} fill="#6b7a6b">
          of {goal.toLocaleString()} kcal
        </text>
        <text x={cx} y={cy + 32} textAnchor="middle" fontSize={11} fontWeight={600}
          fill={remaining > 0 ? "#4a7c5a" : "#d9534f"}>
          {remaining > 0 ? `${remaining} left` : "Goal reached!"}
        </text>
      </svg>
    </div>
  );
}

/* ─── main app ─────────────────────────────────────────────────── */
export default function App() {
  const [mode, setMode] = useState("calories");
  const [imgUrl, setImgUrl] = useState(null);
  const [imgDataURL, setImgDataURL] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [log, setLog] = useState([]);
  const [goal] = useState(2000);
  const [drag, setDrag] = useState(false);
  const [addedToLog, setAddedToLog] = useState(false);
  const fileRef = useRef();

  const totalCals = log.reduce((s, i) => s + i.calories, 0);

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImgUrl(URL.createObjectURL(file));
    setImgDataURL(await toDataURL(file));
    setResult(null);
    setError(null);
    setAddedToLog(false);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const switchMode = (m) => {
    setMode(m);
    setResult(null);
    setError(null);
    setImgUrl(null);
    setImgB64(null);
    setAddedToLog(false);
  };

  const analyze = async () => {
    if (!imgDataURL) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setAddedToLog(false);

    const prompt =
      mode === "calories"
        ? `You are a professional nutritionist. Analyze the food in this image carefully and accurately. Return ONLY valid JSON with no markdown fences or extra text:
{"foodName":"string","totalCalories":number,"servingSize":"string","macros":{"protein":number,"carbs":number,"fat":number,"fiber":number},"items":[{"name":"string","calories":number}],"healthScore":number,"tips":["string","string"]}`
        : `You are a professional chef. Identify every visible ingredient in this image (could be a fridge, pantry shelf, or ingredients laid out). Then suggest 3 great recipes using primarily those ingredients. Return ONLY valid JSON with no markdown fences or extra text:
{"ingredients":["string"],"recipes":[{"name":"string","time":"string","difficulty":"string","calories":number,"description":"string","steps":["string"]}],"missingCommon":["string"]}`;

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataURL: imgDataURL, mode }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err.message || "Couldn't analyze the image. Please try a clearer photo.");
    }
    setLoading(false);
  };

  const addToLog = () => {
    if (!result?.totalCalories) return;
    setLog((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: result.foodName,
        calories: result.totalCalories,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setAddedToLog(true);
  };

  const removeLog = (id) => setLog((prev) => prev.filter((i) => i.id !== id));

  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", background: "#f4f7f0", minHeight: "100vh", paddingBottom: 48 }}>

      {/* ── Header ── */}
      <div style={{ background: "#1a2e1c", padding: "20px 20px 0", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, maxWidth: 520, margin: "0 auto 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, background: "#a8d55a", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
              🥗
            </div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", color: "#f0f7e6", fontSize: 20, fontWeight: 700, lineHeight: 1 }}>NutriLens</div>
              <div style={{ color: "#6b9b5e", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>AI Food Scanner</div>
            </div>
          </div>

        </div>

        {/* Mode tabs */}
        <div style={{ display: "flex", background: "#122018", borderRadius: "12px 12px 0 0", padding: "6px 6px 0", maxWidth: 520, margin: "0 auto" }}>
          {[
            { key: "calories", icon: "🔥", label: "Calorie Scan" },
            { key: "ingredients", icon: "🥘", label: "Recipe Finder" },
          ].map(({ key, icon, label }) => (
            <button key={key} onClick={() => switchMode(key)}
              style={{ flex: 1, border: "none", cursor: "pointer", padding: "12px 8px", borderRadius: "8px 8px 0 0", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                background: mode === key ? "#f4f7f0" : "transparent",
                color: mode === key ? "#1a2e1c" : "#5a8050",
                transition: "all 0.2s" }}>
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: "20px 16px", maxWidth: 520, margin: "0 auto" }}>

        {/* Upload */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => !imgUrl && fileRef.current.click()}
          style={{ border: `2px dashed ${drag ? "#a8d55a" : imgUrl ? "#c8e09a" : "#c5d5bc"}`,
            borderRadius: 18, background: drag ? "#edf7dd" : imgUrl ? "transparent" : "#fff",
            overflow: "hidden", cursor: imgUrl ? "default" : "pointer",
            transition: "all 0.2s", marginBottom: 14,
            minHeight: imgUrl ? 0 : 170, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {imgUrl ? (
            <div style={{ position: "relative", width: "100%" }}>
              <img src={imgUrl} alt="Uploaded" style={{ width: "100%", borderRadius: 16, display: "block", maxHeight: 280, objectFit: "cover" }} />
              <button onClick={(e) => { e.stopPropagation(); fileRef.current.click(); }}
                style={{ position: "absolute", top: 10, right: 10, background: "rgba(26,46,28,0.85)", border: "none", borderRadius: 8, color: "#a8d55a", fontSize: 12, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                Change photo
              </button>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 36 }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>{mode === "calories" ? "📸" : "🧺"}</div>
              <div style={{ color: "#1a2e1c", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
                {mode === "calories" ? "Snap your meal" : "Scan your ingredients"}
              </div>
              <div style={{ color: "#8aaa80", fontSize: 13 }}>Tap to upload · or drag & drop</div>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ""; }} />

        {/* Analyze button */}
        <button onClick={analyze} disabled={!imgDataURL || loading}
          style={{ width: "100%", padding: 16, border: "none", borderRadius: 16,
            cursor: imgDataURL && !loading ? "pointer" : "not-allowed",
            background: imgDataURL && !loading ? "#1a2e1c" : "#d0dcc8",
            color: imgDataURL && !loading ? "#a8d55a" : "#8aaa80",
            fontSize: 15, fontWeight: 700, fontFamily: "inherit", letterSpacing: "0.02em",
            transition: "all 0.2s", marginBottom: 22 }}>
          {loading ? "Analyzing with AI…" : mode === "calories" ? "🔍 Analyze Calories" : "🍳 Find Recipes"}
        </button>

        {/* Error */}
        {error && (
          <div style={{ background: "#fdf0f0", border: "1px solid #f5c1c1", borderRadius: 14, padding: "14px 18px", color: "#9b3535", fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Calorie Results ── */}
        {result && mode === "calories" && !result.error && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>

            <div style={{ background: "#fff", borderRadius: 20, padding: 22, marginBottom: 14, border: "1px solid #dce8d4" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                  <div style={{ fontSize: 19, fontWeight: 700, color: "#1a2e1c", marginBottom: 4, lineHeight: 1.3 }}>{result.foodName}</div>
                  <div style={{ fontSize: 12, color: "#8aaa80" }}>{result.servingSize}</div>
                </div>
                <div>
                  <HealthRing score={result.healthScore} />
                  <div style={{ textAlign: "center", fontSize: 10, color: "#8aaa80", marginTop: 4 }}>Health</div>
                </div>
              </div>

              <div style={{ background: "#f4f7f0", borderRadius: 14, padding: "14px 20px", textAlign: "center", marginBottom: 18 }}>
                <div style={{ fontSize: 48, fontWeight: 800, color: "#1a2e1c", lineHeight: 1 }}>{result.totalCalories}</div>
                <div style={{ fontSize: 13, color: "#6b7a6b", fontWeight: 500, marginTop: 2 }}>Calories</div>
              </div>

              <MacroBar label="Protein" value={result.macros?.protein ?? 0} max={60} color="#5cb85c" />
              <MacroBar label="Carbohydrates" value={result.macros?.carbs ?? 0} max={300} color="#f0ad4e" />
              <MacroBar label="Fat" value={result.macros?.fat ?? 0} max={80} color="#d9534f" />
              <MacroBar label="Fiber" value={result.macros?.fiber ?? 0} max={30} color="#5bc0de" />
            </div>

            {result.items?.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 20, padding: 20, marginBottom: 14, border: "1px solid #dce8d4" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7a6b", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.07em" }}>Breakdown</div>
                {result.items.map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0",
                    borderBottom: i < result.items.length - 1 ? "1px solid #f0f4ec" : "none" }}>
                    <span style={{ fontSize: 13, color: "#3a4e3a" }}>{item.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#4a7c5a" }}>{item.calories} kcal</span>
                  </div>
                ))}
              </div>
            )}

            {result.tips?.length > 0 && (
              <div style={{ background: "#eef7e4", borderRadius: 18, padding: 18, marginBottom: 16, border: "1px solid #c8e09a" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#3d6e30", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.07em" }}>Nutrition Tips</div>
                {result.tips.map((tip, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "#a8d55a", fontWeight: 800, fontSize: 14, marginTop: 1, flexShrink: 0 }}>→</span>
                    <span style={{ fontSize: 13, color: "#3a5e30", lineHeight: 1.55 }}>{tip}</span>
                  </div>
                ))}
              </div>
            )}

            <button onClick={addToLog} disabled={addedToLog}
              style={{ width: "100%", padding: 15, border: "none", borderRadius: 16,
                cursor: addedToLog ? "default" : "pointer",
                background: addedToLog ? "#eef7e4" : "#a8d55a",
                color: addedToLog ? "#4a7c5a" : "#1a2e1c",
                fontSize: 14, fontWeight: 700, fontFamily: "inherit", transition: "all 0.2s" }}>
              {addedToLog ? "✓ Added to today's log" : `+ Add ${result.totalCalories} kcal to log`}
            </button>
          </div>
        )}

        {/* ── Ingredient / Recipe Results ── */}
        {result && mode === "ingredients" && !result.error && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            <div style={{ background: "#fff", borderRadius: 20, padding: 20, marginBottom: 14, border: "1px solid #dce8d4" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7a6b", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.07em" }}>Detected Ingredients</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {result.ingredients?.map((ing, i) => (
                  <span key={i} style={{ background: "#eef7e4", color: "#2d5e28", fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 99, border: "1px solid #c8e09a" }}>
                    {ing}
                  </span>
                ))}
              </div>
            </div>

            {result.recipes?.map((recipe, i) => {
              const emojis = ["🥗", "🍲", "🍳"];
              const bgs = ["#eef7e4", "#fff9e8", "#fdf0f0"];
              return (
                <details key={i} style={{ background: "#fff", borderRadius: 20, marginBottom: 12, border: "1px solid #dce8d4", overflow: "hidden" }}>
                  <summary style={{ padding: "16px 18px", cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 40, height: 40, background: bgs[i % 3], borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                      {emojis[i % 3]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1a2e1c", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {recipe.name}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: "#6b7a6b" }}>⏱ {recipe.time}</span>
                        <span style={{ fontSize: 11, color: "#6b7a6b" }}>· {recipe.difficulty}</span>
                        <span style={{ fontSize: 11, color: "#4a7c5a", fontWeight: 600 }}>· ~{recipe.calories} kcal</span>
                      </div>
                    </div>
                    <span style={{ color: "#c5d5bc", fontSize: 20, flexShrink: 0 }}>›</span>
                  </summary>
                  <div style={{ padding: "0 18px 20px", borderTop: "1px solid #f0f4ec" }}>
                    <p style={{ fontSize: 13, color: "#6b7a6b", margin: "14px 0", lineHeight: 1.65 }}>{recipe.description}</p>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7a6b", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.07em" }}>Steps</div>
                    {recipe.steps?.map((step, j) => (
                      <div key={j} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
                        <div style={{ width: 24, height: 24, background: "#1a2e1c", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "#a8d55a", fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                          {j + 1}
                        </div>
                        <span style={{ fontSize: 13, color: "#3a4e3a", lineHeight: 1.6 }}>{step}</span>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}

            {result.missingCommon?.length > 0 && (
              <div style={{ background: "#fff9e8", borderRadius: 18, padding: 18, border: "1px solid #f5d89a" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#8a6010", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Might want to grab
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {result.missingCommon.map((item, i) => (
                    <span key={i} style={{ background: "#fef3d0", color: "#7a5010", fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 99, border: "1px solid #f5d89a" }}>
                      + {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Daily Log ── */}
        {mode === "calories" && (
          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7a6b", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Today's Log
            </div>
            <div style={{ background: "#fff", borderRadius: 20, padding: 22, border: "1px solid #dce8d4" }}>
              <CalorieArc consumed={totalCals} goal={goal} />
              {log.length === 0 ? (
                <div style={{ textAlign: "center", color: "#c5d5bc", fontSize: 13, paddingTop: 6 }}>
                  No meals logged yet — scan something to start!
                </div>
              ) : (
                <div style={{ marginTop: 12 }}>
                  {log.map((item) => (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #f0f4ec" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a2e1c" }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: "#a0b898", marginTop: 2 }}>{item.time}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#4a7c5a" }}>{item.calories} kcal</span>
                        <button onClick={() => removeLog(item.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#d4b8b8", fontSize: 18, padding: 2, lineHeight: 1 }}
                          title="Remove">
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
