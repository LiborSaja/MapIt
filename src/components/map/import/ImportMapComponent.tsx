import React, { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import { Map, Overlay, View } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { fromLonLat, transform } from "ol/proj";
import { DragPan, Draw, Modify, MouseWheelZoom, Select } from "ol/interaction";
import "./ImportMapComponent.css";
import Style from "ol/style/Style";
import Stroke from "ol/style/Stroke";
import Circle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Text from "ol/style/Text";
import { Point, LineString } from "ol/geom";
import { Feature } from "ol";
import { getDistance } from "ol/sphere";
import { LineData, MapObject, PointData } from "../../../interfaces/Interface";
import { click } from "ol/events/condition";

const ImportMapComponent: React.FC = () => {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const [map, setMap] = useState<Map | null>(null);
    const [lineSource, setLineSource] = useState<VectorSource | null>(null);
    const [pointSource, setPointSource] = useState<VectorSource | null>(null);
    const drawRef = useRef<Draw | null>(null);
    const [currentAction, setCurrentAction] = useState<string>("line");
    const [featuresData, setFeaturesData] = useState<MapObject[]>([]);

    const [polylines, setPolylines] = useState<LineData[]>([]);
    const [distanceUnit, setDistanceUnit] = useState<"km" | "mil">("km");
    const [angleUnit, setAngleUnit] = useState<"°" | "rad">("°");

    useEffect(() => {
        if (!mapRef.current) return;

        const vectorSource = new VectorSource();
        const pointVectorSource = new VectorSource();

        const vectorLayer = new VectorLayer({
            source: vectorSource,
            style: new Style({
                stroke: new Stroke({
                    color: "blue",
                    width: 3,
                }),
            }),
        });

        const pointLayer = new VectorLayer({
            source: pointVectorSource,
            style: new Style({
                image: new Circle({
                    radius: 5,
                    fill: new Fill({ color: "yellow" }),
                    stroke: new Stroke({ color: "white", width: 1 }),
                }),
            }),
        });

        const mapObject = new Map({
            target: mapRef.current,
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
                vectorLayer,
                pointLayer,
            ],
            view: new View({
                center: fromLonLat([16.626263, 49.197547]),
                zoom: 12,
            }),
        });

        setMap(mapObject);
        setLineSource(vectorSource);
        setPointSource(pointVectorSource);

        return () => {
            mapObject.setTarget(undefined);
        };
    }, []);

    //--------------------------------------------------------------------------------------------------------------------------
    //------------------------------------------------------------ USEEFFECT kreslení ------------------------------------------
    //--------------------------------------------------------------------------------------------------------------------------

    useEffect(() => {
        if (!map || !pointSource || !lineSource || currentAction !== "line")
            return;

        const drawInteraction = new Draw({
            source: lineSource, // Přidává linie do zdroje
            type: "LineString", // Kreslí linie
        });

        map.addInteraction(drawInteraction);
        drawRef.current = drawInteraction;

        drawInteraction.on("drawend", (event) => {
            const geometry = event.feature.getGeometry();

            if (geometry?.getType() === "LineString") {
                const coordinates = (
                    geometry as LineString
                ).getCoordinates() as [number, number][];

                // Vytvoření nového objektu
                const newObjectId = `Object${Date.now()}`;
                const points: PointData[] = [];
                const lines: LineData[] = [];

                // Přidání bodů a linií
                coordinates.forEach((coord, index) => {
                    const transformedCoord = transform(
                        coord as [number, number],
                        "EPSG:3857",
                        "EPSG:4326"
                    ) as [number, number];

                    const pointId = `${newObjectId}_Point${index + 1}`;
                    points.push({
                        id: pointId,
                        lat: transformedCoord[1],
                        lon: transformedCoord[0],
                        angle:
                            index > 0 && index < coordinates.length - 1
                                ? calculateAngle(
                                      transform(
                                          coordinates[index - 1] as [
                                              number,
                                              number
                                          ],
                                          "EPSG:3857",
                                          "EPSG:4326"
                                      ) as [number, number],
                                      transformedCoord,
                                      transform(
                                          coordinates[index + 1] as [
                                              number,
                                              number
                                          ],
                                          "EPSG:3857",
                                          "EPSG:4326"
                                      ) as [number, number]
                                  )
                                : undefined,
                    });

                    // Přidání linie (kromě prvního bodu)
                    if (index > 0) {
                        const lineId = `${newObjectId}_Line${index}`;
                        lines.push({
                            id: lineId,
                            start: `${newObjectId}_Point${index}`,
                            end: `${newObjectId}_Point${index + 1}`,
                            ...calculateLineProperties(
                                transform(
                                    coordinates[index - 1] as [number, number],
                                    "EPSG:3857",
                                    "EPSG:4326"
                                ) as [number, number],
                                transformedCoord
                            ),
                        });
                    }
                });

                // Vytvoření nového objektu a aktualizace stavu
                const newObject: MapObject = {
                    id: newObjectId,
                    points,
                    lines,
                };

                setFeaturesData((prev) => [...prev, newObject]);

                // Přidání geometrie na mapu
                points.forEach((point, index) => {
                    const pointFeature = new Feature({
                        geometry: new Point(
                            transform(
                                [point.lon, point.lat],
                                "EPSG:4326",
                                "EPSG:3857"
                            )
                        ),
                        data: point,
                    });
                    pointFeature.setId(point.id);

                    pointFeature.setStyle(
                        new Style({
                            image: new Circle({
                                radius: 5,
                                fill: new Fill({
                                    color:
                                        index === 0
                                            ? "green" // Start
                                            : index === points.length - 1
                                            ? "red" // End
                                            : "yellow", // Zlomové body
                                }),
                                stroke: new Stroke({
                                    color: "white",
                                    width: 1,
                                }),
                            }),
                        })
                    );

                    pointSource.addFeature(pointFeature);
                });
            }
        });

        // Listener na pravé kliknutí
        const handleRightClick = (event: MouseEvent) => {
            event.preventDefault();
            if (drawRef.current) {
                drawRef.current.finishDrawing(); // Ukončení kreslení
            }
        };

        map.getViewport().addEventListener("contextmenu", handleRightClick);

        return () => {
            map.removeInteraction(drawInteraction);
            map.getViewport().removeEventListener(
                "contextmenu",
                handleRightClick
            );
        };
    }, [map, currentAction, lineSource, pointSource]);

    function calculateLineProperties(
        coord1: [number, number],
        coord2: [number, number]
    ): { azimuth: number; length: number } {
        const [lon1, lat1] = coord1;
        const [lon2, lat2] = coord2;

        const deltaLon = lon2 - lon1;
        const deltaLat = lat2 - lat1;

        let azimuth = Math.atan2(deltaLon, deltaLat) * (180 / Math.PI);
        if (azimuth < 0) azimuth += 360;

        const earthRadius = 6371; // Poloměr Země v km
        const distance =
            Math.sqrt(deltaLat ** 2 + deltaLon ** 2) *
            (Math.PI / 180) *
            earthRadius;

        return { azimuth, length: distance };
    }

    function calculateAngle(
        prev: [number, number],
        current: [number, number],
        next: [number, number]
    ): number {
        const v1 = [prev[0] - current[0], prev[1] - current[1]];
        const v2 = [next[0] - current[0], next[1] - current[1]];

        const dotProduct = v1[0] * v2[0] + v1[1] * v2[1];
        const magnitude1 = Math.sqrt(v1[0] ** 2 + v1[1] ** 2);
        const magnitude2 = Math.sqrt(v2[0] ** 2 + v2[1] ** 2);

        return (
            Math.acos(dotProduct / (magnitude1 * magnitude2)) * (180 / Math.PI)
        );
    }

    const convertDistance = (value: number): string => {
        return distanceUnit === "km"
            ? value.toFixed(2) // Pokud jsou vybrány kilometry
            : (value * 0.621371).toFixed(2); // Převod na míle
    };

    const convertAngle = (value: number): string => {
        return angleUnit === "°"
            ? value.toFixed(2) // Pokud jsou vybrány stupně
            : ((value * Math.PI) / 180).toFixed(2); // Převod na radiány
    };

    return (
        <div className="container-fluid">
            <div className="row">
                <div className="col-9">
                    <div className="mt-3">
                        <button
                            className={`btn btn-outline-success me-2 ${
                                currentAction === "line" ? "active" : ""
                            }`}
                            onClick={() => setCurrentAction("line")}>
                            Návrh
                        </button>
                        <button
                            className={`btn btn-outline-secondary me-2 ${
                                currentAction === "inspect" ? "active" : ""
                            }`}
                            onClick={() => setCurrentAction("inspect")}>
                            Inspekce prvků
                        </button>
                        <button
                            className={`btn btn-outline-primary me-2 ${
                                currentAction === "move" ? "active" : ""
                            }`}
                            onClick={() => setCurrentAction("move")}>
                            Modifikace
                        </button>
                        <button
                            className={`btn btn-outline-warning me-2 ${
                                currentAction === "delete" ? "active" : ""
                            }`}
                            onClick={() => setCurrentAction("delete")}>
                            Smazat linii
                        </button>
                        <button
                            className="btn btn-outline-danger"
                            onClick={() => {
                                lineSource?.clear();
                                pointSource?.clear();
                                setFeaturesData([]);
                            }}>
                            Smazat vše
                        </button>
                    </div>
                    <div
                        className="map-style"
                        ref={mapRef}
                        onContextMenu={(e) => e.preventDefault()}>
                        <div
                            id="tooltip"
                            className="ol-tooltip ol-tooltip-hidden"></div>
                    </div>
                </div>

                <div className="col-3">
                    <div className="row">
                        <div className="col">
                            <h2 className="mb-3">Parametry</h2>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col">
                            <div className="mb-3">
                                <label className="me-2">Jednotky:</label>
                                <select
                                    className="form-select d-inline w-auto"
                                    value={distanceUnit}
                                    onChange={(e) =>
                                        setDistanceUnit(
                                            e.target.value as "km" | "mil"
                                        )
                                    }>
                                    <option value="km">kilometry</option>
                                    <option value="mil">míle</option>
                                </select>
                                <select
                                    className="form-select d-inline w-auto"
                                    value={angleUnit}
                                    onChange={(e) =>
                                        setAngleUnit(
                                            e.target.value as "°" | "rad"
                                        )
                                    }>
                                    <option value="°">stupně</option>
                                    <option value="rad">radiány</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="row scrollable-section">
                        <div className="col">
                            <h2>Data</h2>
                            {featuresData.map((object) => (
                                <div key={object.id}>
                                    <h3>{object.id}</h3>
                                    {object.points.map((point) => (
                                        <div key={point.id}>
                                            <p>Bod: {point.id}</p>
                                            <p>Lat: {point.lat.toFixed(6)}</p>
                                            <p>Lon: {point.lon.toFixed(6)}</p>
                                            {point.angle && (
                                                <p>
                                                    Úhel:{" "}
                                                    {convertAngle(point.angle)}{" "}
                                                    {angleUnit}
                                                </p>
                                            )}
                                            <hr />
                                        </div>
                                    ))}
                                    {object.lines.map((line) => (
                                        <div key={line.id}>
                                            <p>Linie: {line.id}</p>
                                            <p>
                                                Azimut:{" "}
                                                {convertAngle(line.azimuth)}{" "}
                                                {angleUnit}
                                            </p>
                                            <p>
                                                Délka:{" "}
                                                {convertDistance(line.length)}{" "}
                                                {distanceUnit}
                                            </p>
                                            <hr />
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportMapComponent;
