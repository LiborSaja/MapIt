import React, { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import { Map, View } from "ol";
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
import {
    LineData,
    PointData,
    PolylineData,
} from "../../../interfaces/Interface";
import { click } from "ol/events/condition";

const ImportMapComponent: React.FC = () => {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const [map, setMap] = useState<Map | null>(null);
    const [lineSource, setLineSource] = useState<VectorSource | null>(null);
    const [pointSource, setPointSource] = useState<VectorSource | null>(null);
    const drawRef = useRef<Draw | null>(null);
    const [currentAction, setCurrentAction] = useState<string>("line");
    const [featuresData, setFeaturesData] = useState<
        { id: string; type: "point" | "line"; data: any }[]
    >([]);
    const [polylines, setPolylines] = useState<PolylineData[]>([]);
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
        if (!map || !lineSource || !pointSource) return;

        // Přiřazení výchozích interakcí (posouvání a zoomování)
        map.getInteractions().forEach((interaction) => {
            if (
                interaction instanceof DragPan ||
                interaction instanceof MouseWheelZoom
            ) {
                interaction.setActive(true);
            }
        });

        //------------------------------------------------------------------------------------------------režim Návrh
        //režim návrh
        if (currentAction === "line") {
            const drawInteraction = new Draw({
                source: lineSource,
                type: "LineString",
            });

            map.addInteraction(drawInteraction);
            drawRef.current = drawInteraction;

            // listener pro ukončení kreslení
            drawInteraction.on("drawend", (event) => {
                const geometry = event.feature.getGeometry(); // Automatické rozpoznání typu geometrie

                if (geometry?.getType() === "LineString") {
                    const coordinates = (
                        geometry as LineString
                    ).getCoordinates() as [number, number][];

                    // Struktura dat pro aktuální polylinii
                    const polyline: { [key: string]: any } = {};
                    const polylineId = `Polyline${polylines.length + 1}`;

                    coordinates.forEach((coord, index) => {
                        const pointId = `Point${String(index + 1).padStart(
                            3,
                            "0"
                        )}`;

                        // Převod souřadnic do EPSG:4326
                        const transformedCoord = transform(
                            coord as [number, number],
                            "EPSG:3857",
                            "EPSG:4326"
                        ) as [number, number];
                        const [lon, lat] = transformedCoord;

                        // Přidání bodu
                        polyline[pointId] = {
                            lat: lat.toFixed(6),
                            lon: lon.toFixed(6),
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
                                    : null, // Úhel jen mezi prostředními body
                        };

                        // Přidání linie mezi aktuálním a předchozím bodem
                        if (index > 0) {
                            const lineId = `Line${String(index).padStart(
                                3,
                                "0"
                            )}`;
                            polyline[lineId] = calculateLineProperties(
                                transform(
                                    coordinates[index - 1] as [number, number],
                                    "EPSG:3857",
                                    "EPSG:4326"
                                ) as [number, number],
                                transformedCoord
                            );
                        }
                    });

                    // Přidání aktuální polylinie do stavu
                    setPolylines((prev) => [
                        ...prev,
                        {
                            [`Polyline${prev.length + 1}`]: [polyline], // Každá polylinie obsahuje pole s daty
                        },
                    ]);

                    // Přidání stylů na mapu (začátek a konec)
                    const startFeature = new Feature({
                        geometry: new Point(coordinates[0]),
                    });
                    const endFeature = new Feature({
                        geometry: new Point(
                            coordinates[coordinates.length - 1]
                        ),
                    });

                    startFeature.setStyle(
                        new Style({
                            image: new Circle({
                                radius: 5,
                                fill: new Fill({ color: "green" }),
                                stroke: new Stroke({
                                    color: "white",
                                    width: 1,
                                }),
                            }),
                            text: new Text({
                                text: "start",
                                font: "12px Arial",
                                fill: new Fill({ color: "black" }),
                                stroke: new Stroke({
                                    color: "white",
                                    width: 2,
                                }),
                                offsetY: -10,
                            }),
                        })
                    );

                    endFeature.setStyle(
                        new Style({
                            image: new Circle({
                                radius: 5,
                                fill: new Fill({ color: "red" }),
                                stroke: new Stroke({
                                    color: "white",
                                    width: 1,
                                }),
                            }),
                            text: new Text({
                                text: "konec",
                                font: "12px Arial",
                                fill: new Fill({ color: "black" }),
                                stroke: new Stroke({
                                    color: "white",
                                    width: 2,
                                }),
                                offsetY: -10,
                            }),
                        })
                    );

                    pointSource.addFeatures([startFeature, endFeature]);

                    // Přidání žlutých bodů na zlomy
                    coordinates.slice(1, -1).forEach((coord) => {
                        const transformedCoord = transform(
                            coord as [number, number],
                            "EPSG:3857",
                            "EPSG:4326"
                        ) as [number, number];
                        const [lon, lat] = transformedCoord;

                        const middleFeature = new Feature({
                            geometry: new Point(coord),
                        });

                        middleFeature.setStyle(
                            new Style({
                                image: new Circle({
                                    radius: 5,
                                    fill: new Fill({ color: "yellow" }),
                                    stroke: new Stroke({
                                        color: "white",
                                        width: 1,
                                    }),
                                }),
                                text: new Text({
                                    text: `${lat.toFixed(6)}, ${lon.toFixed(
                                        6
                                    )}`,
                                    font: "10px Arial",
                                    fill: new Fill({ color: "black" }),
                                    stroke: new Stroke({
                                        color: "white",
                                        width: 1,
                                    }),
                                    offsetY: -10,
                                }),
                            })
                        );

                        pointSource.addFeature(middleFeature);
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
            // --------------------------------------------------------------------------------------------------režim inspect
        } else if (currentAction === "inspect") {
            const selectInteraction = new Select({
                condition: click,
            });

            map.addInteraction(selectInteraction);

            selectInteraction.on("select", (event) => {
                const selectedFeatures = event.selected;
                if (selectedFeatures.length > 0) {
                    const feature = selectedFeatures[0];
                    console.log("Vybraný prvek:", feature.getGeometry());
                }
            });

            return () => {
                map.removeInteraction(selectInteraction);
            };
            // --------------------------------------------------------------------------------------------------- režim mazání
        } else if (currentAction === "delete") {
            const selectInteraction = new Select({
                condition: click,
            });

            map.addInteraction(selectInteraction);

            selectInteraction.on("select", (event) => {
                const selectedFeatures = event.selected;
                selectedFeatures.forEach((feature) => {
                    lineSource?.removeFeature(feature);
                    pointSource?.removeFeature(feature);
                });
            });

            return () => {
                map.removeInteraction(selectInteraction);
            };
        } else if (currentAction === "move") {
            //----------------------------------------------------------------------------------------------- Režim modifikace
            const modifyInteraction = new Modify({
                source: pointSource,
            });

            map.addInteraction(modifyInteraction);

            return () => {
                map.removeInteraction(modifyInteraction);
            };
        }
    }, [map, lineSource, pointSource, currentAction]);

    function calculateLineProperties(
        coord1: [number, number],
        coord2: [number, number]
    ) {
        const [lon1, lat1] = coord1;
        const [lon2, lat2] = coord2;

        // Výpočet rozdílu souřadnic
        const deltaLon = lon2 - lon1;
        const deltaLat = lat2 - lat1;

        // Výpočet azimutu v radiánech
        let azimuth = Math.atan2(deltaLon, deltaLat) * (180 / Math.PI); // Převod na stupně

        // Normalizace do rozsahu 0°–360°
        if (azimuth < 0) {
            azimuth += 360;
        }

        // Výpočet délky linie (v kilometrech)
        const earthRadius = 6371; // Poloměr Země v km
        const distance =
            Math.sqrt(deltaLat ** 2 + deltaLon ** 2) *
            (Math.PI / 180) *
            earthRadius;

        return {
            azimuth: azimuth.toFixed(2), // Azimut ve stupních (2 desetinná místa)
            length: distance.toFixed(2), // Délka v kilometrech (2 desetinná místa)
        };
    }

    const calculateAngle = (
        prev: [number, number],
        current: [number, number],
        next: [number, number]
    ): string => {
        const v1 = [prev[0] - current[0], prev[1] - current[1]];
        const v2 = [next[0] - current[0], next[1] - current[1]];

        const dotProduct = v1[0] * v2[0] + v1[1] * v2[1];
        const magnitude1 = Math.sqrt(v1[0] ** 2 + v1[1] ** 2);
        const magnitude2 = Math.sqrt(v2[0] ** 2 + v2[1] ** 2);

        const angle =
            Math.acos(dotProduct / (magnitude1 * magnitude2)) * (180 / Math.PI);
        return angle.toFixed(2); // Úhel ve stupních
    };

    const convertDistance = (value: string): string => {
        const distance = parseFloat(value);
        return distanceUnit === "km"
            ? distance.toFixed(2) // Pokud jsou vybrány kilometry
            : (distance * 0.621371).toFixed(2); // Převod na míle
    };

    const convertAngle = (value: string): string => {
        const angle = parseFloat(value);
        return angleUnit === "°"
            ? angle.toFixed(2) // Pokud jsou vybrány stupně
            : ((angle * Math.PI) / 180).toFixed(2); // Převod na radiány
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
                            }}>
                            Smazat vše
                        </button>
                    </div>
                    <div
                        className="map-style"
                        ref={mapRef}
                        onContextMenu={(e) => e.preventDefault()}></div>
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
                            {polylines.map((polyline, index) => {
                                const polylineKey = `Polyline${index + 1}`;
                                const polylineData = polyline[polylineKey]?.[0];

                                if (!polylineData) return null;

                                const sortedKeys = Object.keys(
                                    polylineData
                                ).sort((a, b) => {
                                    const aIndex = parseInt(
                                        a.match(/\d+/)?.[0] || "0",
                                        10
                                    );
                                    const bIndex = parseInt(
                                        b.match(/\d+/)?.[0] || "0",
                                        10
                                    );
                                    return aIndex - bIndex;
                                });

                                return (
                                    <div key={`polyline-${index}`}>
                                        <h3>{polylineKey}</h3>
                                        {sortedKeys.map((key, i) => {
                                            const value = polylineData[key];

                                            // Kontrola typu: PointData
                                            if (
                                                key.startsWith("Point") &&
                                                "lat" in value &&
                                                "lon" in value
                                            ) {
                                                const pointValue =
                                                    value as PointData; // Přetypování
                                                return (
                                                    <div key={`point-${i}`}>
                                                        <p>{key}</p>
                                                        <p>
                                                            Lat:{" "}
                                                            {pointValue.lat}
                                                        </p>
                                                        <p>
                                                            Lon:{" "}
                                                            {pointValue.lon}
                                                        </p>
                                                        {pointValue.angle && (
                                                            <p>
                                                                Angle:{" "}
                                                                {convertAngle(
                                                                    pointValue.angle
                                                                )}{" "}
                                                                {angleUnit}
                                                            </p>
                                                        )}
                                                        <hr />
                                                    </div>
                                                );
                                            }

                                            // Kontrola typu: LineData
                                            if (
                                                key.startsWith("Line") &&
                                                "azimuth" in value &&
                                                "length" in value
                                            ) {
                                                const lineValue =
                                                    value as LineData; // Přetypování
                                                return (
                                                    <div key={`line-${i}`}>
                                                        <p>{key}</p>
                                                        <p>
                                                            Azimuth:{" "}
                                                            {convertAngle(
                                                                lineValue.azimuth
                                                            )}{" "}
                                                            {angleUnit}
                                                        </p>
                                                        <p>
                                                            Length:{" "}
                                                            {convertDistance(
                                                                lineValue.length
                                                            )}{" "}
                                                            {distanceUnit}
                                                        </p>
                                                        <hr />
                                                    </div>
                                                );
                                            }

                                            return null;
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportMapComponent;
