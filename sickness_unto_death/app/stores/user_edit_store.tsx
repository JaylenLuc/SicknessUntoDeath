
"use client";

import { create } from "zustand";
import {
createJSONStorage,
persist,
} from "zustand/middleware";

import type {
FantasyLine,
FantasyStation,
} from "@/lib/LAFantasyRail_util/LAFantasyRail";

export type EditorMode =
| "browse"
| "add-station"
| "build-line";

type StationChanges = Partial<
Omit<FantasyStation, "id">
>;

type LineChanges = Partial<
Omit<FantasyLine, "id">
>;

type UserDraftState = {
stations: FantasyStation[];
lines: FantasyLine[];

editorMode: EditorMode;
selectedStationId: string | null;
selectedLineId: string | null;

setEditorMode: (
    mode: EditorMode,
) => void;

selectStation: (
    stationId: string | null,
) => void;

selectLine: (
    lineId: string | null,
) => void;

addStation: (
    station: FantasyStation,
) => void;

updateStation: (
    stationId: string,
    changes: StationChanges,
) => void;

removeStation: (
    stationId: string,
) => void;

addLine: (
    line: FantasyLine,
) => void;

updateLine: (
    lineId: string,
    changes: LineChanges,
) => void;

removeLine: (
    lineId: string,
) => void;

clearDraft: () => void;
};

export const useUserDraftStore =
create<UserDraftState>()(
    persist(
    (set) => ({
        // User drafts start empty.
        stations: [],
        lines: [],

        editorMode: "browse",
        selectedStationId: null,
        selectedLineId: null,

        setEditorMode: (editorMode) =>
        set({
            editorMode,
            selectedStationId: null,
            selectedLineId: null,
        }),

        selectStation: (
        selectedStationId,
        ) =>
        set({
            selectedStationId,
            selectedLineId: null,
        }),

        selectLine: (selectedLineId) =>
        set({
            selectedLineId,
            selectedStationId: null,
        }),

        addStation: (station) =>
        set((state) => ({
            stations: [
            ...state.stations,
            station,
            ],
            selectedStationId: station.id,
            selectedLineId: null,
        })),

        updateStation: (
        stationId,
        changes,
        ) =>
        set((state) => ({
            stations: state.stations.map(
            (station) =>
                station.id === stationId
                ? {
                    ...station,
                    ...changes,
                    }
                : station,
            ),
        })),

        removeStation: (stationId) =>
        set((state) => {
            const updatedLines = state.lines
            .map((line) => ({
                ...line,
                stationIds:
                line.stationIds.filter(
                    (id) => id !== stationId,
                ),
            }))
            .filter(
                (line) =>
                line.stationIds.length >= 2,
            );

            return {
            stations:
                state.stations.filter(
                (station) =>
                    station.id !== stationId,
                ),
            lines: updatedLines,

            selectedStationId:
                state.selectedStationId ===
                stationId
                ? null
                : state.selectedStationId,
            };
        }),

        addLine: (line) =>
        set((state) => ({
            lines: [...state.lines, line],
            selectedLineId: line.id,
            selectedStationId: null,
        })),

        updateLine: (
        lineId,
        changes,
        ) =>
        set((state) => ({
            lines: state.lines.map(
            (line) =>
                line.id === lineId
                ? {
                    ...line,
                    ...changes,
                    }
                : line,
            ),
        })),

        removeLine: (lineId) =>
        set((state) => ({
            lines: state.lines.filter(
            (line) => line.id !== lineId,
            ),

            selectedLineId:
            state.selectedLineId === lineId
                ? null
                : state.selectedLineId,
        })),

        clearDraft: () =>
        set({
            stations: [],
            lines: [],
            editorMode: "browse",
            selectedStationId: null,
            selectedLineId: null,
        }),
    }),
    {
        name: "la-fantasy-user-draft",

        storage: createJSONStorage(
        () => localStorage,
        ),

        // Only map data is permanent. Editor
        // modes and selections reset on reload.
        partialize: (state) => ({
        stations: state.stations,
        lines: state.lines,
        }),
    },
    ),
);

