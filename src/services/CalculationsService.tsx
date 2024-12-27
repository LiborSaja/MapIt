import { SegmentData } from "../interfaces/Interface";
import { toLonLat } from "ol/proj";
import { Coordinate } from "ol/coordinate";
import { fromLonLat } from "ol/proj";

//transformace do web mercator před výpočtem
export const transformToCartesian = (
    coord: [number, number]
): [number, number] => {
    const transformed = fromLonLat(coord);
    return [transformed[0], transformed[1]];
};

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

//výpočet směru - azimutu, využívá trigonometrické funkce
export const calculateAzimuth = (
    lon1: number,
    lat1: number,
    lon2: number,
    lat2: number
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
    let azimuth = Math.atan2(x, y);
    azimuth = (radToDeg(azimuth) + 360) % 360;

    return azimuth;
};

//výpočet vzdálenosti mezi dvěma body, bere v úvahu zakřivení země
export const haversineDistance = (
    coord1: [number, number],
    coord2: [number, number]
): number => {
    const R = 6371e3; //poloměr Země v metrech

    const [lon1, lat1] = coord1.map(degToRad);
    const [lon2, lat2] = coord2.map(degToRad);

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

//vypočet vnitřního úhlu mezi dvěma liniemi, které jsou definovány třemi body
export const calculateAngle = (
    prev: [number, number],
    current: [number, number],
    next: [number, number]
): number => {
    //převod z geodetického systému do kartezského pro přesnost
    const transformedPrev = transformToCartesian(prev);
    const transformedCurrent = transformToCartesian(current);
    const transformedNext = transformToCartesian(next);

    const angle = calculateInnerAngle(
        transformedPrev,
        transformedCurrent,
        transformedNext
    );

    return angle;
};

//vypočet úhlu mezi dvěma vektory, které jsou definovány třemi body
export const calculateInnerAngle = (
    prev: [number, number],
    current: [number, number],
    next: [number, number]
): number => {
    //definice vektorů (x = lon, y = lat)
    const vector1 = [prev[1] - current[1], prev[0] - current[0]];
    const vector2 = [next[1] - current[1], next[0] - current[0]];

    //skalární součin
    const dotProduct = vector1[0] * vector2[0] + vector1[1] * vector2[1];

    //délky vektorů pomocí pythagorovy věty
    const magnitude1 = Math.sqrt(vector1[0] ** 2 + vector1[1] ** 2);
    const magnitude2 = Math.sqrt(vector2[0] ** 2 + vector2[1] ** 2);

    //výpočet úhlu v radiánech
    let angleRad = Math.acos(dotProduct / (magnitude1 * magnitude2));

    //převod úhlu na stupně
    let angleDeg = radToDeg(angleRad);

    return angleDeg;
};

//zpracovává seznam souřadnic a vypočítá vlastnosti jednotlivých linií
export const calculateAllProperties = (
    coordinates: number[][]
): SegmentData[] => {
    const results: SegmentData[] = [];

    //výpočet délky a azimutu pro každou linii
    for (let i = 0; i < coordinates.length - 1; i++) {
        const coord1 = [coordinates[i][0], coordinates[i][1]] as [
            number,
            number
        ];
        const coord2 = [coordinates[i + 1][0], coordinates[i + 1][1]] as [
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

    //výpočet úhlů mezi sousedními liniemi
    for (let i = 1; i < results.length; i++) {
        const prev = [coordinates[i - 1][0], coordinates[i - 1][1]] as [
            number,
            number
        ];
        const current = [coordinates[i][0], coordinates[i][1]] as [
            number,
            number
        ];
        const next = [coordinates[i + 1][0], coordinates[i + 1][1]] as [
            number,
            number
        ];

        results[i - 1].angleToNext = calculateAngle(prev, current, next);
    }

    return results;
};

//výpočet převodu kilometry/míle
export const convertDistance = (value: number, unit: "km" | "mil"): string => {
    return unit === "km" ? value.toFixed(2) : (value * 0.621371).toFixed(2);
};

//výpočet převodu stupně/radiány
export const convertAngle = (value: number, unit: "°" | "rad"): string => {
    return unit === "°" ? value.toFixed(2) : degToRad(value).toFixed(2);
};

//výpočet celkové délky polylinie
export const calculateTotalLength = (segments: SegmentData[]): number => {
    return segments.reduce((sum, segment) => sum + segment.length, 0);
};
