import { SegmentData } from "../interfaces/Interface";
import { toLonLat } from "ol/proj";
import { Coordinate } from "ol/coordinate";

export const transformCoordinate = (coord: Coordinate): number[] => {
    const transformed = toLonLat(coord); // Převede EPSG:3857 na EPSG:4326
    return transformed; // Vrací [longitude, latitude]
};

export const degToRad = (degrees: number): number => {
    return (degrees * Math.PI) / 180;
};

export const radToDeg = (radians: number): number => {
    return (radians * 180) / Math.PI;
};

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

export const calculateAngleFromAzimuths = (
    azimuth1: number,
    azimuth2: number
): number => {
    const angle = Math.abs(azimuth1 - azimuth2);
    return Math.min(angle, 360 - angle);
};

export const haversineDistance = (
    coord1: [number, number], // [latitude, longitude]
    coord2: [number, number] // [latitude, longitude]
): number => {
    const R = 6371e3; // Poloměr Země v metrech

    const [lat1, lon1] = coord1.map((v) => (v * Math.PI) / 180); // Radiány
    const [lat2, lon2] = coord2.map((v) => (v * Math.PI) / 180);

    const deltaLat = lat2 - lat1;
    const deltaLon = lon2 - lon1;

    const a =
        Math.sin(deltaLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Vzdálenost v metrech
    return distance;
};

export const calculateLineProperties = (
    coord1: [number, number],
    coord2: [number, number]
): { azimuth: number; length: number } => {
    const lengthInMeters = haversineDistance(coord1, coord2); // Délka v metrech
    const lengthInKilometers = lengthInMeters / 1000; // Převod na kilometry

    const azimuth = calculateAzimuth(
        coord1[0],
        coord1[1],
        coord2[0],
        coord2[1]
    );

    return { azimuth, length: lengthInKilometers };
};

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
