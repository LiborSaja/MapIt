export type SegmentData = {
    segment: number;
    length: number;
    azimuth: number;
    angleToNext?: number;
    startLatLon: [number, number]; // Souřadnice začátku segmentu
    endLatLon: [number, number]; // Souřadnice konce segmentu
};

export type LineData = {
    id: string; // Unikátní ID pro každou polyčáru
    segments: SegmentData[]; // Pole dat segmentů pro tuto polyčáru
};
