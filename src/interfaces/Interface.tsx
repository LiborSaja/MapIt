export interface MapObject {
    id: string; // Unikátní ID polyčáry
    points: PointData[]; // Všechny body polyčáry
    lines: LineData[]; // Všechny linie polyčáry
    combinedItems: ItemData[];
}

export interface PointData {
    id: string; // Unikátní ID bodu
    lat: number; // Zeměpisná šířka
    lon: number; // Zeměpisná délka
    angle?: number; // Úhel (volitelné)
}

export interface LineData {
    id: string; // Unikátní ID linie
    start: string; // ID startovního bodu
    end: string; // ID koncového bodu
    azimuth: number; // Azimut
    length: number; // Délka
}

// typ pro společný seznam položek
export type ItemData = {
    type: "point" | "line";
    order: number;
    data: PointData | LineData;
};
