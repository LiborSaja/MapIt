import { SegmentData } from "../interfaces/Interface";
import { toLonLat } from "ol/proj";
import { Coordinate } from "ol/coordinate";

//převádí souřadnice z projekce EPSG:3857 (web mercator) na EPSG:4326 (lon, lat), pomocí metody toLonLat()
export const transformCoordinate = (coord: Coordinate): number[] => {
    const transformed = toLonLat(coord);
    return transformed;
};

//převod stupňů na radiány
export const degToRad = (degrees: number): number => {
    return (degrees * Math.PI) / 180;
};

//převod radiánů na stupně
export const radToDeg = (radians: number): number => {
    return (radians * 180) / Math.PI;
};

//výpočet směru - azimutu, využívá trigonometrické funkce
export const calculateAzimuth = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number => {
    lat1 = degToRad(lat1);
    lon1 = degToRad(lon1);
    lat2 = degToRad(lat2);
    lon2 = degToRad(lon2);

    const deltaLon = lon2 - lon1;

    const x = Math.sin(deltaLon) * Math.cos(lat2);
    const y =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

    const azimuth = Math.atan2(x, y);

    return (radToDeg(azimuth) + 360) % 360;
};

//výpočet vnitřního úhlu mezi azimuty (dvěma liniemi polylinie)
export const calculateAngleFromAzimuths = (
    azimuth1: number,
    azimuth2: number
): number => {
    // Převod azimutů na radiány
    const azimuth1Rad = degToRad(azimuth1);
    const azimuth2Rad = degToRad(azimuth2);

    // Vytvoření vektorů ze dvou azimutů
    const vector1 = [Math.cos(azimuth1Rad), Math.sin(azimuth1Rad)];
    const vector2 = [Math.cos(azimuth2Rad), Math.sin(azimuth2Rad)];

    // Skalární a vektorový součin
    const dotProduct = vector1[0] * vector2[0] + vector1[1] * vector2[1];
    const crossProduct = vector1[0] * vector2[1] - vector1[1] * vector2[0];

    // Výpočet úhlu pomocí atan2
    const angle = Math.atan2(Math.abs(crossProduct), dotProduct);

    // Převod na stupně
    return radToDeg(angle);
};

//výpočet vzdálenosti mezi dvěma body, bere v úvahu zakřivení země
export const haversineDistance = (
    coord1: [number, number],
    coord2: [number, number]
): number => {
    const R = 6371e3; //poloměr Země v metrech

    const [lat1, lon1] = coord1.map((v) => (v * Math.PI) / 180);
    const [lat2, lon2] = coord2.map((v) => (v * Math.PI) / 180);

    const deltaLat = lat2 - lat1;
    const deltaLon = lon2 - lon1;

    //Haversinův vzorec
    const a =
        Math.sin(deltaLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;
    return distance;
};

//výpočet délky a azimutu mezi body na mapě
export const calculateLineProperties = (
    coord1: [number, number],
    coord2: [number, number]
): { azimuth: number; length: number } => {
    const lengthInMeters = haversineDistance(coord1, coord2);
    const lengthInKilometers = lengthInMeters / 1000;

    const azimuth = calculateAzimuth(
        coord1[0],
        coord1[1],
        coord2[0],
        coord2[1]
    );

    return { azimuth, length: lengthInKilometers };
};

//výpočet úhlu mezi třemi body
export const calculateAngle = (
    prev: [number, number],
    current: [number, number],
    next: [number, number]
): number => {
    const azimuth1 = calculateAzimuth(prev[0], prev[1], current[0], current[1]);
    const azimuth2 = calculateAzimuth(current[0], current[1], next[0], next[1]);

    return calculateAngleFromAzimuths(azimuth1, azimuth2);
};

export const calculateAllProperties = (
    coordinates: number[][]
): SegmentData[] => {
    const results: SegmentData[] = [];

    for (let i = 0; i < coordinates.length - 1; i++) {
        const coord1 = [coordinates[i][1], coordinates[i][0]] as [
            number,
            number
        ];
        const coord2 = [coordinates[i + 1][1], coordinates[i + 1][0]] as [
            number,
            number
        ];

        const { length, azimuth } = calculateLineProperties(coord1, coord2);
        results.push({
            segment: i + 1,
            length,
            azimuth,
            startLatLon: [coordinates[i][1], coordinates[i][0]],
            endLatLon: [coordinates[i + 1][1], coordinates[i + 1][0]],
        });
    }

    for (let i = 1; i < results.length; i++) {
        const prev = [coordinates[i - 1][1], coordinates[i - 1][0]] as [
            number,
            number
        ];
        const current = [coordinates[i][1], coordinates[i][0]] as [
            number,
            number
        ];
        const next = [coordinates[i + 1][1], coordinates[i + 1][0]] as [
            number,
            number
        ];

        results[i - 1].angleToNext = calculateAngle(prev, current, next);
    }

    return results;
};

export const convertDistance = (value: number, unit: "km" | "mil"): string => {
    return unit === "km" ? value.toFixed(2) : (value * 0.621371).toFixed(2);
};

export const convertAngle = (value: number, unit: "°" | "rad"): string => {
    return unit === "°"
        ? value.toFixed(2)
        : ((value * Math.PI) / 180).toFixed(2);
};

export const calculateTotalLength = (segments: SegmentData[]): number => {
    return segments.reduce((sum, segment) => sum + segment.length, 0);
};
