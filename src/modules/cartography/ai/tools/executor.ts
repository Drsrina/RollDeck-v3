/**
 * Agent Tool Executor with Zod validation, Undo/Redo integration,
 * and AI Layer isolation.
 */

import { useMapStore } from '../../store/mapStore';
import {
  AddLabelSchema,
  AddMarkerSchema,
  AddRiverSchema,
  AddRoadSchema,
  AddStampSchema,
  GenerateNamesSchema,
  GenerateWorldSchema,
  GetMapStateSchema,
  PaintTerrainSchema,
  PlaceImageSchema,
  SetStyleSchema,
} from './schemas';
import { ToolCall } from '../providers/types';
import { AiProposedAction, MapMarker, SplinePath, StampItem, TextLabel } from '../../types/map';
import { Mulberry32 } from '../../core/prng';
import { generateGeographicFeatureName, generateKingdomName, generateSettlementName } from '../../core/nameGenerator';

export interface ExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  proposal?: AiProposedAction;
}

export function executeAgentTool(
  toolCall: ToolCall,
  isProposeOnly: boolean = false
): ExecutionResult {
  const store = useMapStore.getState();

  try {
    switch (toolCall.name) {
      case 'get_map_state': {
        GetMapStateSchema.parse(toolCall.arguments || {});
        const doc = store.doc;
        const summary = {
          title: doc.title,
          mode: doc.mode,
          style: doc.style,
          dimensions: `${doc.width}x${doc.height}`,
          numSettlements: doc.settlements.length,
          numMarkers: doc.markers.length,
          numStamps: doc.stamps.length,
          numPaths: doc.paths.length,
          settlements: doc.settlements.map((s) => `${s.name} (${s.type}, ${s.culture})`),
          markers: doc.markers.map((m) => `#${m.number}: ${m.title} ${m.isSecret ? '[SEGREDO]' : ''}`),
          layers: doc.layers.map((l) => `${l.name} (${l.visible ? 'visível' : 'oculta'})`),
        };
        return { success: true, message: 'Estado do mapa extraído com sucesso.', data: summary };
      }

      case 'generate_world': {
        const args = GenerateWorldSchema.parse(toolCall.arguments);
        if (isProposeOnly) {
          return {
            success: true,
            message: `Plano: Gerar novo mundo com semente ${args.seed || 12345} e ${args.cities || 8} cidades.`,
            proposal: {
              id: `prop-${Date.now()}`,
              tool: toolCall.name,
              description: `Gerar novo mundo procedural`,
              payload: args,
              status: 'pending',
            },
          };
        }
        store.generateWorld({
          seed: args.seed,
          landRatio: args.landPercent ? args.landPercent / 100 : undefined,
          numContinents: args.continents,
          roughness: args.roughness,
          numSettlements: args.cities,
        });
        return { success: true, message: 'Mundo gerado com sucesso pela IA!' };
      }

      case 'paint_terrain': {
        const args = PaintTerrainSchema.parse(toolCall.arguments);
        if (args.circle) {
          if (isProposeOnly) {
            return {
              success: true,
              message: `Plano: Pintar ${args.biome} na posição (${args.circle.x}, ${args.circle.y}) com raio ${args.circle.radius}px.`,
              proposal: {
                id: `prop-${Date.now()}`,
                tool: toolCall.name,
                description: `Pintar bioma ${args.biome}`,
                payload: args,
                status: 'pending',
              },
            };
          }
          store.paintTerrain(args.circle.x, args.circle.y, args.biome as any, args.circle.radius);
          return { success: true, message: `Bioma ${args.biome} aplicado!` };
        }
        return { success: false, message: 'Coordenadas do círculo ausentes.' };
      }

      case 'add_stamp': {
        const args = AddStampSchema.parse(toolCall.arguments);
        const stamp: StampItem = {
          id: `ai-stamp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: args.type as any,
          x: args.x,
          y: args.y,
          scale: args.scale ?? 1,
          rotation: args.rotation ?? 0,
          opacity: 1,
        };

        if (isProposeOnly) {
          return {
            success: true,
            message: `Plano: Adicionar carimbo ${args.type} em (${args.x}, ${args.y}).`,
            proposal: {
              id: `prop-${Date.now()}`,
              tool: toolCall.name,
              description: `Adicionar carimbo ${args.type}`,
              payload: args,
              status: 'pending',
              previewElements: { stamps: [stamp] },
            },
          };
        }

        store.addStampItem(stamp);
        return { success: true, message: `Carimbo ${args.type} adicionado!`, data: stamp };
      }

      case 'add_river': {
        const args = AddRiverSchema.parse(toolCall.arguments);
        const riverPath: SplinePath = {
          id: `ai-river-${Date.now()}`,
          type: 'river',
          points: args.points,
          width: args.width ?? 4,
        };

        if (isProposeOnly) {
          return {
            success: true,
            message: `Plano: Traçar rio com ${args.points.length} pontos de curvatura.`,
            proposal: {
              id: `prop-${Date.now()}`,
              tool: toolCall.name,
              description: 'Traçar novo rio suave',
              payload: args,
              status: 'pending',
              previewElements: { paths: [riverPath] },
            },
          };
        }

        store.pushHistory();
        useMapStore.setState((state) => ({
          doc: { ...state.doc, paths: [...state.doc.paths, riverPath], updatedAt: Date.now() },
        }));
        return { success: true, message: 'Rio criado pela IA!' };
      }

      case 'add_road': {
        const args = AddRoadSchema.parse(toolCall.arguments);
        const roadPath: SplinePath = {
          id: `ai-road-${Date.now()}`,
          type: 'road',
          points: [args.from, ...(args.waypoints || []), args.to],
          width: args.width ?? 3,
          dashed: true,
        };

        if (isProposeOnly) {
          return {
            success: true,
            message: `Plano: Conectar estrada de (${args.from.x}, ${args.from.y}) até (${args.to.x}, ${args.to.y}).`,
            proposal: {
              id: `prop-${Date.now()}`,
              tool: toolCall.name,
              description: 'Criar estrada',
              payload: args,
              status: 'pending',
              previewElements: { paths: [roadPath] },
            },
          };
        }

        store.pushHistory();
        useMapStore.setState((state) => ({
          doc: { ...state.doc, paths: [...state.doc.paths, roadPath], updatedAt: Date.now() },
        }));
        return { success: true, message: 'Estrada conectada com sucesso!' };
      }

      case 'add_label': {
        const args = AddLabelSchema.parse(toolCall.arguments);
        const label: TextLabel = {
          id: `ai-label-${Date.now()}`,
          text: args.text,
          x: args.position.x,
          y: args.position.y,
          rotation: 0,
          fontSize: args.size ?? 16,
          fontFamily: args.font ?? 'Cinzel',
          color: '#3a2618',
          isBanner: args.isBanner,
        };

        if (isProposeOnly) {
          return {
            success: true,
            message: `Plano: Criar rótulo "${args.text}" em (${args.position.x}, ${args.position.y}).`,
            proposal: {
              id: `prop-${Date.now()}`,
              tool: toolCall.name,
              description: `Adicionar rótulo "${args.text}"`,
              payload: args,
              status: 'pending',
              previewElements: { labels: [label] },
            },
          };
        }

        store.addTextLabel(label);
        return { success: true, message: `Rótulo "${args.text}" inserido!` };
      }

      case 'add_marker': {
        const args = AddMarkerSchema.parse(toolCall.arguments);
        const marker: MapMarker = {
          id: `ai-marker-${Date.now()}`,
          number: store.doc.markers.length + 1,
          x: args.x,
          y: args.y,
          title: args.title,
          description: args.description,
          isSecret: args.secret ?? false,
          category: args.category as any ?? 'poi',
        };

        if (isProposeOnly) {
          return {
            success: true,
            message: `Plano: Inserir marcador "${args.title}" ${args.secret ? '(Segredo do Mestre)' : ''}.`,
            proposal: {
              id: `prop-${Date.now()}`,
              tool: toolCall.name,
              description: `Marcador #${marker.number}: ${args.title}`,
              payload: args,
              status: 'pending',
              previewElements: { markers: [marker] },
            },
          };
        }

        store.addMarker(marker);
        return { success: true, message: `Marcador #${marker.number} adicionado com sucesso!` };
      }

      case 'set_style': {
        const args = SetStyleSchema.parse(toolCall.arguments);
        store.setStyle(args.styleId as any);
        return { success: true, message: `Estilo visual alterado para ${args.styleId}!` };
      }

      case 'generate_names': {
        const args = GenerateNamesSchema.parse(toolCall.arguments);
        const rng = new Mulberry32(Date.now());
        const names: string[] = [];
        for (let i = 0; i < (args.count || 5); i++) {
          if (args.kind === 'kingdom') names.push(generateKingdomName(args.culture as any, rng));
          else if (args.kind === 'settlement') names.push(generateSettlementName(args.culture as any, 'city', rng));
          else names.push(generateGeographicFeatureName(args.kind as any, args.culture as any, rng));
        }
        return { success: true, message: `Nomes gerados: ${names.join(', ')}`, data: names };
      }

      default:
        return { success: false, message: `Ferramenta desconhecida: ${toolCall.name}` };
    }
  } catch (err: any) {
    return { success: false, message: `Falha na validação Zod: ${err.message}` };
  }
}

/**
 * Delete all items created by the AI Agent in one batch.
 */
export function clearAllAiGeneratedItems() {
  const store = useMapStore.getState();
  store.pushHistory();

  useMapStore.setState((state) => ({
    doc: {
      ...state.doc,
      stamps: state.doc.stamps.filter((s) => !s.id.startsWith('ai-')),
      paths: state.doc.paths.filter((p) => !p.id.startsWith('ai-')),
      labels: state.doc.labels.filter((l) => !l.id.startsWith('ai-')),
      markers: state.doc.markers.filter((m) => !m.id.startsWith('ai-')),
      imageObjects: state.doc.imageObjects ? state.doc.imageObjects.filter((img) => !img.isAiGenerated) : [],
      updatedAt: Date.now(),
    },
  }));
}
