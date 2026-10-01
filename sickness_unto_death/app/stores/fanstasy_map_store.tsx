import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
FantasyLine,
FantasyStation,
} from "@/lib/LAFantasyRail_util/LAFantasyRail";

type FantasyMapState = {
stations: FantasyStation[];
lines: FantasyLine[];

addStation: (station: FantasyStation) => void;
addLine: (line: FantasyLine) => void;
resetMap: () => void;
};

const demoStations: FantasyStation[] = [
{
    id: "union-station",
    name: "Union Station",
    street1: "Alameda Street",
    street2: "Cesar E Chavez Avenue",
    coordinates: [-118.2365, 34.0562],
},
{
    id: "alvarado-olympic",
    name: "Alvarado / Olympic",
    street1: "Alvarado Street",
    street2: "Olympic Boulevard",
    coordinates: [-118.279, 34.052],
},
];

const demoLines: FantasyLine[] = [
{
    id: "revival-line",
    name: "Revival Line",
    color: "#e11d48",
    stationIds: [
    "union-station",
    "alvarado-olympic",
    ],
    coordinates: demoStations.map(
    (station) => station.coordinates,
    ),
},
];

export const useFantasyMapStore =
create<FantasyMapState>()(
    persist(
    (set) => ({
        stations: demoStations,
        lines: demoLines,

        addStation: (station) =>
        set((state) => ({
            stations: [
            ...state.stations,
            station,
            ],
        })),

        addLine: (line) =>
        set((state) => ({
            lines: [...state.lines, line],
        })),

        resetMap: () =>
        set({
            stations: [],
            lines: [],
        }),
    }),
    {
        name: "la-fantasy-metro",
    },
    ),
);