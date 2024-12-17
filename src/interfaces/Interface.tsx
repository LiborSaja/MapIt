//modely pro zobrazování dat
//model pro jednu linii polylinie
export type SegmentData = {
    segment: number;
    length: number;
    azimuth: number;
    angleToNext?: number;
    startLatLon: [number, number];
    endLatLon: [number, number];
};

//model pro celou polylinii
export type LineData = {
    id: string;
    segments: SegmentData[];
};
