export interface PointData {
    lat: string; // Zeměpisná šířka
    lon: string; // Zeměpisná délka
    angle: string | null; // Úhel (null, pokud není vypočten)
}

export interface LineData {
    azimuth: string; // Azimut (ve stupních)
    length: string; // Délka (v km)
}

export interface PolylineData {
    [key: string]: {
        [key: string]: PointData | LineData;
    }[];
}
