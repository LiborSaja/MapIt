// typ pro body a linie na mapě
export interface MapElement {
    id: string;
    type: "point" | "line";
    lat?: number; // Pro bod
    lon?: number; // Pro bod
    angle?: number; // Pro bod (vnitřní úhel)
    azimuth?: string; // Pro linii
    distance?: number; // Pro linii
}
