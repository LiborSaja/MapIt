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
import { Point, LineString, Geometry } from "ol/geom";
import { Feature } from "ol";
import { getDistance } from "ol/sphere";
import {
    LineData,
    MapObject,
    PointData,
    ItemData,
} from "../../../interfaces/Interface";
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

    useEffect(() => {
        if (!map || currentAction !== "inspect") return;

        const tooltip = document.getElementById("tooltip");
        const selectInteraction = map
            .getInteractions()
            .getArray()
            .find((interaction) => interaction instanceof Select) as Select;

        if (!selectInteraction || !tooltip) return;

        const selectedFeatures = selectInteraction.getFeatures().getArray();
        if (selectedFeatures.length > 0) {
            const feature = selectedFeatures[0];
            const geometry = feature.getGeometry();
            const data = feature.get("data");

            const tooltipText = generateTooltipContent(data, geometry);

            if (tooltipText) {
                tooltip.innerHTML = tooltipText;
            }
        }
    }, [map, currentAction, distanceUnit, angleUnit]);

    //--------------------------------------------------------------------------------------------------------------------------
    //------------------------------------------------------------ USEEFFECT kreslení ------------------------------------------
    //--------------------------------------------------------------------------------------------------------------------------

    useEffect(() => {
        if (!map) return;

        switch (currentAction) {
            case "line":
                resetSelection();
                deactivateAll();
                activateLineDrawing();
                break;
            case "inspect":
                resetSelection();
                deactivateAll();
                activateInspection();
                break;
            case "move":
                resetSelection();
                deactivateAll();
                activateModification();
                break;
            case "delete":
                resetSelection();
                deactivateAll();
                activateDeletion();
                break;
            default:
                deactivateAll();
        }
    }, [map, currentAction, lineSource, pointSource]);

    // Funkce pro kreslení
    const activateLineDrawing = () => {
        if (!map || !pointSource || !lineSource) return;

        // Odstranění starých interakcí
        map.getInteractions().forEach((interaction) => {
            if (interaction instanceof Draw) {
                map.removeInteraction(interaction);
            }
        });

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

                // Přidání aktuálního data a času do názvu objektu
                const now = new Date();
                const formattedDateTime = `${now.getFullYear()}-${String(
                    now.getMonth() + 1
                ).padStart(2, "0")}-${String(now.getDate()).padStart(
                    2,
                    "0"
                )}_${String(now.getHours()).padStart(2, "0")}-${String(
                    now.getMinutes()
                ).padStart(2, "0")}-${String(now.getSeconds()).padStart(
                    2,
                    "0"
                )}`;
                const newObjectId = `Objekt_${formattedDateTime}`;
                const points: PointData[] = [];
                const lines: LineData[] = [];
                const combinedItems: ItemData[] = []; // Seznam pro body a linie

                // Přidání bodů a linií
                coordinates.forEach((coord, index) => {
                    const transformedCoord = transform(
                        coord as [number, number],
                        "EPSG:3857",
                        "EPSG:4326"
                    ) as [number, number];

                    const pointId = `Point_${index + 1}_${newObjectId}`;
                    const pointData: PointData = {
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
                    };

                    points.push(pointData);

                    // Přidání bodu do kombinovaného seznamu
                    combinedItems.push({
                        type: "point",
                        order: index * 2, // Body mají sudé pořadí
                        data: pointData,
                    });

                    // Přidání bodu do zdroje
                    const pointFeature = new Feature({
                        geometry: new Point(
                            transform(
                                [pointData.lon, pointData.lat],
                                "EPSG:4326",
                                "EPSG:3857"
                            )
                        ),
                        data: pointData,
                    });
                    pointFeature.setId(pointData.id);

                    pointFeature.setStyle(
                        new Style({
                            image: new Circle({
                                radius: 5,
                                fill: new Fill({
                                    color:
                                        index === 0
                                            ? "green" // Start
                                            : index === coordinates.length - 1
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

                    // Přidání linie (kromě prvního bodu)
                    if (index > 0) {
                        const lineId = `Line_${index}_${newObjectId}`;
                        const startPoint = points[index - 1]; // Předchozí bod
                        const endPoint = points[index]; // Aktuální bod

                        const lineData: LineData = {
                            id: lineId,
                            start: startPoint.id,
                            end: endPoint.id,
                            ...calculateLineProperties(
                                [startPoint.lon, startPoint.lat],
                                [endPoint.lon, endPoint.lat]
                            ),
                        };

                        lines.push(lineData);

                        // Vytvoření geometrie pro linii
                        const lineFeature = new Feature({
                            geometry: new LineString([
                                transform(
                                    [startPoint.lon, startPoint.lat],
                                    "EPSG:4326",
                                    "EPSG:3857"
                                ),
                                transform(
                                    [endPoint.lon, endPoint.lat],
                                    "EPSG:4326",
                                    "EPSG:3857"
                                ),
                            ]),
                            data: lineData, // Přidání dat k linii
                        });
                        lineFeature.setId(lineData.id);

                        lineFeature.setStyle(
                            new Style({
                                stroke: new Stroke({
                                    color: "blue",
                                    width: 3,
                                }),
                            })
                        );

                        lineSource.addFeature(lineFeature);

                        // Přidání linie do kombinovaného seznamu
                        combinedItems.push({
                            type: "line",
                            order: index * 2 - 1, // Linie mají liché pořadí
                            data: lineData,
                        });
                    }
                });

                // Vytvoření nového objektu a aktualizace stavu
                const newObject: MapObject = {
                    id: newObjectId,
                    points,
                    lines,
                    combinedItems: combinedItems.sort(
                        (a, b) => a.order - b.order
                    ),
                };

                setFeaturesData((prev) => [
                    ...prev,
                    {
                        ...newObject,
                        combinedItems: combinedItems.sort(
                            (a, b) => a.order - b.order
                        ),
                    },
                ]);
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
    };

    // ------------------------------------------------------------------------------------------------------- režim inspekce
    const activateInspection = () => {
        if (!map) return;

        initializeTooltip();

        const tooltip = document.getElementById("tooltip");
        const tooltipOverlay = new Overlay({
            element: tooltip!,
            offset: [0, -15],
            positioning: "center-center",
            stopEvent: false,
        });
        map.addOverlay(tooltipOverlay);

        const selectInteraction = new Select({
            condition: click,
            style: (feature) => {
                const geometry = feature.getGeometry();
                if (geometry instanceof Point) {
                    return new Style({
                        image: new Circle({
                            radius: 6,
                            fill: new Fill({ color: "blue" }),
                            stroke: new Stroke({ color: "white", width: 2 }),
                        }),
                    });
                } else if (geometry instanceof LineString) {
                    return [
                        // Okraj linie (širší vrstva)
                        new Style({
                            stroke: new Stroke({
                                color: "white",
                                width: 8,
                            }),
                        }),
                        // Hlavní linie (užší vrstva)
                        new Style({
                            stroke: new Stroke({
                                color: "blue",
                                width: 4,
                            }),
                        }),
                    ];
                }
                return new Style(); // Vrátíme prázdný styl místo `null`
            },
        });

        map.addInteraction(selectInteraction);

        selectInteraction.on("select", (event) => {
            const selectedFeatures = event.selected;

            if (!tooltip) {
                console.warn("Tooltip element not found.");
                return;
            }

            if (!tooltipOverlay) {
                console.warn("Tooltip overlay not found.");
                return;
            }

            if (selectedFeatures.length > 0) {
                const feature = selectedFeatures[0];
                const geometry = feature.getGeometry();
                const data = feature.get("data");

                const tooltipText = generateTooltipContent(data, geometry);

                if (tooltipText) {
                    tooltip.innerHTML = tooltipText;
                    tooltip.classList.remove("ol-tooltip-hidden");

                    tooltipOverlay.setPosition(
                        geometry instanceof LineString
                            ? geometry.getFirstCoordinate()
                            : geometry instanceof Point
                            ? geometry.getCoordinates()
                            : undefined // Místo null vrátíme undefined
                    );
                }
            } else {
                tooltip.classList.add("ol-tooltip-hidden");
            }
        });

        return () => {
            map.removeInteraction(selectInteraction);
            map.removeOverlay(tooltipOverlay);
        };
    };

    // funkce pro modifikaci
    const activateModification = () => {};

    // funkce pro mazání linie
    const activateDeletion = () => {};

    // Funkce pro deaktivaci všech interakcí
    const deactivateAll = () => {
        if (!map) return;

        // Prochází všechny interakce a deaktivuje jen ty, které nejsou DragPan a MouseWheelZoom
        map.getInteractions().forEach((interaction) => {
            if (
                !(
                    interaction instanceof DragPan ||
                    interaction instanceof MouseWheelZoom
                )
            ) {
                interaction.setActive(false);
            }
        });

        // Odstranění všech overlayů (např. tooltipy)
        map.getOverlays().clear();

        // Odstranění specifických interakcí, pokud existují
        if (drawRef.current) {
            map.removeInteraction(drawRef.current);
            drawRef.current = null;
        }
    };

    //---------------------------------------------------------------------------------------------------------- pomocné funkce
    // inicializace tooltipu
    const initializeTooltip = () => {
        let tooltip = document.getElementById("tooltip");
        if (!tooltip) {
            tooltip = document.createElement("div");
            tooltip.id = "tooltip";
            tooltip.className = "ol-tooltip ol-tooltip-hidden";
            document.body.appendChild(tooltip);
        }
    };

    // reset zvýraznění vybraných bodů a liní
    const resetSelection = () => {
        if (!map) return;

        map.getInteractions().forEach((interaction) => {
            if (interaction instanceof Select) {
                const selectedFeatures = interaction.getFeatures();
                selectedFeatures.clear(); // Vymaže aktuální výběr
            }
        });
    };

    // šablona pro tooltip
    const generateTooltipContent = (
        data: any,
        geometry: Geometry | undefined
    ): string => {
        if (!data || !geometry) return "";

        if (geometry instanceof Point) {
            return `
                <strong>Bod:</strong><br>
                Lat: ${data.lat}<br>
                Lon: ${data.lon}<br>
                ${
                    data.angle
                        ? `Úhel: ${convertAngle(data.angle)} ${angleUnit}`
                        : ""
                }
            `;
        } else if (geometry instanceof LineString) {
            return `
                <strong>Linie:</strong><br>
                Azimut: ${convertAngle(data.azimuth)} ${angleUnit}<br>
                Délka: ${convertDistance(data.length)} ${distanceUnit}
            `;
        }

        return "";
    };

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
                                    <h4>{object.id}</h4>
                                    {object.combinedItems.map((item, i) => (
                                        <div key={i}>
                                            {item.type === "point" ? (
                                                <>
                                                    <p>Bod: {item.data.id}</p>
                                                    <p>
                                                        Lat:{" "}
                                                        {(
                                                            item.data as PointData
                                                        ).lat.toFixed(6)}
                                                    </p>
                                                    <p>
                                                        Lon:{" "}
                                                        {(
                                                            item.data as PointData
                                                        ).lon.toFixed(6)}
                                                    </p>
                                                    {(item.data as PointData)
                                                        .angle !==
                                                        undefined && (
                                                        <p>
                                                            Úhel:{" "}
                                                            {convertAngle(
                                                                (
                                                                    item.data as PointData
                                                                ).angle!
                                                            )}{" "}
                                                            {angleUnit}
                                                        </p>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <p>Linie: {item.data.id}</p>
                                                    <p>
                                                        Azimut:{" "}
                                                        {convertAngle(
                                                            (
                                                                item.data as LineData
                                                            ).azimuth
                                                        )}{" "}
                                                        {angleUnit}
                                                    </p>
                                                    <p>
                                                        Délka:{" "}
                                                        {convertDistance(
                                                            (
                                                                item.data as LineData
                                                            ).length
                                                        )}{" "}
                                                        {distanceUnit}
                                                    </p>
                                                </>
                                            )}
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
