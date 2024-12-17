export type SegmentData = {
    segment: number;
    length: number;
    azimuth: number;
    angleToNext?: number;
    startLatLon: [number, number];
    endLatLon: [number, number];
};

export type LineData = {
    id: string;
    segments: SegmentData[];
};
