'use client'

import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Info, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

type Segment = {
  code: string;
  value: number;
  type: "S" | "D" | "T" | "BULL" | "DBULL";
};

const singles: Segment[] = Array.from({ length: 20 }, (_, i) => ({
  code: `S${i + 1}`,
  value: i + 1,
  type: "S",
})).concat([{ code: "BULL", value: 25, type: "BULL" as const }]);

const doubles: Segment[] = Array.from({ length: 20 }, (_, i) => ({
  code: `D${i + 1}`,
  value: 2 * (i + 1),
  type: "D",
})).concat([{ code: "DBULL", value: 50, type: "DBULL" as const }]);

const triples: Segment[] = Array.from({ length: 20 }, (_, i) => ({
  code: `T${i + 1}`,
  value: 3 * (i + 1),
  type: "T",
}));

const allSetups: Segment[] = [...singles, ...doubles, ...triples];

const pretty = (seg: Segment) => {
  if (seg.code === "BULL") return "Bull (25)";
  if (seg.code === "DBULL") return "Double Bull (50)";
  return seg.code;
};

// -------------------- Checkout Engine -------------------- //

type Route = {
  darts: Segment[];
};

function computeMinimalCheckout(
  target: number,
  opts: { preferredDoubles: Set<string>; showOnlyPreferred: boolean }
): { routes: Route[]; minDarts: number | null } {
  if (target < 2 || target > 170) return { routes: [], minDarts: null };
  const fins = doubles;

  const finishMatchesPref = (d: Segment) => opts.preferredDoubles.has(d.code);

  const one = fins.filter((d) => d.value === target).map((d) => ({ darts: [d] }));

  const two: Route[] = [];
  for (const d of fins) {
    const need = target - d.value;
    if (need <= 0) continue;
    for (const a of allSetups) {
      if (a.value === need) two.push({ darts: [a, d] });
    }
  }

  const three: Route[] = [];
  for (const d of fins) {
    const need2 = target - d.value;
    if (need2 <= 0) continue;
    for (const a of allSetups) {
      const need1 = need2 - a.value;
      if (need1 <= 0) continue;
      for (const b of allSetups) {
        if (b.value === need1) three.push({ darts: [a, b, d] });
      }
    }
  }

  const tiers: Route[][] = [one, two, three].map(dedupeRoutes);
  let chosen: Route[] = [];
  let minDarts: number | null = null;
  for (let i = 0; i < tiers.length; i++) {
    if (tiers[i].length) {
      chosen = tiers[i];
      minDarts = i + 1;
      break;
    }
  }
  if (!minDarts) return { routes: [], minDarts: null };

  if (opts.showOnlyPreferred) {
    chosen = chosen.filter((r) => finishMatchesPref(r.darts[r.darts.length - 1]));
  }

  const sorted = sortRoutes(chosen, opts.preferredDoubles);
  return { routes: sorted, minDarts };
}

function dedupeRoutes(routes: Route[]): Route[] {
  const seen = new Set<string>();
  return routes.filter((r) => {
    const key = r.darts.map((d) => d.code).join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortRoutes(routes: Route[], preferred: Set<string>): Route[] {
  return [...routes].sort((r1, r2) => {
    const last1 = r1.darts[r1.darts.length - 1].code;
    const last2 = r2.darts[r2.darts.length - 1].code;
    const p1 = preferred.has(last1) ? 1 : 0;
    const p2 = preferred.has(last2) ? 1 : 0;
    if (p1 !== p2) return p2 - p1;
    const v1 = r1.darts.reduce((s, d) => s + d.value, 0);
    const v2 = r2.darts.reduce((s, d) => s + d.value, 0);
    if (v1 !== v2) return v2 - v1;
    return r1.darts.map((d) => d.code).join().localeCompare(r2.darts.map((d) => d.code).join());
  });
}

// -------------------- UI Components -------------------- //

function Pill({ children, active = false, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center rounded-full border px-3 py-1 text-sm transition " +
        (active
          ? "border-red-500/50 bg-red-500/20 text-white"
          : "border-slate-600/60 bg-slate-800/60 text-white hover:bg-slate-700/60")
      }
    >
      {children}
    </button>
  );
}

function RouteRow({ route }: { route: Route }) {
  return (
    <div className="flex items-center gap-2 text-base">
      {route.darts.map((d, idx) => (
        <React.Fragment key={idx}>
          <Badge
            variant="secondary"
            className={
              "rounded-full px-3 py-1 text-base border text-white " +
              (idx === route.darts.length - 1
                ? "border-red-500/50 bg-red-500/20"
                : "border-slate-600/60 bg-slate-800/60")
            }
          >
            {pretty(d)}
          </Badge>
          {idx < route.darts.length - 1 && <ChevronRight className="h-4 w-4 opacity-60 text-white" />}
        </React.Fragment>
      ))}
    </div>
  );
}

function TripleDoubleCheatsheet() {
  return (
    <Card className="h-fit border-slate-700/60 bg-slate-900/60 text-white">
      <CardHeader>
        <CardTitle>Rappel des scores</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="mb-2 text-sm font-medium uppercase tracking-wide opacity-70">
            Triples (T)
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {triples.map((t) => (
              <span key={t.code} className="inline-flex items-center rounded-full border border-slate-700/60 bg-slate-800/60 px-3 py-1 text-sm text-white">
                {`${t.code} = ${t.value}`}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium uppercase tracking-wide opacity-70">
            Doubles (D)
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {doubles.map((d) => (
              <span key={d.code} className="inline-flex items-center rounded-full border border-slate-700/60 bg-slate-800/60 px-3 py-1 text-sm text-white">
                {`${d.code} = ${d.value}`}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm opacity-70">
            * Le dernier tir doit être un double (y compris Double Bull = 50).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CheckoutApp() {
  const [score, setScore] = useState<number>(170);
  const [preferredDoubles, setPreferredDoubles] = useState<Set<string>>(new Set(["D20", "D16"]));
  const [showOnlyPreferred, setShowOnlyPreferred] = useState<boolean>(false);

  const { routes, minDarts } = useMemo(
    () => computeMinimalCheckout(score, { preferredDoubles, showOnlyPreferred }),
    [score, preferredDoubles, showOnlyPreferred]
  );

  useEffect(() => {
    if (score > 170) setScore(170);
    if (score < 2) setScore(2);
  }, [score]);

  const togglePref = (code: string) => {
    setPreferredDoubles((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0f1f] text-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-8">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-slate-700/60 bg-slate-900/60 text-white">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Calculateur de Checkout (≤ 170)</span>
                <Button
                  size="icon"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => setScore(170)}
                  title="Remettre à 170"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Label htmlFor="score">Votre score</Label>
                  <Input
                    id="score"
                    type="number"
                    min={2}
                    max={170}
                    className="text-lg bg-slate-800/60 border-slate-700/60 text-white"
                    value={isNaN(score) ? "" : score}
                    onChange={(e) => setScore(parseInt(e.target.value || "0", 10))}
                  />
                  <p className="mt-1 text-xs opacity-70">
                    Tapez un score entre 2 et 170 (sortie sur un double obligatoire). Les routes via le Bull sont incluses automatiquement.
                  </p>
                </div>
                <div className="flex flex-row sm:flex-col gap-2 items-stretch">
                  <Button className="bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 text-white" onClick={() => setScore((s) => Math.max(2, Math.min(170, s - 1)))}>
                    −1
                  </Button>
                  <Button className="bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 text-white" onClick={() => setScore((s) => Math.max(2, Math.min(170, s + 1)))}>
                    +1
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Doubles recommandées (priorisées)</Label>
                  <div className="flex items-center gap-2 text-xs">
                    <input
                      id="onlypref"
                      type="checkbox"
                      className="h-4 w-4 accent-red-600"
                      checked={showOnlyPreferred}
                      onChange={(e) => setShowOnlyPreferred(e.target.checked)}
                    />
                    <Label htmlFor="onlypref" className="text-xs">Afficher uniquement ces doubles</Label>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["D20","D16","D12","D10","D8","D6"].map((d) => (
                    <Pill key={d} active={preferredDoubles.has(d)} onClick={() => togglePref(d)}>
                      {d}
                    </Pill>
                  ))}
                </div>
                <p className="text-xs opacity-70">Ex.: D20 ou D16 gardent des setups confortables même en cas de raté.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-slate-700/60 bg-slate-900/60 text-white">
            <CardHeader>
              <CardTitle>
                {minDarts ? (
                  <span>
                    {routes.length} possibilité{routes.length > 1 ? "s" : ""} en {minDarts} fléchette{minDarts > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span>Aucune sortie possible</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {minDarts && routes.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {routes.map((r, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-700/60 bg-slate-800/30 p-3 hover:bg-slate-800/60 text-white">
                      <RouteRow route={r} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="opacity-70">Ajustez vos préférences de double ou le score.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <TripleDoubleCheatsheet />
        </motion.div>
      </div>
    </div>
  );
}
