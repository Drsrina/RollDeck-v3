import { Dices, FastForward, Sparkles } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { getThemePreset } from '../../lib/theme';
import { useAppStore } from '../../store/useAppStore';

interface PhysicsDie {
  id: string;
  name: string;
  sides: number;
  color: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  rotVx: number;
  rotVy: number;
  rotVz: number;
  face: number;
  bounces: number;
  settled: boolean;
  trail: { x: number; y: number; opacity: number }[];
}

export const DiceRollAnimation: React.FC = () => {
  const {
    isRolling,
    rollingDiceList,
    tray,
    allDice,
    settings,
    skipRollAnimation,
  } = useAppStore();

  const currentPreset = getThemePreset(settings.themeId);
  const animFrameRef = useRef<number | null>(null);
  const [diceState, setDiceState] = useState<PhysicsDie[]>([]);
  const diceMapRef = useRef<PhysicsDie[]>([]);

  // Setup physics simulation when rolling starts
  useEffect(() => {
    if (!isRolling) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setDiceState([]);
      diceMapRef.current = [];
      return;
    }

    if (settings.reduceMotion || settings.diceRoll3DEnabled === false) {
      return;
    }

    // Determine which dice are rolling
    const lookup = new Map(allDice.map((d) => [d.id, d]));
    const itemsToRoll: { name: string; sides: number; color: string }[] = [];

    if (rollingDiceList && rollingDiceList.length > 0) {
      for (const item of rollingDiceList) {
        const count = Math.min(item.count, 8);
        for (let i = 0; i < count; i++) {
          itemsToRoll.push({
            name: item.name,
            sides: item.sides,
            color: item.color || currentPreset.colors.primary,
          });
        }
      }
    } else if (tray.length > 0) {
      for (const item of tray) {
        const def = lookup.get(item.dieId) || {
          name: item.dieId,
          sides: 20,
          color: currentPreset.colors.primary,
        };
        const count = Math.min(item.count, 8);
        for (let i = 0; i < count; i++) {
          itemsToRoll.push({
            name: def.name,
            sides: def.sides || 20,
            color: def.color || currentPreset.colors.primary,
          });
        }
      }
    }

    // Fallback if rolling directly without active tray
    if (itemsToRoll.length === 0) {
      itemsToRoll.push(
        { name: 'd20', sides: 20, color: currentPreset.colors.primary },
        { name: 'd6', sides: 6, color: currentPreset.colors.secondary }
      );
    }

    // Cap total active physics dice to 10 for smooth 60fps rendering
    const cappedItems = itemsToRoll.slice(0, 10);
    const width = typeof window !== 'undefined' ? window.innerWidth : 800;
    const height = typeof window !== 'undefined' ? window.innerHeight : 600;

    const initialDice: PhysicsDie[] = cappedItems.map((item, index) => {
      // Spawn from randomized perimeter corners or top edges, moving inward
      const fromLeft = index % 2 === 0;
      const spawnX = fromLeft
        ? Math.random() * (width * 0.3) + 20
        : width - (Math.random() * (width * 0.3) + 60);
      const spawnY = Math.random() * (height * 0.35) + 40;

      // Velocities heading toward table center with bounce
      const targetCenterX = width * 0.5 + (Math.random() * 200 - 100);
      const targetCenterY = height * 0.5 + (Math.random() * 200 - 100);

      const vx = (targetCenterX - spawnX) * (0.04 + Math.random() * 0.03);
      const vy = (targetCenterY - spawnY) * (0.04 + Math.random() * 0.03);

      return {
        id: `phys-die-${index}-${Date.now()}`,
        name: item.name,
        sides: item.sides,
        color: item.color,
        x: spawnX,
        y: spawnY,
        z: 160 + index * 25, // Initial altitude
        vx,
        vy,
        vz: -2 - Math.random() * 3, // Initial downward launch speed
        rx: Math.random() * 360,
        ry: Math.random() * 360,
        rz: Math.random() * 360,
        rotVx: (Math.random() * 24 + 18) * (Math.random() > 0.5 ? 1 : -1),
        rotVy: (Math.random() * 24 + 18) * (Math.random() > 0.5 ? 1 : -1),
        rotVz: (Math.random() * 16 + 12) * (Math.random() > 0.5 ? 1 : -1),
        face: Math.floor(Math.random() * item.sides) + 1,
        bounces: 0,
        settled: false,
        trail: [],
      };
    });

    diceMapRef.current = initialDice;
    setDiceState([...initialDice]);

    // Physics Animation Loop
    let lastFaceUpdate = performance.now();

    const updatePhysics = (now: number) => {
      const currentDice = diceMapRef.current;
      const shouldUpdateFaces = now - lastFaceUpdate > 65;
      if (shouldUpdateFaces) lastFaceUpdate = now;

      let anyMoving = false;

      for (let i = 0; i < currentDice.length; i++) {
        const d = currentDice[i];
        if (d.settled) continue;
        anyMoving = true;

        // Gravity & vertical motion
        const gravity = 0.65;
        d.vz += gravity;
        d.z -= d.vz;

        // Bounce on imaginary table floor (z <= 0)
        if (d.z <= 0) {
          d.z = 0;
          d.vz = -d.vz * 0.54; // bounce elasticity
          d.bounces++;

          // Ground friction
          d.vx *= 0.82;
          d.vy *= 0.82;
          d.rotVx *= 0.72;
          d.rotVy *= 0.72;
          d.rotVz *= 0.72;

          // Settle threshold
          if (Math.abs(d.vz) < 1.2 && d.bounces >= 3) {
            d.settled = true;
            d.vz = 0;
            d.vx = 0;
            d.vy = 0;
            d.rotVx = 0;
            d.rotVy = 0;
            d.rotVz = 0;
            // Align face toward viewer smoothly
            d.rx = 0;
            d.ry = 0;
          }
        }

        // Horizontal velocity & damping
        d.x += d.vx;
        d.y += d.vy;
        d.vx *= 0.985;
        d.vy *= 0.985;

        // Viewport boundaries bounce
        const minX = 40;
        const maxX = width - 70;
        const minY = 60;
        const maxY = height - 90;

        if (d.x < minX) {
          d.x = minX;
          d.vx = Math.abs(d.vx) * 0.65;
        } else if (d.x > maxX) {
          d.x = maxX;
          d.vx = -Math.abs(d.vx) * 0.65;
        }

        if (d.y < minY) {
          d.y = minY;
          d.vy = Math.abs(d.vy) * 0.65;
        } else if (d.y > maxY) {
          d.y = maxY;
          d.vy = -Math.abs(d.vy) * 0.65;
        }

        // 3D Rotations
        d.rx += d.rotVx;
        d.ry += d.rotVy;
        d.rz += d.rotVz;
        d.rotVx *= 0.975;
        d.rotVy *= 0.975;
        d.rotVz *= 0.975;

        // Rapid random numbers while tumbling
        if (shouldUpdateFaces && !d.settled) {
          d.face = Math.floor(Math.random() * d.sides) + 1;
        }

        // Particle trail
        if (d.z > 10 && (Math.abs(d.vx) > 1 || Math.abs(d.vy) > 1)) {
          d.trail = [
            { x: d.x, y: d.y, opacity: 0.8 },
            ...d.trail.slice(0, 3).map((t) => ({ ...t, opacity: t.opacity * 0.7 })),
          ];
        } else {
          d.trail = d.trail.map((t) => ({ ...t, opacity: t.opacity * 0.7 })).filter((t) => t.opacity > 0.05);
        }
      }

      setDiceState([...currentDice]);

      if (anyMoving) {
        animFrameRef.current = requestAnimationFrame(updatePhysics);
      }
    };

    animFrameRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    isRolling,
    rollingDiceList,
    tray,
    allDice,
    settings.reduceMotion,
    settings.diceRoll3DEnabled,
    currentPreset.colors.primary,
    currentPreset.colors.secondary,
  ]);

  if (!isRolling) return null;

  // Reduced motion: gentle accessible pulse
  if (settings.reduceMotion) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-none select-none">
        <div
          className="glass-panel-elevated p-6 rounded-2xl flex items-center gap-3 border shadow-2xl"
          style={{ borderColor: `${currentPreset.colors.primary}60` }}
        >
          <div
            className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: currentPreset.colors.primary, borderTopColor: 'transparent' }}
          />
          <span className="text-sm font-bold text-white tracking-wide">
            Calculando rolagem de dados...
          </span>
        </div>
      </div>
    );
  }

  // 3D dice disabled in Settings: fast minimal overlay
  if (settings.diceRoll3DEnabled === false) {
    return (
      <div
        onClick={skipRollAnimation}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs cursor-pointer select-none"
      >
        <div
          className="glass-panel-elevated p-4 px-6 rounded-2xl flex items-center gap-3 border shadow-2xl animate-pulse"
          style={{
            borderColor: `${currentPreset.colors.primary}70`,
            boxShadow: `0 0 25px ${currentPreset.colors.primaryGlow}`,
          }}
        >
          <Dices className="w-6 h-6 animate-spin" style={{ color: currentPreset.colors.primary }} />
          <div>
            <span className="text-sm font-extrabold text-white block">Rolando Dados...</span>
            <span className="text-[10px] text-slate-400 font-mono">Modo Rápido Ativado</span>
          </div>
        </div>
      </div>
    );
  }

  // FULL SCREEN 3D TUMBLING DICE SIMULATION
  return (
    <div
      onClick={skipRollAnimation}
      aria-label="Animação de dados 3D na tela. Toque para pular."
      className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-md cursor-pointer select-none transition-colors duration-300 flex flex-col justify-between"
      style={{
        perspective: '1200px',
        perspectiveOrigin: '50% 50%',
      }}
    >
      {/* Ambient background glow ring */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30 blur-3xl transition-all"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${currentPreset.colors.primaryGlow} 0%, transparent 70%)`,
        }}
      />

      {/* Top Status Header */}
      <div className="relative z-20 pt-6 px-4 flex items-center justify-between max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full animate-ping"
            style={{ backgroundColor: currentPreset.colors.primary }}
          />
          <span
            className="text-xs font-black tracking-widest uppercase font-mono"
            style={{ color: currentPreset.colors.primary }}
          >
            Lançando Dados 3D na Tela
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            skipRollAnimation();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 active:scale-95 transition backdrop-blur-md shadow-md"
        >
          <span>Pular</span>
          <FastForward className="w-3.5 h-3.5 fill-current" />
        </button>
      </div>

      {/* 3D Dice Viewport Space */}
      <div
        className="relative flex-1 w-full h-full pointer-events-none"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {diceState.map((die) => {
          const isD6 = die.sides === 6;
          const isD20 = die.sides === 20;
          const isCritSuccess = isD20 && die.face === 20;
          const isCritFail = isD20 && die.face === 1;

          // Shadow calculations based on altitude z
          const shadowScale = Math.max(0.3, Math.min(1.2, 1 - die.z / 320));
          const shadowOpacity = Math.max(0.12, Math.min(0.7, 0.75 - die.z / 380));

          return (
            <React.Fragment key={die.id}>
              {/* Particle Spark Trail */}
              {die.trail.map((t, idx) => (
                <div
                  key={`trail-${idx}`}
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    left: `${t.x}px`,
                    top: `${t.y}px`,
                    width: `${8 - idx * 1.5}px`,
                    height: `${8 - idx * 1.5}px`,
                    backgroundColor: die.color,
                    opacity: t.opacity * 0.6,
                    boxShadow: `0 0 10px ${die.color}`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              ))}

              {/* Floor Contact Shadow */}
              <div
                className="absolute pointer-events-none rounded-full"
                style={{
                  left: `${die.x}px`,
                  top: `${die.y + 36}px`,
                  width: '56px',
                  height: '20px',
                  backgroundColor: 'rgba(0, 0, 0, 0.85)',
                  filter: 'blur(5px)',
                  opacity: shadowOpacity,
                  transform: `translate(-50%, -50%) scale(${shadowScale})`,
                  transition: 'opacity 0.05s linear',
                }}
              />

              {/* 3D Die Body */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${die.x}px`,
                  top: `${die.y}px`,
                  width: '54px',
                  height: '54px',
                  transformStyle: 'preserve-3d',
                  transform: `translate(-50%, -50%) translateZ(${die.z}px) rotateX(${die.rx}deg) rotateY(${die.ry}deg) rotateZ(${die.rz}deg)`,
                  willChange: 'transform',
                }}
              >
                {isD6 ? (
                  // Authentic 6-sided 3D Cube with 6 real CSS faces
                  <div
                    className="w-full h-full relative"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    {/* Front Face (1) */}
                    <div
                      className="absolute inset-0 rounded-xl border-2 flex items-center justify-center font-black text-lg font-mono shadow-md backdrop-blur-xs"
                      style={{
                        transform: 'translateZ(27px)',
                        borderColor: die.color,
                        color: '#ffffff',
                        backgroundColor: `${die.color}33`,
                        boxShadow: `0 0 15px ${die.color}66`,
                      }}
                    >
                      {die.face}
                    </div>
                    {/* Back Face (6) */}
                    <div
                      className="absolute inset-0 rounded-xl border-2 flex items-center justify-center font-black text-lg font-mono shadow-md backdrop-blur-xs"
                      style={{
                        transform: 'rotateY(180deg) translateZ(27px)',
                        borderColor: die.color,
                        color: '#ffffff',
                        backgroundColor: `${die.color}33`,
                        boxShadow: `0 0 15px ${die.color}66`,
                      }}
                    >
                      {Math.max(1, (die.face + 3) % 6 + 1)}
                    </div>
                    {/* Right Face (2) */}
                    <div
                      className="absolute inset-0 rounded-xl border-2 flex items-center justify-center font-black text-lg font-mono shadow-md backdrop-blur-xs"
                      style={{
                        transform: 'rotateY(90deg) translateZ(27px)',
                        borderColor: die.color,
                        color: '#ffffff',
                        backgroundColor: `${die.color}33`,
                        boxShadow: `0 0 15px ${die.color}66`,
                      }}
                    >
                      2
                    </div>
                    {/* Left Face (5) */}
                    <div
                      className="absolute inset-0 rounded-xl border-2 flex items-center justify-center font-black text-lg font-mono shadow-md backdrop-blur-xs"
                      style={{
                        transform: 'rotateY(-90deg) translateZ(27px)',
                        borderColor: die.color,
                        color: '#ffffff',
                        backgroundColor: `${die.color}33`,
                        boxShadow: `0 0 15px ${die.color}66`,
                      }}
                    >
                      5
                    </div>
                    {/* Top Face (3) */}
                    <div
                      className="absolute inset-0 rounded-xl border-2 flex items-center justify-center font-black text-lg font-mono shadow-md backdrop-blur-xs"
                      style={{
                        transform: 'rotateX(90deg) translateZ(27px)',
                        borderColor: die.color,
                        color: '#ffffff',
                        backgroundColor: `${die.color}33`,
                        boxShadow: `0 0 15px ${die.color}66`,
                      }}
                    >
                      3
                    </div>
                    {/* Bottom Face (4) */}
                    <div
                      className="absolute inset-0 rounded-xl border-2 flex items-center justify-center font-black text-lg font-mono shadow-md backdrop-blur-xs"
                      style={{
                        transform: 'rotateX(-90deg) translateZ(27px)',
                        borderColor: die.color,
                        color: '#ffffff',
                        backgroundColor: `${die.color}33`,
                        boxShadow: `0 0 15px ${die.color}66`,
                      }}
                    >
                      4
                    </div>
                  </div>
                ) : (
                  // Multi-faceted 3D Polyhedral Gem (d20, d12, d10, d8, d4, d100)
                  <div
                    className={`w-full h-full relative rounded-2xl border-2 flex flex-col items-center justify-center font-mono font-black shadow-2xl transition-all ${
                      isCritSuccess
                        ? 'border-amber-400 bg-amber-500/30 ring-4 ring-amber-400/50'
                        : isCritFail
                        ? 'border-rose-500 bg-rose-600/30 ring-4 ring-rose-500/50'
                        : ''
                    }`}
                    style={{
                      transformStyle: 'preserve-3d',
                      borderColor: isCritSuccess ? '#fbbf24' : isCritFail ? '#f43f5e' : die.color,
                      backgroundColor: `${die.color}35`,
                      boxShadow: isCritSuccess
                        ? '0 0 35px rgba(251, 191, 36, 0.8), inset 0 0 15px rgba(251, 191, 36, 0.5)'
                        : isCritFail
                        ? '0 0 35px rgba(244, 63, 94, 0.8), inset 0 0 15px rgba(244, 63, 94, 0.5)'
                        : `0 0 20px ${die.color}88, inset 0 0 12px ${die.color}44`,
                    }}
                  >
                    {/* Gem facet specular light overlay */}
                    <div
                      className="absolute inset-1 rounded-xl border border-white/40 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, transparent 60%)',
                      }}
                    />

                    {/* Die Name Pill */}
                    <span
                      className="text-[9px] uppercase font-bold tracking-wider opacity-80"
                      style={{ color: '#e2e8f0' }}
                    >
                      {die.name}
                    </span>

                    {/* Dynamic Tumbling Number */}
                    <span
                      className={`text-xl font-black ${
                        isCritSuccess
                          ? 'text-amber-300 drop-shadow-[0_0_10px_#fbbf24]'
                          : isCritFail
                          ? 'text-rose-300 drop-shadow-[0_0_10px_#f43f5e]'
                          : 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                      }`}
                    >
                      {die.face}
                    </span>

                    {/* Critical Indicator Sparkle */}
                    {isCritSuccess && (
                      <Sparkles className="w-3.5 h-3.5 text-amber-300 absolute -top-1 -right-1 animate-ping" />
                    )}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Bottom Footer Info / Skip Reminder */}
      <div className="relative z-20 pb-8 px-4 flex flex-col items-center gap-1.5 text-center">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
          <span className="text-xs text-slate-200 font-medium">
            Toque em qualquer lugar da tela para pular
          </span>
          <span className="text-[10px] text-slate-400 font-mono">• crypto.getRandomValues</span>
        </div>
      </div>
    </div>
  );
};
