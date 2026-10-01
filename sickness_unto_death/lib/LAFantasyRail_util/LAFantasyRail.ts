  export type Coordinates = [
    longitude: number,
    latitude: number,
  ];

  export type FantasyStation = {
    id: string;
    name: string;
    street1: string;
    street2: string;
    coordinates: Coordinates;
  };

  export type FantasyLine = {
    id: string;
    name: string;
    color: string;
    stationIds: string[];
    coordinates: Coordinates[];
  };
